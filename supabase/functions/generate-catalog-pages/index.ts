import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Escape user-supplied strings before interpolating into the static HTML we
// serve to crawlers. Prevents a stray <, >, &, or quote in a post title/body/
// author from breaking markup, corrupting adjacent JSON-LD, or truncating the
// served document. Use for HTML body + attribute values; for JSON-LD values use
// JSON.stringify (which handles its own escaping).
function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Trim a string to a max length on a word boundary for meta descriptions, so
// Google doesn't truncate mid-word in the SERP. Strips HTML tags and collapses
// whitespace first.
function metaDescription(text: unknown, max = 155): string {
  const clean = String(text ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/\S+/g, '')
    // Neutralise characters that would break an HTML attribute when this string
    // is interpolated into content="..."; safe for JSON-LD too (plain text).
    .replace(/["“”]/g, "'")
    .replace(/&/g, 'and')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:!-]+$/, '') + '…';
}

serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Optional incremental mode. Body shape: {since: ISO timestamp}.
    // When provided, only banknotes with updated_at >= since whose country is
    // visible are regenerated, plus the country pages of affected countries.
    // Used by the weekly cron to keep recent edits in sync without rebuilding
    // forum/blog/marketplace pages.
    let since: string | null = null;
    try {
      const body = await req.clone().json();
      if (body && typeof body.since === 'string' && body.since.length > 0) {
        since = body.since;
      }
    } catch (_) {
      // No body or invalid JSON — full mode.
    }
    const incremental = since !== null;
    console.log(incremental ? `Incremental mode: since=${since}` : 'Full regeneration mode');

    console.log('Fetching all approved banknotes...');
    // Always fetch the full set so we can build a cross-reference index for the
    // related-links section. In incremental mode the regeneration set is a
    // filtered subset of allBanknotes.
    const { data: rawBanknotes, error } = await supabase.from('detailed_banknotes').select('*');
    if (error) {
      console.error('Error fetching banknotes:', error);
      throw error;
    }
    // Only consider banknotes that have at least one front image. Aligned with
    // the sitemap filter: we don't generate static HTML or related-link targets
    // for URLs Google won't see anyway.
    const allBanknotes: any[] = (rawBanknotes || []).filter((b: any) =>
      !!(b.front_picture_watermarked || b.front_picture_thumbnail)
    );
    const droppedThinCount = (rawBanknotes?.length || 0) - allBanknotes.length;
    console.log(`Banknotes: ${rawBanknotes?.length || 0} fetched, ${allBanknotes.length} indexable, ${droppedThinCount} dropped (no image)`);
    let banknotes: any[] = allBanknotes;
    if (incremental) {
      banknotes = banknotes.filter((b: any) => b.updated_at && b.updated_at >= since!);
    }
    console.log(`${banknotes.length} banknotes to (re)generate this run`);
    // Fetch forum posts with comment counts
    console.log('Fetching forum posts...');
    const { data: forumPostsRaw, error: forumError } = await supabase
      .from('forum_posts')
      .select(`
        *,
        forum_comments:forum_comments(count)
      `)
      .order('created_at', { ascending: false });
    
    if (forumError) {
      console.error('Error fetching forum posts:', forumError);
    }
    
    // Fetch author profiles for forum posts
    let forumAuthorProfiles: any = {};
    if (forumPostsRaw && forumPostsRaw.length > 0) {
      const authorIds = Array.from(new Set(forumPostsRaw.map((post: any) => post.author_id).filter(Boolean)));
      if (authorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', authorIds);
        
        if (!profilesError && profiles) {
          profiles.forEach((profile: any) => {
            forumAuthorProfiles[profile.id] = profile;
          });
        }
      }
    }
    
    // Transform forum posts to include author and commentCount
    const forumPosts = forumPostsRaw?.map((post: any) => {
      const authorProfile = forumAuthorProfiles[post.author_id];
      return {
        ...post,
        author: authorProfile ? {
          id: authorProfile.id,
          username: authorProfile.username,
          avatar_url: authorProfile.avatar_url,
          avatarUrl: authorProfile.avatar_url
        } : null,
        commentCount: post.forum_comments?.[0]?.count || 0,
        comment_count: post.forum_comments?.[0]?.count || 0,
        reply_count: post.forum_comments?.[0]?.count || 0
      };
    }) || [];
    
    console.log(`Found ${forumPosts.length} forum posts to process`);
    // Fetch blog posts with comment counts
    console.log('Fetching blog posts...');
    const { data: blogPostsRaw, error: blogError } = await supabase
      .from('blog_posts')
      .select(`
        *,
        blog_comments:blog_comments(count)
      `)
      .order('created_at', { ascending: false });
    
    if (blogError) {
      console.error('Error fetching blog posts:', blogError);
    }
    
    // Fetch author profiles
    let authorProfiles: any = {};
    if (blogPostsRaw && blogPostsRaw.length > 0) {
      const authorIds = Array.from(new Set(blogPostsRaw.map((post: any) => post.author_id).filter(Boolean)));
      if (authorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', authorIds);
        
        if (!profilesError && profiles) {
          profiles.forEach((profile: any) => {
            authorProfiles[profile.id] = profile;
          });
        }
      }
    }
    
    // Transform blog posts to include author and commentCount
    const blogPosts = blogPostsRaw?.map((post: any) => {
      const authorProfile = authorProfiles[post.author_id];
      return {
        ...post,
        author: authorProfile ? {
          id: authorProfile.id,
          username: authorProfile.username,
          avatar_url: authorProfile.avatar_url,
          avatarUrl: authorProfile.avatar_url
        } : null,
        commentCount: post.blog_comments?.[0]?.count || 0,
        comment_count: post.blog_comments?.[0]?.count || 0
      };
    }) || [];
    
    console.log(`Found ${blogPosts.length} blog posts to process`);
    const generatedPages = [];
    const errors = [];
    // Fetch ALL available marketplace listings (listed + unlisted) with the
    // collection item and its banknote source joined, mirroring the app's
    // fetchMarketplaceItems. The service-role key bypasses RLS so these embeds read.
    console.log('Fetching marketplace items...');
    const { data: marketplaceItemsRaw, error: marketplaceError } = await supabase
      .from('marketplace_items')
      .select(`
        id, collection_item_id, seller_id, status, created_at, updated_at,
        collection_items!inner (
          id, user_id, banknote_id, unlisted_banknotes_id, is_unlisted_banknote,
          condition, grade, grade_by, grade_condition_description,
          sale_price, is_for_sale, public_note, obverse_image, reverse_image,
          enhanced_banknotes_with_translations:banknote_id (*),
          unlisted_banknotes:unlisted_banknotes_id (*)
        )
      `)
      .eq('status', 'Available')
      .order('created_at', { ascending: false });
    if (marketplaceError) {
      console.error('Error fetching marketplace items:', marketplaceError);
    }
    // Normalise into the nested shape the marketplace generators consume. The
    // banknote object carries both camelCase (denomination/year/...) and
    // snake_case (face_value/gregorian_year/...) keys so the existing HTML reads
    // work for items sourced from either detailed or unlisted banknotes.
    const sellerCache = new Map();
    const marketplaceItems = [];
    for (const mItem of (marketplaceItemsRaw || []) as any[]) {
      // PostgREST returns a single object for this to-one embed at runtime even
      // though the generated type widens it to an array — cast to read it.
      const ci: any = mItem.collection_items;
      if (!ci || !ci.is_for_sale) continue;
      const src: any = ci.is_unlisted_banknote ? ci.unlisted_banknotes : ci.enhanced_banknotes_with_translations;
      if (!src) continue;
      const banknote = {
        id: src.id,
        denomination: src.face_value,
        face_value: src.face_value,
        country: src.country,
        year: src.gregorian_year || src.islamic_year || '',
        gregorian_year: src.gregorian_year,
        islamic_year: src.islamic_year,
        extendedPickNumber: src.extended_pick_number,
        sultan: src.sultan_name,
        printer: src.printer,
        type: src.type,
        category: src.category,
        rarity: src.rarity,
        security_element: src.security_element,
        colors: src.colors,
        dimensions: src.dimensions,
        description: src.banknote_description,
        historical_context: src.historical_description,
        imageUrls: [
          src.front_picture_watermarked || src.front_picture_thumbnail,
          src.back_picture_watermarked || src.back_picture_thumbnail
        ].filter(Boolean)
      };
      let seller = sellerCache.get(mItem.seller_id);
      if (seller === undefined) {
        const { data: sellerData } = await supabase
          .from('profiles')
          .select('id, username, rank, avatar_url')
          .eq('id', mItem.seller_id)
          .maybeSingle();
        seller = sellerData || { id: mItem.seller_id, username: 'Unknown User', rank: 'Newbie Collector', avatar_url: null };
        sellerCache.set(mItem.seller_id, seller);
      }
      marketplaceItems.push({
        id: mItem.id,
        status: mItem.status,
        seller,
        collectionItem: {
          banknote,
          condition: ci.condition,
          salePrice: ci.sale_price,
          publicNote: ci.public_note,
          grade: ci.grade,
          grade_by: ci.grade_by,
          grade_condition_description: ci.grade_condition_description,
          obverseImage: ci.obverse_image,
          reverseImage: ci.reverse_image,
          is_unlisted_banknote: ci.is_unlisted_banknote
        }
      });
    }
    console.log(`Found ${marketplaceItems.length} marketplace items to process`);
    // Fetch countries data (visible-only in incremental mode)
    console.log('Fetching countries...');
    let countryQuery = supabase.from('countries').select('*');
    if (incremental) {
      countryQuery = countryQuery.eq('is_visible', true);
    }
    const { data: countries, error: countriesError } = await countryQuery;
    if (countriesError) {
      console.error('Error fetching countries:', countriesError);
    // You can either throw the error or continue without countries
    // throw countriesError;
    } else {
      console.log(`Found ${countries?.length || 0} countries to process`);
    }

    // In incremental mode, restrict banknotes to those whose country is visible,
    // and compute the set of countries actually affected (so we only regenerate
    // their catalog page below).
    let affectedCountryNames: Set<string> | null = null;
    if (incremental) {
      const visibleCountryNames = new Set((countries || []).map((c: any) => c.name));
      banknotes = (banknotes || []).filter((b: any) => visibleCountryNames.has(b.country));
      affectedCountryNames = new Set((banknotes || []).map((b: any) => b.country));
      console.log(`Incremental: ${banknotes?.length || 0} banknotes after visibility filter, ${affectedCountryNames.size} affected countries`);
    }

    // Generate HTML for blog page (skipped in incremental mode)
    if (!incremental) try {
      const blogHtml = generateBlogPageHTML(blogPosts || []);
      const { error: uploadError } = await supabase.storage.from('static-pages').upload('blog.html', blogHtml, {
        contentType: 'text/html',
        upsert: true,
        cacheControl: '3600'
      });
      if (uploadError) {
        console.error('Error uploading blog.html:', uploadError);
        errors.push({
          id: 'blog',
          error: uploadError.message
        });
      } else {
        generatedPages.push('blog');
      }
    } catch (error) {
      console.error('Error processing blog page:', error);
      errors.push({
        id: 'blog',
        error: error.message
      });
    }
    // Generate HTML for marketplace page (skipped in incremental mode)
    if (!incremental) try {
      const marketplaceHtml = generateMarketplaceHTML(marketplaceItems || []);
      const { error: uploadError } = await supabase.storage.from('static-pages').upload('marketplace.html', marketplaceHtml, {
        contentType: 'text/html',
        upsert: true,
        cacheControl: '3600'
      });
      if (uploadError) {
        console.error('Error uploading marketplace.html:', uploadError);
        errors.push({
          id: 'marketplace',
          error: uploadError.message
        });
      } else {
        generatedPages.push('marketplace');
      }
    } catch (error) {
      console.error('Error processing marketplace page:', error);
      errors.push({
        id: 'marketplace',
        error: error.message
      });
    }
    // Generate HTML for each marketplace item (skipped in incremental mode)
    if (!incremental) for (const item of marketplaceItems || []){
      try {
        const html = generateMarketplaceItemHTML(item, marketplaceItems);
        const slug = item.collectionItem?.is_unlisted_banknote
          ? `marketplace-item-unlisted-${item.id}`
          : `marketplace-item-${item.id}`;
        const fileName = `${slug}.html`;
        // Upload to storage bucket
        const { error: uploadError } = await supabase.storage.from('static-pages').upload(fileName, html, {
          contentType: 'text/html',
          upsert: true,
          cacheControl: '3600'
        });
        if (uploadError) {
          console.error(`Error uploading ${fileName}:`, uploadError);
          errors.push({
            id: item.id,
            error: uploadError.message
          });
        } else {
          generatedPages.push(slug);
        }
      } catch (itemError) {
        console.error(`Error processing marketplace item ${item.id}:`, itemError);
        errors.push({
          id: item.id,
          error: itemError.message
        });
      }
    }
    // Precompute indices over the FULL banknote set (not just the regeneration
    // subset) so related-links inside a regenerated page can still point to
    // banknotes that didn't change this run.
    const banknoteIndex = buildBanknoteIndex(allBanknotes || []);

    // Generate HTML for each banknote
    for (const banknote of banknotes || []){
      try {
        const html = generateCatalogItemHTML(banknote, banknoteIndex);
        const fileName = `catalog-banknote-${banknote.id}.html`;
        // Upload to storage bucket
        const { error: uploadError } = await supabase.storage.from('static-pages').upload(fileName, html, {
          contentType: 'text/html',
          upsert: true,
          cacheControl: '3600'
        });
        if (uploadError) {
          console.error(`Error uploading ${fileName}:`, uploadError);
          errors.push({
            id: banknote.id,
            error: uploadError.message
          });
        } else {
          generatedPages.push(banknote.id);
        }
      } catch (itemError) {
        console.error(`Error processing banknote ${banknote.id}:`, itemError);
        errors.push({
          id: banknote.id,
          error: itemError.message
        });
      }
    }
    // Generate HTML for each forum post (skipped in incremental mode)
    if (!incremental) for (const post of forumPosts || []){
      try {
        const html = generateForumPostHTML(post, [], forumPosts);
        const fileName = `forum-post-${post.id}.html`;
        // Upload to storage bucket
        const { error: uploadError } = await supabase.storage.from('static-pages').upload(fileName, html, {
          contentType: 'text/html',
          upsert: true,
          cacheControl: '3600'
        });
        if (uploadError) {
          console.error(`Error uploading ${fileName}:`, uploadError);
          errors.push({
            id: post.id,
            error: uploadError.message
          });
        } else {
          generatedPages.push(`forum-post-${post.id}`);
        }
      } catch (itemError) {
        console.error(`Error processing forum post ${post.id}:`, itemError);
        errors.push({
          id: post.id,
          error: itemError.message
        });
      }
    }
    // Generate HTML for contact page (skipped in incremental mode)
    if (!incremental) try {
      const contactHtml = generateContactPageHTML();
      const { error: uploadError } = await supabase.storage.from('static-pages').upload('contact.html', contactHtml, {
        contentType: 'text/html',
        upsert: true,
        cacheControl: '3600'
      });
      if (uploadError) {
        console.error('Error uploading contact.html:', uploadError);
        errors.push({
          id: 'contact',
          error: uploadError.message
        });
      } else {
        generatedPages.push('contact');
      }
    } catch (error) {
      console.error('Error processing contact page:', error);
      errors.push({
        id: 'contact',
        error: error.message
      });
    }
    // Generate HTML for about page (skipped in incremental mode)
    if (!incremental) try {
      const aboutHtml = generateAboutPageHTML();
      const { error: uploadError } = await supabase.storage.from('static-pages').upload('about.html', aboutHtml, {
        contentType: 'text/html',
        upsert: true,
        cacheControl: '3600'
      });
      if (uploadError) {
        console.error('Error uploading about.html:', uploadError);
        errors.push({
          id: 'about',
          error: uploadError.message
        });
      } else {
        generatedPages.push('about');
      }
    } catch (error) {
      console.error('Error processing about page:', error);
      errors.push({
        id: 'about',
        error: error.message
      });
    }
    // Generate HTML for guide page (skipped in incremental mode).
    // The generator + the server.js /guide route already existed; only this
    // upload was missing, so /guide was falling back to the SPA shell for bots.
    if (!incremental) try {
      const guideHtml = generateGuideHTML();
      const { error: uploadError } = await supabase.storage.from('static-pages').upload('guide.html', guideHtml, {
        contentType: 'text/html',
        upsert: true,
        cacheControl: '3600'
      });
      if (uploadError) {
        console.error('Error uploading guide.html:', uploadError);
        errors.push({ id: 'guide', error: uploadError.message });
      } else {
        generatedPages.push('guide');
      }
    } catch (error) {
      console.error('Error processing guide page:', error);
      errors.push({ id: 'guide', error: error.message });
    }
    // Generate HTML for community page (skipped in incremental mode).
    // /community is sitemapped + linked from the homepage but had no static
    // file, so bots got the homepage shell (soft-duplicate). Now SSR'd.
    if (!incremental) try {
      const communityHtml = generateCommunityPageHTML(countries, forumPosts);
      const { error: uploadError } = await supabase.storage.from('static-pages').upload('community.html', communityHtml, {
        contentType: 'text/html',
        upsert: true,
        cacheControl: '3600'
      });
      if (uploadError) {
        console.error('Error uploading community.html:', uploadError);
        errors.push({ id: 'community', error: uploadError.message });
      } else {
        generatedPages.push('community');
      }
    } catch (error) {
      console.error('Error processing community page:', error);
      errors.push({ id: 'community', error: error.message });
    }
    // Generate HTML for the three legal/info pages so they stop being thin
    // duplicates of the React shell to crawlers (cookie-policy, privacy, terms).
    if (!incremental) {
      const legalPages: { file: string; id: string; build: () => string | Promise<string> }[] = [
        { file: 'cookie-policy.html', id: 'cookie-policy', build: () => generateCookiePolicyHTML() },
        { file: 'privacy.html',       id: 'privacy',       build: () => generatePrivacyPolicyHTML() },
        { file: 'terms.html',         id: 'terms',         build: async () => {
            // Pull the English terms strings from the publicly-served i18n bundle so
            // SSR copy matches the React UI; fall back gracefully if the fetch fails.
            try {
              const r = await fetch('https://ottocollect.com/locales/en/pages.json', { headers: { 'cache-control': 'no-cache' } });
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              const j: any = await r.json();
              return generateTermsHTML(j.terms || {});
            } catch (e) {
              console.error('terms i18n fetch failed:', (e as any)?.message || e);
              return generateTermsHTML({});
            }
        } },
      ];
      for (const lp of legalPages) {
        try {
          const html = await lp.build();
          const { error: uploadError } = await supabase.storage.from('static-pages').upload(lp.file, html, {
            contentType: 'text/html', upsert: true, cacheControl: '3600'
          });
          if (uploadError) {
            console.error(`Error uploading ${lp.file}:`, uploadError);
            errors.push({ id: lp.id, error: uploadError.message });
          } else {
            generatedPages.push(lp.id);
          }
        } catch (error) {
          console.error(`Error processing ${lp.id} page:`, error);
          errors.push({ id: lp.id, error: (error as any)?.message || String(error) });
        }
      }
    }
    // Generate HTML for catalog page (skipped in incremental mode)
    if (!incremental) try {
      const catalogHtml = generateCatalogPageHTML(countries);
      const { error: uploadError } = await supabase.storage.from('static-pages').upload('catalog.html', catalogHtml, {
        contentType: 'text/html',
        upsert: true,
        cacheControl: '3600'
      });
      if (uploadError) {
        console.error('Error uploading catalog.html:', uploadError);
        errors.push({
          id: 'catalog',
          error: uploadError.message
        });
      } else {
        generatedPages.push('catalog');
      }
    } catch (error) {
      console.error('Error processing catalog page:', error);
      errors.push({
        id: 'catalog',
        error: error.message
      });
    }
    // Generate HTML for homepage (skipped in incremental mode)
    if (!incremental) try {
      const homeHtml = generateHomePageHTML(forumPosts, marketplaceItems, countries);
      const { error: uploadError } = await supabase.storage.from('static-pages').upload('index.html', homeHtml, {
        contentType: 'text/html',
        upsert: true,
        cacheControl: '3600'
      });
      if (uploadError) {
        console.error('Error uploading index.html:', uploadError);
        errors.push({
          id: 'homepage',
          error: uploadError.message
        });
      } else {
        generatedPages.push('homepage');
      }
    } catch (error) {
      console.error('Error processing homepage:', error);
      errors.push({
        id: 'homepage',
        error: error.message
      });
    }
    // Generate HTML for each country page.
    // In incremental mode, only regenerate countries whose banknotes changed.
    for (const country of countries || []){
      if (incremental && affectedCountryNames && !affectedCountryNames.has(country.name)) {
        continue;
      }
      try {
        // Fetch banknotes for this country
        const { data: countryBanknotes, error: banknotesError } = await supabase.from('detailed_banknotes').select('*').eq('country', country.name).eq('is_approved', true).eq('is_pending', false);
        if (banknotesError) {
          console.error(`Error fetching banknotes for ${country.name}:`, banknotesError);
          continue;
        }
        const html = generateCountryPageHTML(country, countryBanknotes || []);
        const fileName = `catalog-${encodeURIComponent(country.name)}.html`;
        // Upload to storage bucket
        const { error: uploadError } = await supabase.storage.from('static-pages').upload(fileName, html, {
          contentType: 'text/html',
          upsert: true,
          cacheControl: '3600'
        });
        if (uploadError) {
          console.error(`Error uploading ${fileName}:`, uploadError);
          errors.push({
            id: country.id,
            error: uploadError.message
          });
        } else {
          generatedPages.push(`catalog-${country.name}`);
        }
      } catch (itemError) {
        console.error(`Error processing country ${country.name}:`, itemError);
        errors.push({
          id: country.name,
          error: itemError.message
        });
      }
    }
    // Fetch announcements with author information
    console.log('Fetching forum announcements...');
    const { data: announcementsRaw, error: announcementsError } = await supabase.from('forum_announcements').select(`
      *,
      author:profiles!forum_announcements_author_id_fkey(id, username, avatar_url, rank),
      forum_comments:forum_comments(count)
    `).order('created_at', {
      ascending: false
    }).limit(5);
    if (announcementsError) {
      console.error('Error fetching announcements:', announcementsError);
    }
    
    // Transform announcements to ensure consistent author format
    const announcements = announcementsRaw?.map((announcement: any) => {
      const authorData = announcement.author || null;
      return {
        ...announcement,
        author: authorData ? {
          id: authorData.id,
          username: authorData.username,
          avatar_url: authorData.avatar_url,
          avatarUrl: authorData.avatar_url,
          rank: authorData.rank
        } : null,
        commentCount: announcement.forum_comments?.[0]?.count || 0,
        comment_count: announcement.forum_comments?.[0]?.count || 0
      };
    }) || [];
    
    // Generate HTML for forum page (skipped in incremental mode)
    if (!incremental) try {
      const forumHtml = generateForumPageHTML(forumPosts || [], announcements || []);
      const { error: uploadError } = await supabase.storage.from('static-pages').upload('forum.html', forumHtml, {
        contentType: 'text/html',
        upsert: true,
        cacheControl: '3600'
      });
      if (uploadError) {
        console.error('Error uploading forum.html:', uploadError);
        errors.push({
          id: 'forum',
          error: uploadError.message
        });
      } else {
        generatedPages.push('forum');
      }
    } catch (error) {
      console.error('Error processing forum page:', error);
      errors.push({
        id: 'forum',
        error: error.message
      });
    }
    // Generate HTML for each blog post (skipped in incremental mode)
    if (!incremental) for (const post of blogPosts || []){
      try {
        const html = generateBlogPostHTML(post, [], blogPosts);
        const fileName = `blog-post-${post.id}.html`;
        // Upload to storage bucket
        const { error: uploadError } = await supabase.storage.from('static-pages').upload(fileName, html, {
          contentType: 'text/html',
          upsert: true,
          cacheControl: '3600'
        });
        if (uploadError) {
          console.error(`Error uploading ${fileName}:`, uploadError);
          errors.push({
            id: post.id,
            error: uploadError.message
          });
        } else {
          generatedPages.push(`blog-post-${post.id}`);
        }
      } catch (itemError) {
        console.error(`Error processing blog post ${post.id}:`, itemError);
        errors.push({
          id: post.id,
          error: itemError.message
        });
      }
    }
    console.log(`Successfully generated ${generatedPages.length} pages`);
    if (errors.length > 0) {
      console.error(`Failed to generate ${errors.length} pages:`, errors);
    }
    return new Response(JSON.stringify({
      success: true,
      mode: incremental ? 'incremental' : 'full',
      since: since,
      generated: generatedPages.length,
      errors: errors.length,
      errorDetails: errors.slice(0, 10),
      message: `Generated ${generatedPages.length} static HTML pages`,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Fatal error in generate-catalog-pages:', error);
    return new Response(JSON.stringify({
      error: error.message,
      details: error.stack
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
// Build a narrative body for each banknote out of whatever real fields the row
// has. The output is several <p> paragraphs; each sentence is only emitted when
// its source field is populated, so we never write placeholder/invented text
// and the paragraph order/length differs naturally between banknotes.
function buildBanknoteNarrative(b: any): string {
  const paras: string[] = [];

  // Paragraph 1 — identification
  const ident: string[] = [];
  const denom = b.face_value;
  const country = b.country;
  const yearG = b.gregorian_year;
  const yearH = b.islamic_year;
  if (denom && country) {
    const yearStr = yearG && yearH ? `${yearG} CE / AH ${yearH}`
                   : yearG ? `${yearG}`
                   : yearH ? `AH ${yearH}`
                   : '';
    ident.push(`The ${denom} ${country} banknote${yearStr ? ` of ${yearStr}` : ''} is a documented piece of ${country} paper-money history.`);
  }
  const refs: string[] = [];
  if (b.extended_pick_number) refs.push(`Pick #${b.extended_pick_number}`);
  else if (b.pick_number) refs.push(`Pick #${b.pick_number}`);
  if (b.turk_catalog_number) refs.push(`Turk Catalog ${b.turk_catalog_number}`);
  if (refs.length) ident.push(`It is cataloged as ${refs.join(' and ')}.`);
  if (b.issuing_authority) ident.push(`The note was issued by ${b.issuing_authority}.`);
  if (b.sultan_name) ident.push(`It dates from the reign of ${b.sultan_name}.`);
  if (ident.length) paras.push(ident.join(' '));

  // Paragraph 2 — production and physical specs
  const physical: string[] = [];
  if (b.printer) physical.push(`printed by ${b.printer}`);
  if (b.designers) physical.push(`designed by ${b.designers}`);
  if (b.dimensions) physical.push(`measuring ${b.dimensions}`);
  if (b.material) physical.push(`on ${b.material}`);
  if (b.colors) physical.push(`with dominant ${b.colors} tones`);
  if (physical.length) paras.push(`Production details — ${physical.join(', ')}.`);

  // Paragraph 3 — security elements
  const security: string[] = [];
  if (b.watermark) security.push(`The watermark depicts ${b.watermark}.`);
  if (b.security_element) security.push(`Security elements: ${b.security_element}.`);
  if (b.security_features) security.push(`Additional security features include ${b.security_features}.`);
  if (b.serial_numbering) security.push(`Serial numbering style: ${b.serial_numbering}.`);
  if (security.length) paras.push(security.join(' '));

  // Paragraph 4 — signatures and seals
  const auth: string[] = [];
  if (b.signatures_front) auth.push(`Front signatures: ${b.signatures_front}.`);
  if (b.signatures_back) auth.push(`Back signatures: ${b.signatures_back}.`);
  if (b.seal_names) auth.push(`Seals on the note read: ${b.seal_names}.`);
  if (auth.length) paras.push(auth.join(' '));

  // Paragraph 5 — iconography (obverse / reverse)
  const visual: string[] = [];
  if (b.obverse_description) visual.push(`<strong>Obverse:</strong> ${b.obverse_description}`);
  if (b.reverse_description) visual.push(`<strong>Reverse:</strong> ${b.reverse_description}`);
  if (visual.length) paras.push(visual.join(' '));

  // Paragraph 6 — catalog classification
  const meta: string[] = [];
  if (b.type) meta.push(`type ${b.type}`);
  if (b.category) meta.push(`category ${b.category}`);
  if (b.series) meta.push(`series ${b.series}`);
  if (b.grade) meta.push(`grade ${b.grade}`);
  if (b.rarity) meta.push(`rarity ${b.rarity}`);
  if (meta.length) paras.push(`Catalog classification — ${meta.join(', ')}.`);

  // Paragraph 7 — historical description (free text, naturally unique)
  if (b.historical_description) {
    paras.push(`<strong>Historical context.</strong> ${b.historical_description}`);
  }

  // Paragraph 8 — free description (free text, naturally unique)
  if (b.banknote_description) {
    paras.push(`<strong>About this banknote.</strong> ${b.banknote_description}`);
  }

  return paras.map(p => `      <p>${p}</p>`).join('\n');
}

// Build precomputed indices over all banknotes so each page's related-links
// section can be assembled with O(1) lookups instead of N queries.
function buildBanknoteIndex(banknotes: any[]) {
  const bySultan: Record<string, any[]> = {};
  const byPrinter: Record<string, any[]> = {};
  const byCountry: Record<string, any[]> = {};
  const byCountryFaceValue: Record<string, any[]> = {};
  for (const b of banknotes || []) {
    if (b.sultan_name) (bySultan[b.sultan_name] ||= []).push(b);
    if (b.printer) (byPrinter[b.printer] ||= []).push(b);
    if (b.country) (byCountry[b.country] ||= []).push(b);
    if (b.country && b.face_value) {
      (byCountryFaceValue[`${b.country}::${b.face_value}`] ||= []).push(b);
    }
  }
  return { bySultan, byPrinter, byCountry, byCountryFaceValue };
}

// Anchor label used everywhere we link to a related banknote. Keeps the link
// text descriptive ("5 para Ottoman Empire 1917") instead of generic.
function relatedAnchorLabel(b: any): string {
  const year = b.gregorian_year || b.islamic_year || '';
  return `${b.face_value || ''} ${b.country || ''}${year ? ' ' + year : ''}`.trim();
}

function renderRelatedList(banknotes: any[]): string {
  return banknotes.map(b =>
    `        <li><a href="/catalog-banknote/${b.id}" rel="related">${relatedAnchorLabel(b)}</a></li>`
  ).join('\n');
}

// Build the related-links HTML for a single banknote. Up to 4 themed sections,
// each capped at 6 links. Sections whose source field is empty are omitted.
function buildBanknoteRelatedLinks(banknote: any, idx: ReturnType<typeof buildBanknoteIndex>): string {
  const id = banknote.id;
  const sections: string[] = [];
  const MAX = 6;

  const sameSultan = banknote.sultan_name
    ? (idx.bySultan[banknote.sultan_name] || []).filter((b: any) => b.id !== id).slice(0, MAX)
    : [];
  if (sameSultan.length) {
    sections.push(`      <div class="related-group">
        <h3>More banknotes from the reign of ${banknote.sultan_name}</h3>
        <ul>
${renderRelatedList(sameSultan)}
        </ul>
      </div>`);
  }

  const samePrinter = banknote.printer
    ? (idx.byPrinter[banknote.printer] || []).filter((b: any) => b.id !== id).slice(0, MAX)
    : [];
  if (samePrinter.length) {
    sections.push(`      <div class="related-group">
        <h3>More banknotes printed by ${banknote.printer}</h3>
        <ul>
${renderRelatedList(samePrinter)}
        </ul>
      </div>`);
  }

  const sameDenom = (banknote.country && banknote.face_value)
    ? (idx.byCountryFaceValue[`${banknote.country}::${banknote.face_value}`] || []).filter((b: any) => b.id !== id).slice(0, MAX)
    : [];
  if (sameDenom.length) {
    sections.push(`      <div class="related-group">
        <h3>Other ${banknote.face_value} ${banknote.country} banknotes</h3>
        <ul>
${renderRelatedList(sameDenom)}
        </ul>
      </div>`);
  }

  // Contemporary notes from the same country (year ± 10), excluding ones
  // already covered by the more specific sections above.
  const refYear = Number(banknote.gregorian_year);
  const already = new Set([
    id,
    ...sameSultan.map((b: any) => b.id),
    ...samePrinter.map((b: any) => b.id),
    ...sameDenom.map((b: any) => b.id),
  ]);
  const contemporaries = (banknote.country && !isNaN(refYear))
    ? (idx.byCountry[banknote.country] || [])
        .filter((b: any) => {
          if (already.has(b.id)) return false;
          const y = Number(b.gregorian_year);
          return !isNaN(y) && Math.abs(y - refYear) <= 10;
        })
        .slice(0, MAX)
    : [];
  if (contemporaries.length) {
    sections.push(`      <div class="related-group">
        <h3>${banknote.country} banknotes from around ${refYear}</h3>
        <ul>
${renderRelatedList(contemporaries)}
        </ul>
      </div>`);
  }

  // Fallback: always include at least one block of country-mates so even
  // banknotes without a sultan/printer/contemporaries match get internal links.
  const countryMates = banknote.country
    ? (idx.byCountry[banknote.country] || [])
        .filter((b: any) => !already.has(b.id))
        .slice(0, MAX)
    : [];
  if (countryMates.length) {
    sections.push(`      <div class="related-group">
        <h3>More ${banknote.country} banknotes</h3>
        <ul>
${renderRelatedList(countryMates)}
        </ul>
      </div>`);
  }

  // Catalog landing link.
  if (banknote.country) {
    sections.push(`      <div class="related-group">
        <h3>Browse the full catalog</h3>
        <p><a href="/catalog/${encodeURIComponent(banknote.country)}" rel="related">View all ${banknote.country} banknotes</a></p>
      </div>`);
  }

  if (!sections.length) return '';
  return `<section class="related-links" aria-label="Related banknotes">
      <h2>Related banknotes</h2>
${sections.join('\n')}
    </section>`;
}

function generateCatalogItemHTML(banknote, banknoteIndex?: ReturnType<typeof buildBanknoteIndex>) {
  const imageUrl = banknote.front_picture_watermarked || banknote.front_picture_thumbnail || 'https://ottocollect.com/OttoCollectIcon.PNG';
  const backImageUrl = banknote.back_picture_watermarked || banknote.back_picture_thumbnail;
  // Title. Include the Pick number to keep titles UNIQUE per variety — many
  // banknotes share the same face value + country + year (different Pick /
  // signature varieties), which produced large clusters of duplicate <title>
  // tags (e.g. 8 pages titled "1 lira Ottoman Empire Banknote 1916"). The
  // extended Pick number is the catalog identifier that disambiguates them.
  const pickRef = banknote.extended_pick_number || banknote.pick_number || banknote.turk_catalog_number;
  const titleYear = banknote.gregorian_year || banknote.islamic_year || '';
  const title = `${banknote.face_value} ${banknote.country} Banknote ${titleYear}${pickRef ? ` (Pick ${pickRef})` : ''} - OttoCollect`;
  // Description with comprehensive details
  const buildDescription = ()=>{
    let details = [];
    if (banknote.face_value) details.push(`Face Value: ${banknote.face_value}`);
    if (banknote.country) details.push(`Country: ${banknote.country}`);
    if (banknote.gregorian_year) details.push(`Gregorian Year: ${banknote.gregorian_year}`);
    if (banknote.islamic_year) details.push(`Islamic Year: ${banknote.islamic_year}`);
    if (banknote.extended_pick_number) details.push(`Pick Number: ${banknote.extended_pick_number}`);
    if (banknote.turk_catalog_number) details.push(`Turk Catalog Number: ${banknote.turk_catalog_number}`);
    if (banknote.sultan_name) details.push(`Sultan: ${banknote.sultan_name}`);
    if (banknote.printer) details.push(`Printer: ${banknote.printer}`);
    if (banknote.type) details.push(`Type: ${banknote.type}`);
    if (banknote.category) details.push(`Category: ${banknote.category}`);
    if (banknote.rarity) details.push(`Rarity: ${banknote.rarity}`);
    if (banknote.security_element) details.push(`Security Element: ${banknote.security_element}`);
    if (banknote.colors) details.push(`Colors: ${banknote.colors}`);
    if (banknote.dimensions) details.push(`Dimensions: ${banknote.dimensions}`);
    if (banknote.signatures_front) details.push(`Front Signatures: ${banknote.signatures_front}`);
    if (banknote.signatures_back) details.push(`Back Signatures: ${banknote.signatures_back}`);
    if (banknote.seal_names) details.push(`Seal Names: ${banknote.seal_names}`);
    if (banknote.serial_numbering) details.push(`Serial Numbering: ${banknote.serial_numbering}`);
    if (banknote.banknote_description) details.push(`Description: ${banknote.banknote_description}`);
    if (banknote.historical_description) details.push(`Historical Context: ${banknote.historical_description}`);
    return `Explore the ${banknote.face_value} ${banknote.country} banknote from ${banknote.gregorian_year || banknote.islamic_year || 'a historic period'} (Pick #${banknote.extended_pick_number}). This collectible features ${banknote.sultan_name ? `Sultan ${banknote.sultan_name}` : 'unique designs'} and was printed by ${banknote.printer || 'an unknown printer'}. Key details: ${details.join(', ')}. Find more historical currency at OttoCollect.`;
  };
  const description = buildDescription();
  // Short, SERP-safe meta description (the long `description` above is kept for
  // the on-page body / JSON-LD). Caps at ~155 chars on a word boundary so Google
  // doesn't truncate mid-sentence.
  const metaDesc = metaDescription(`Authentic ${banknote.face_value} ${banknote.country} banknote from ${banknote.gregorian_year || banknote.islamic_year || 'a historic period'}${banknote.extended_pick_number ? ` (Pick #${banknote.extended_pick_number})` : ''}. Rare historical currency catalogued for collectors on OttoCollect.`, 155);
  // Generate structured data for SEO
  const generateStructuredData = ()=>{
    const images = [];
    if (imageUrl) {
      images.push({
        "@type": "ImageObject",
        "url": imageUrl,
        "caption": `${banknote.face_value} ${banknote.country} banknote front side from ${banknote.gregorian_year || banknote.islamic_year || ''} - Pick ${banknote.extended_pick_number}`,
        "contentUrl": imageUrl,
        "description": banknote.banknote_description || description
      });
    }
    if (backImageUrl) {
      images.push({
        "@type": "ImageObject",
        "url": backImageUrl,
        "caption": `${banknote.face_value} ${banknote.country} banknote back side from ${banknote.gregorian_year || banknote.islamic_year || ''} - Pick ${banknote.extended_pick_number}`,
        "contentUrl": backImageUrl,
        "description": banknote.banknote_description || description
      });
    }
    const identifiers = [];
    if (banknote.extended_pick_number) {
      identifiers.push({
        "@type": "PropertyValue",
        "name": "Extended Pick",
        "value": banknote.extended_pick_number
      });
    }
    if (banknote.turk_catalog_number) {
      identifiers.push({
        "@type": "PropertyValue",
        "name": "Turkish Catalog",
        "value": banknote.turk_catalog_number
      });
    }
    return {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "name": `${banknote.face_value}, ${banknote.gregorian_year || banknote.islamic_year || ''} (${banknote.sultan_name || banknote.country})`,
      "url": `https://ottocollect.com/catalog-banknote/${banknote.id}`,
      "image": images.length > 0 ? images : undefined,
      "description": description,
      "identifier": identifiers.length > 0 ? identifiers : undefined,
      "isPartOf": {
        "@type": "Collection",
        "name": `${banknote.country || 'Ottoman Empire'} Banknotes`,
        "url": `https://ottocollect.com/catalog/${encodeURIComponent(banknote.country || 'Ottoman Empire')}`
      },
      "publisher": {
        "@type": "Organization",
        "name": "OttoCollect",
        "url": "https://ottocollect.com"
      },
      "additionalProperty": [
        banknote.face_value && {
          "@type": "PropertyValue",
          "name": "Face Value",
          "value": banknote.face_value
        },
        banknote.country && {
          "@type": "PropertyValue",
          "name": "Country",
          "value": banknote.country
        },
        banknote.gregorian_year && {
          "@type": "PropertyValue",
          "name": "Gregorian Year",
          "value": banknote.gregorian_year.toString()
        },
        banknote.islamic_year && {
          "@type": "PropertyValue",
          "name": "Islamic Year",
          "value": banknote.islamic_year.toString()
        },
        banknote.extended_pick_number && {
          "@type": "PropertyValue",
          "name": "Pick Number",
          "value": banknote.extended_pick_number
        },
        banknote.turk_catalog_number && {
          "@type": "PropertyValue",
          "name": "Turk Catalog Number",
          "value": banknote.turk_catalog_number
        },
        banknote.sultan_name && {
          "@type": "PropertyValue",
          "name": "Sultan",
          "value": banknote.sultan_name
        },
        banknote.printer && {
          "@type": "PropertyValue",
          "name": "Printer",
          "value": banknote.printer
        },
        banknote.signatures_front && {
          "@type": "PropertyValue",
          "name": "Front Signatures",
          "value": banknote.signatures_front
        },
        banknote.signatures_back && {
          "@type": "PropertyValue",
          "name": "Back Signatures",
          "value": banknote.signatures_back
        },
        banknote.material && {
          "@type": "PropertyValue",
          "name": "Material",
          "value": banknote.material
        },
        banknote.dimensions && {
          "@type": "PropertyValue",
          "name": "Dimensions",
          "value": banknote.dimensions
        },
        banknote.watermark && {
          "@type": "PropertyValue",
          "name": "Watermark",
          "value": banknote.watermark
        },
        banknote.obverse_description && {
          "@type": "PropertyValue",
          "name": "Obverse Description",
          "value": banknote.obverse_description
        },
        banknote.reverse_description && {
          "@type": "PropertyValue",
          "name": "Reverse Description",
          "value": banknote.reverse_description
        },
        banknote.series && {
          "@type": "PropertyValue",
          "name": "Series",
          "value": banknote.series
        },
        banknote.grade && {
          "@type": "PropertyValue",
          "name": "Grade",
          "value": banknote.grade
        },
        banknote.rarity && {
          "@type": "PropertyValue",
          "name": "Rarity",
          "value": banknote.rarity
        },
        banknote.issuing_authority && {
          "@type": "PropertyValue",
          "name": "Issuing Authority",
          "value": banknote.issuing_authority
        },
        banknote.designers && {
          "@type": "PropertyValue",
          "name": "Designers",
          "value": banknote.designers
        },
        banknote.security_features && {
          "@type": "PropertyValue",
          "name": "Security Features",
          "value": banknote.security_features
        }
      ].filter(Boolean)
    };
  };
  const structuredData = generateStructuredData();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${metaDesc}">
  <link rel="canonical" href="https://ottocollect.com/catalog-banknote/${banknote.id}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="alternate" hreflang="x-default" href="https://ottocollect.com/catalog-banknote/${banknote.id}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ottocollect.com/catalog-banknote/${banknote.id}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:alt" content="${banknote.face_value} ${banknote.country} banknote from ${banknote.gregorian_year || banknote.islamic_year || ''} - Pick ${banknote.extended_pick_number}">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="https://ottocollect.com/catalog-banknote/${banknote.id}">
  <meta property="twitter:title" content="${title}">
  <meta property="twitter:description" content="${metaDesc}">
  <meta property="twitter:image" content="${imageUrl}">
  <meta property="twitter:image:alt" content="${banknote.face_value} ${banknote.country} banknote from ${banknote.gregorian_year || banknote.islamic_year || ''} - Pick ${banknote.extended_pick_number}">
  <meta property="twitter:creator" content="@OttoCollect">

  <script type="application/ld+json">
    ${JSON.stringify(structuredData, null, 2)}
  </script>

  <!-- CSS to match the exact layout from the image -->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f0;
      color: #333;
      line-height: 1.6;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .back-arrow {
      font-size: 24px;
      margin-right: 15px;
      color: #666;
      cursor: pointer;
    }
    
    .header-info h1 {
      font-size: 2.5rem;
      font-weight: bold;
      color: #222;
      margin-bottom: 5px;
    }
    
    .header-info .subtitle {
      font-size: 1.2rem;
      color: #666;
    }
    
    .main-layout {
      display: flex;
      gap: 20px;
    }
    
    .image-section {
      flex: 2;
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .image-section h2 {
      font-size: 1.5rem;
      margin-bottom: 15px;
      color: #333;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .image-icon {
      width: 20px;
      height: 20px;
    }
    
    .banknote-image {
      width: 100%;
      max-width: 500px;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      margin: 10px 0;
    }
    
    .details-section {
      flex: 1;
      background: #faf9f5;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .details-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    
    .details-header h2 {
      font-size: 1.5rem;
      color: #333;
    }
    
    .details-subtitle {
      color: #666;
      font-size: 0.9rem;
      margin-bottom: 15px;
    }
    
    .action-icons {
      display: flex;
      gap: 10px;
    }
    
    .action-icon {
      width: 24px;
      height: 24px;
      background: #f0f0f0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 12px;
      color: #666;
    }
    
    .details-table {
      width: 100%;
    }
    
    .detail-row {
      display: flex;
      padding: 12px 0;
      border-bottom: 1px solid #e5e5e5;
    }
    
    .detail-row:last-child {
      border-bottom: none;
    }
    
    .detail-label {
      font-weight: 600;
      color: #555;
      min-width: 150px;
      flex-shrink: 0;
    }
    
    .detail-value {
      color: #333;
      flex: 1;
    }

    .narrative {
      background: white;
      border-radius: 8px;
      padding: 28px 32px;
      margin-top: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .narrative h2 {
      font-size: 1.5rem;
      margin: 0 0 16px;
      color: #222;
    }

    .narrative p {
      margin: 0 0 14px;
      color: #333;
      font-size: 1rem;
      line-height: 1.7;
    }

    .narrative p:last-child {
      margin-bottom: 0;
    }

    .narrative strong {
      color: #1f2937;
    }

    .related-links {
      background: #faf9f5;
      border-radius: 8px;
      padding: 28px 32px;
      margin-top: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .related-links > h2 {
      font-size: 1.5rem;
      margin: 0 0 18px;
      color: #222;
    }

    .related-group {
      margin-bottom: 22px;
    }

    .related-group:last-child {
      margin-bottom: 0;
    }

    .related-group h3 {
      font-size: 1.05rem;
      color: #444;
      margin: 0 0 10px;
      font-weight: 600;
    }

    .related-group ul {
      list-style: disc;
      padding-left: 20px;
      margin: 0;
    }

    .related-group li {
      margin: 4px 0;
    }

    .related-group a {
      color: #1d4ed8;
      text-decoration: none;
    }

    .related-group a:hover {
      text-decoration: underline;
    }

    .redirect-notice {
      text-align: center;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-top: 20px;
      color: #666;
    }
    
    .redirect-notice a {
      color: #007bff;
      text-decoration: none;
    }
    
    .redirect-notice a:hover {
      text-decoration: underline;
    }
    
    @media (max-width: 768px) {
      .main-layout {
        flex-direction: column;
      }
      
      .header-info h1 {
        font-size: 2rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header matching the image -->
    <div class="header">
      <div class="back-arrow">←</div>
      <div class="header-info">
        <h1>${banknote.face_value} ${banknote.country}</h1>
        <div class="subtitle">${banknote.country}, ${banknote.gregorian_year || banknote.islamic_year}</div>
      </div>
    </div>

    <!-- Main layout matching the image -->
    <div class="main-layout">
      <!-- Left panel - Banknote Images -->
      <div class="image-section">
        <h2>
          <svg class="image-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
          Banknote Images
        </h2>
        <img src="${imageUrl}" alt="${banknote.face_value} ${banknote.country} banknote front side from ${banknote.gregorian_year || banknote.islamic_year || ''} - Pick ${banknote.extended_pick_number}" class="banknote-image">
        ${backImageUrl ? `<img src="${backImageUrl}" alt="${banknote.face_value} ${banknote.country} banknote back side from ${banknote.gregorian_year || banknote.islamic_year || ''} - Pick ${banknote.extended_pick_number}" class="banknote-image">` : ''}
      </div>

      <!-- Right panel - Banknote Details -->
      <div class="details-section">
        <div class="details-header">
          <div>
            <h2>Banknote Details</h2>
            <div class="details-subtitle">Detailed information about this banknote</div>
          </div>
          <div class="action-icons">
            <div class="action-icon">2</div>
            <div class="action-icon">♡</div>
            <div class="action-icon">+</div>
          </div>
        </div>
        
        <div class="details-table">
          ${banknote.extended_pick_number ? `
          <div class="detail-row">
            <div class="detail-label">Extended Pick Number</div>
            <div class="detail-value">${banknote.extended_pick_number}</div>
          </div>
          ` : ''}
          
          ${banknote.pick_number ? `
          <div class="detail-row">
            <div class="detail-label">Pick Number</div>
            <div class="detail-value">${banknote.pick_number}</div>
          </div>
          ` : ''}
          
          ${banknote.turk_catalog_number ? `
          <div class="detail-row">
            <div class="detail-label">Turk Catalog Number</div>
            <div class="detail-value">${banknote.turk_catalog_number}</div>
          </div>
          ` : ''}
          
          ${banknote.face_value ? `
          <div class="detail-row">
            <div class="detail-label">Face Value</div>
            <div class="detail-value">${banknote.face_value}</div>
          </div>
          ` : ''}
          
          ${banknote.country ? `
          <div class="detail-row">
            <div class="detail-label">Country</div>
            <div class="detail-value">${banknote.country}</div>
          </div>
          ` : ''}
          
          ${banknote.gregorian_year ? `
          <div class="detail-row">
            <div class="detail-label">Gregorian Year</div>
            <div class="detail-value">${banknote.gregorian_year}</div>
          </div>
          ` : ''}
          
          ${banknote.islamic_year ? `
          <div class="detail-row">
            <div class="detail-label">Islamic Year</div>
            <div class="detail-value">${banknote.islamic_year}</div>
          </div>
          ` : ''}
          
          ${banknote.sultan_name ? `
          <div class="detail-row">
            <div class="detail-label">The monarch</div>
            <div class="detail-value">${banknote.sultan_name}</div>
          </div>
          ` : ''}
          
          ${banknote.printer ? `
          <div class="detail-row">
            <div class="detail-label">Printer</div>
            <div class="detail-value">${banknote.printer}</div>
          </div>
          ` : ''}
          
          ${banknote.type ? `
          <div class="detail-row">
            <div class="detail-label">Type</div>
            <div class="detail-value">${banknote.type}</div>
          </div>
          ` : ''}
          
          ${banknote.category ? `
          <div class="detail-row">
            <div class="detail-label">Category</div>
            <div class="detail-value">${banknote.category}</div>
          </div>
          ` : ''}
          
          ${banknote.rarity ? `
          <div class="detail-row">
            <div class="detail-label">Rarity</div>
            <div class="detail-value">${banknote.rarity}</div>
          </div>
          ` : ''}
          
          ${banknote.security_element ? `
          <div class="detail-row">
            <div class="detail-label">Security Element</div>
            <div class="detail-value">${banknote.security_element}</div>
          </div>
          ` : ''}
          
          ${banknote.colors ? `
          <div class="detail-row">
            <div class="detail-label">Colors</div>
            <div class="detail-value">${banknote.colors}</div>
          </div>
          ` : ''}
          
          ${banknote.serial_numbering ? `
          <div class="detail-row">
            <div class="detail-label">Serial Numbering</div>
            <div class="detail-value">${banknote.serial_numbering}</div>
          </div>
          ` : ''}
          
          ${banknote.dimensions ? `
          <div class="detail-row">
            <div class="detail-label">Dimensions</div>
            <div class="detail-value">${banknote.dimensions}</div>
          </div>
          ` : ''}
          
          ${banknote.signatures_front ? `
          <div class="detail-row">
            <div class="detail-label">Front Signatures</div>
            <div class="detail-value">${banknote.signatures_front}</div>
          </div>
          ` : ''}
          
          ${banknote.signatures_back ? `
          <div class="detail-row">
            <div class="detail-label">Back Signatures</div>
            <div class="detail-value">${banknote.signatures_back}</div>
          </div>
          ` : ''}
          
          ${banknote.seal_names ? `
          <div class="detail-row">
            <div class="detail-label">Seal Names</div>
            <div class="detail-value">${banknote.seal_names}</div>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
    
    ${(() => {
      const narrativeHtml = buildBanknoteNarrative(banknote);
      return narrativeHtml ? `<section class="narrative">
      <h2>About this ${banknote.face_value || ''} ${banknote.country || ''} banknote</h2>
${narrativeHtml}
    </section>` : '';
    })()}

    ${banknoteIndex ? buildBanknoteRelatedLinks(banknote, banknoteIndex) : ''}

    <div class="redirect-notice">
      <p>If you are not redirected automatically, <a href="/catalog-banknote/${banknote.id}">click here to view the interactive version</a>.</p>
    </div>
  </div>

  <!-- No redirects for crawlers - they should see the static content -->
  <script>
    // Only redirect regular users, not crawlers
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      // Small delay to ensure meta tags are processed by social media crawlers
      setTimeout(() => {
        window.location.replace('/catalog-banknote/${banknote.id}');
      }, 100);
    }
  </script>
</body>
</html>`;
}
function generateForumPageHTML(forumPosts: any[] = [], announcements: any[] = []) {
  const title = 'Ottoman Banknote Collectors Forum | OttoCollect';
  const description = 'Join the OttoCollect community of Ottoman Empire banknote collectors. Discuss rare Turkish currency, share authentication tips, and connect with enthusiasts.';
  const imageUrl = 'https://ottocollect.com/web-app-manifest-512x512.png';
  // Generate forum posts HTML matching the exact layout from the image
  const generateForumPosts = ()=>{
    if (!forumPosts || forumPosts.length === 0) {
      return `
        <div class="text-center py-10">
          <p>No forum posts yet. Be the first to create one!</p>
        </div>
      `;
    }
    return forumPosts.map((post: any)=>{
      const postUrl = `/forum-post/${post.id}`;
      const authorName = post.author?.username || post.author?.name || 'Unknown User';
      const authorAvatar = post.author?.avatar_url || post.author?.avatarUrl || '';
      const commentCount = post.commentCount || post.comment_count || post.reply_count || 0;
      const createdDate = new Date(post.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const postContent = post.content || 'No content available';
      // Show full content or up to 500 chars with "..."
      const contentPreview = postContent.length > 500 ? postContent.substring(0, 500) + '...' : postContent;
      
      return `
        <article class="forum-post-item" itemscope itemtype="https://schema.org/DiscussionForumPosting" onclick="window.location.href='${postUrl}'">
          <div class="post-content">
            <h3 class="post-title" itemprop="headline"><a href="${postUrl}">${escapeHtml(post.title || 'Untitled Post')}</a></h3>
            <div class="post-excerpt" itemprop="text">
              ${escapeHtml(contentPreview)}
            </div>
            <div class="post-meta">
              <div class="author-section">
                <div class="author-avatar">
                  ${authorAvatar ? `
                    <img src="${authorAvatar}" alt="${escapeHtml(authorName)}" class="avatar-img" itemprop="image">
                  ` : `
                    <div class="avatar-placeholder"></div>
                  `}
                </div>
                <span class="author-name" itemprop="author" itemscope itemtype="https://schema.org/Person">
                  <span itemprop="name">${escapeHtml(authorName)}</span>
                </span>
                <time class="post-date" datetime="${post.created_at}" itemprop="datePublished">
                  <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  ${createdDate}
                </time>
              </div>
              <div class="comment-count" itemprop="interactionStatistic" itemscope itemtype="https://schema.org/InteractionCounter">
                <meta itemprop="interactionType" content="https://schema.org/ReplyAction">
                <meta itemprop="userInteractionCount" content="${commentCount}">
                <svg class="comment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>${commentCount} ${commentCount === 1 ? 'reply' : 'replies'}</span>
              </div>
            </div>
            <a href="${postUrl}" itemprop="url" style="display:none;">${escapeHtml(post.title || 'Untitled Post')}</a>
          </div>
        </article>
      `;
    }).join('');
  };
  // Generate announcements HTML
  const generateAnnouncements = ()=>{
    if (!announcements || announcements.length === 0) {
      return '';
    }
    return announcements.map((announcement: any)=>{
      const announcementUrl = `/forum-post/${announcement.id}`;
      // Handle both direct foreign key relationship and transformed author object
      const authorData = announcement.author || (announcement.author_id ? announcement.author_id : null);
      const authorName = authorData?.username || authorData?.name || 'Admin';
      const authorAvatar = authorData?.avatar_url || authorData?.avatarUrl || '';
      const commentCount = announcement.commentCount || announcement.comment_count || 0;
      const createdDate = new Date(announcement.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const announcementContent = announcement.content || announcement.description || 'No content available';
      const contentPreview = announcementContent.length > 500 ? announcementContent.substring(0, 500) + '...' : announcementContent;
      
      return `
        <article class="forum-post-item announcement" itemscope itemtype="https://schema.org/DiscussionForumPosting" onclick="window.location.href='${announcementUrl}'">
          <div class="post-content">
            <div class="announcement-badge">Announcement</div>
            <h3 class="post-title" itemprop="headline">${announcement.title || 'Untitled Announcement'}</h3>
            <div class="post-excerpt" itemprop="text">
              ${contentPreview}
            </div>
            <div class="post-meta">
              <div class="author-section">
                <div class="author-avatar">
                  ${authorAvatar ? `
                    <img src="${authorAvatar}" alt="${authorName}" class="avatar-img" itemprop="image">
                  ` : `
                    <div class="avatar-placeholder"></div>
                  `}
                </div>
                <span class="author-name" itemprop="author" itemscope itemtype="https://schema.org/Person">
                  <span itemprop="name">${authorName}</span>
                </span>
                <time class="post-date" datetime="${announcement.created_at}" itemprop="datePublished">
                  <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  ${createdDate}
                </time>
              </div>
              <div class="comment-count" itemprop="interactionStatistic" itemscope itemtype="https://schema.org/InteractionCounter">
                <meta itemprop="interactionType" content="https://schema.org/ReplyAction">
                <meta itemprop="userInteractionCount" content="${commentCount}">
                <svg class="comment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>${commentCount} ${commentCount === 1 ? 'reply' : 'replies'}</span>
              </div>
            </div>
            <a href="${announcementUrl}" itemprop="url" style="display:none;">${announcement.title || 'Untitled Announcement'}</a>
          </div>
        </article>
      `;
    }).join('');
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ottocollect.com/forum">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="512">
  <meta property="og:image:height" content="512">
  <meta property="og:image:alt" content="OttoCollect Forum">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://ottocollect.com/forum">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:creator" content="@OttoCollect">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://ottocollect.com/forum">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="alternate" hreflang="x-default" href="https://ottocollect.com/forum">

  <!-- Structured Data for Forum Posts -->
  <script type="application/ld+json">
    ${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "OttoCollect Forum - Ottoman Empire Banknote Collectors Community",
      "description": description,
      "url": "https://ottocollect.com/forum",
      "mainEntity": {
        "@type": "ItemList",
        "name": "Forum Posts",
        "description": "Community discussions about Ottoman Empire banknotes, authentication, grading, collecting tips, and numismatic history",
        "numberOfItems": (forumPosts?.length || 0) + (announcements?.length || 0),
        "itemListElement": [
          // Announcements first
          ...(announcements && announcements.length > 0 ? announcements.map((announcement: any, index: number) => ({
            "@type": "ListItem",
            "position": index + 1,
            "item": {
              "@type": "DiscussionForumPosting",
              "headline": announcement.title || 'Untitled Announcement',
              "text": announcement.content || announcement.description || 'No content available',
              "author": {
                "@type": "Person",
                "name": announcement.author?.username || announcement.author?.name || 'Admin'
              },
              "datePublished": announcement.created_at,
              "url": `https://ottocollect.com/forum-post/${announcement.id}`,
              "interactionStatistic": {
                "@type": "InteractionCounter",
                "interactionType": "https://schema.org/ReplyAction",
                "userInteractionCount": announcement.commentCount || announcement.comment_count || 0
              }
            }
          })) : []),
          // Regular forum posts
          ...(forumPosts && forumPosts.length > 0 ? forumPosts.map((post: any, index: number) => ({
            "@type": "ListItem",
            "position": (announcements?.length || 0) + index + 1,
            "item": {
              "@type": "DiscussionForumPosting",
              "headline": post.title || 'Untitled Post',
              "text": post.content || 'No content available',
              "author": {
                "@type": "Person",
                "name": post.author?.username || post.author?.name || 'Unknown User'
              },
              "datePublished": post.created_at,
              "url": `https://ottocollect.com/forum-post/${post.id}`,
              "interactionStatistic": {
                "@type": "InteractionCounter",
                "interactionType": "https://schema.org/ReplyAction",
                "userInteractionCount": post.commentCount || post.comment_count || post.reply_count || 0
              }
            }
          })) : [])
        ]
      },
      "about": {
        "@type": "Thing",
        "name": "Ottoman Empire Banknotes",
        "description": "Historical banknotes from the Ottoman Empire and successor countries, numismatic collecting, authentication, grading, and market trends"
      },
      "keywords": "Ottoman Empire banknotes, Turkish catalog, banknote collecting, numismatics, authentication, grading, rare banknotes, collectors forum"
    }, null, 2)}
  </script>
  
  <!-- CSS matching the exact layout from the image -->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #FBFBFB;
      color: #3C2415;
      line-height: 1.6;
      min-height: 100vh;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .hero-section {
      background-color: #EFEBE9;
      padding: 48px 0;
      margin-bottom: 0;
    }
    
    .hero-content {
      text-align: center;
    }
    
    .hero-title {
      font-size: 2.5rem;
      font-weight: bold;
      color: #3C2415;
      margin-bottom: 8px;
      font-family: serif;
    }
    
    .hero-subtitle {
      font-size: 1rem;
      color: #3C2415;
    }
    
    .main-content {
      background-color: #FBFBFB;
      padding: 20px 0;
    }
    
    .forum-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 24px;
    }
    
    .tabs-list {
      display: flex;
      background: white;
      border-radius: 8px;
      padding: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .tab-trigger {
      padding: 8px 16px;
      border: none;
      background: transparent;
      color: #3C2415;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.3s ease;
      font-weight: 500;
    }
    
    .tab-trigger.active {
      background: #D4CFCB;
      color: #3C2415;
    }
    
    .tab-trigger:not(.active) {
      background: #E0DEDC;
    }
    
    .search-container {
      position: relative;
      width: 200px;
    }
    
    .search-input {
      width: 100%;
      padding: 8px 32px 8px 32px;
      border: 1px solid #D4CFCB;
      border-radius: 8px;
      font-size: 0.875rem;
      background: white;
    }
    
    .search-icon {
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: #6B7280;
    }
    
    .action-buttons {
      display: flex;
      gap: 8px;
    }
    
    .action-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: white;
      color: #3C2415;
      border: 1px solid #D4CFCB;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.3s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .action-button:hover {
      background: #F5F5F5;
    }
    
    .posts-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .forum-post-item {
      border-bottom: 1px solid #E5E7EB;
      cursor: pointer;
      transition: background-color 0.2s ease;
      padding: 16px 20px;
    }
    
    .forum-post-item:hover {
      background-color: #F9FAFB;
    }
    
    .forum-post-item:last-child {
      border-bottom: none;
    }
    
    .forum-post-item.announcement {
      background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
      border-color: #93C5FD;
    }
    
    .post-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .post-title {
      font-size: 1rem;
      font-weight: 600;
      color: #3C2415;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    
    .post-excerpt {
      font-size: 0.9rem;
      color: #5a6c7d;
      line-height: 1.6;
      margin-bottom: 12px;
      max-height: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .announcement-badge {
      display: inline-block;
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .post-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .author-section {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .author-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      overflow: hidden;
      background: #F3F4F6;
    }
    
    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .avatar-placeholder {
      width: 100%;
      height: 100%;
      background: #D1D5DB;
      border-radius: 50%;
    }
    
    .author-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: #3C2415;
    }
    
    .post-date {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.875rem;
      color: #6B7280;
    }
    
    .calendar-icon {
      width: 14px;
      height: 14px;
    }
    
    .comment-count {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.875rem;
      color: #6B7280;
    }
    
    .comment-icon {
      width: 16px;
      height: 16px;
    }
    
    .redirect-notice {
      text-align: center;
      padding: 20px;
      background: #F8F9FA;
      border-radius: 8px;
      margin-top: 20px;
      color: #6B7280;
    }
    
    .redirect-notice a {
      color: #8B4513;
      text-decoration: none;
    }
    
    .redirect-notice a:hover {
      text-decoration: underline;
    }
    
    @media (max-width: 768px) {
      .hero-title {
        font-size: 2rem;
      }
      
      .forum-controls {
        flex-direction: column;
        gap: 12px;
      }
      
      .search-container {
        width: 100%;
        max-width: 300px;
      }
      
      .action-buttons {
        width: 100%;
        justify-content: center;
      }
      
      .post-meta {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
      
      .comment-count {
        align-self: flex-end;
      }
    }
  </style>
</head>
<body>
  <!-- Hero Section -->
  <section class="hero-section">
    <div class="container">
      <div class="hero-content">
        <h1 class="hero-title"><span>Ottoman Banknote Collectors Forum</span></h1>
        <p class="hero-subtitle">Discuss banknotes and collecting strategies</p>
      </div>
    </div>
  </section>

  <!-- Main Content -->
  <div class="main-content">
    <div class="container">
      <!-- Forum Controls -->
      <div class="forum-controls">
        <div class="tabs-list">
          <button class="tab-trigger active">All Posts</button>
          <button class="tab-trigger">My Posts</button>
        </div>
        
        <div class="search-container">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input type="search" class="search-input" placeholder="Search...">
        </div>
        
        <div class="action-buttons">
          <a href="/auth" class="action-button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            Post
          </a>
          <a href="/auth" class="action-button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 11l19-5-19-5v10z"></path>
              <path d="M5.5 6.5L22 2l-3.5 3.5L5.5 6.5z"></path>
            </svg>
            Announcement
          </a>
        </div>
      </div>

      <!-- Posts Container -->
      <div class="posts-container">
        <!-- Announcements -->
        ${generateAnnouncements()}
        
        <!-- Forum Posts -->
        ${generateForumPosts()}
      </div>
    </div>
  </div>
  
  <div class="redirect-notice">
    <p>If you are not redirected automatically, <a href="/forum">click here to view the interactive version</a>.</p>
  </div>

  <!-- No redirects for crawlers -->
  <script>
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      setTimeout(() => {
        window.location.replace('/forum');
      }, 100);
    }
  </script>
</body>
</html>`;
}
function generateCatalogPageHTML(countries) {
  const title = 'Ottoman Empire Banknote Catalog by Country | OttoCollect';
  const description = 'Browse the OttoCollect catalog of Ottoman Empire banknotes and currency from successor countries — Turkey, Egypt, Jordan, Syria, Palestine and more, organised by country.';
  const imageUrl = 'https://ottocollect.com/web-app-manifest-512x512.png';
  // Generate country cards HTML
  const generateCountryCards = ()=>{
    if (!countries || countries.length === 0) {
      return `
        <div class="text-center py-8">
          <h3 class="text-xl font-medium mb-4 text-ottoman-900">No countries found</h3>
          <p class="text-muted-foreground">Try adjusting your search criteria</p>
        </div>
      `;
    }
    // Filter to only show countries with banknotes, or show all if display_order exists
    const countriesToShow = countries.filter(country => {
      // Show country if it has banknotes OR if it's in the countries table (has display_order)
      return (country.banknoteCount && country.banknoteCount > 0) || country.display_order !== undefined;
    }).sort((a, b) => {
      // Sort by display_order if available, otherwise by name
      if (a.display_order !== undefined && b.display_order !== undefined) {
        return (a.display_order || 999) - (b.display_order || 999);
      }
      return (a.name || '').localeCompare(b.name || '');
    });
    
    return countriesToShow.map((country)=>{
      const countryUrl = `/catalog/${encodeURIComponent(country.name)}`;
      const countryImage = country.imageUrl || country.image_url || '';
      const banknoteCount = country.banknoteCount || 0;
      return `
        <a href="${countryUrl}" class="country-card-link" itemscope itemtype="https://schema.org/CollectionPage">
          <div class="country-card">
            <div class="country-image-container">
              ${countryImage ? `
                <img src="${countryImage}" alt="Banknotes catalogue from ${country.name}" class="country-image" itemprop="image">
              ` : `
                <div class="country-placeholder">
                  <span class="country-placeholder-text">${country.name}</span>
                </div>
              `}
              <div class="country-overlay">
                <div class="country-info">
                  <h3 class="country-name" itemprop="name">${country.name}</h3>
                  <p class="country-count" itemprop="numberOfItems">${banknoteCount} banknote${banknoteCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          </div>
        </a>
      `;
    }).join('');
  };
  // Generate structured data. A catalog index is a CollectionPage (an ItemList
  // of per-country collection pages), not a WebSite — WebSite is reserved for
  // the home page. We drop the old duplicate `hasPart` array that repeated the
  // same per-country list a second time.
  const generateStructuredData = ()=>{
    const shown = countries?.filter(country => (country.banknoteCount && country.banknoteCount > 0) || country.display_order !== undefined) || [];
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "Ottoman Empire Banknote Catalog",
      "description": "Comprehensive catalog of Ottoman Empire banknotes and historical currency from successor countries",
      "url": "https://ottocollect.com/catalog",
      "mainEntity": {
        "@type": "ItemList",
        "name": "Ottoman Empire Banknote Catalog by Country",
        "numberOfItems": shown.length,
        "itemListElement": shown.map((country, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "CollectionPage",
            "name": `${country.name} Banknote Catalog`,
            "url": `https://ottocollect.com/catalog/${encodeURIComponent(country.name)}`,
            "numberOfItems": country.banknoteCount || 0
          }
        }))
      },
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://ottocollect.com/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Catalog",
            "item": "https://ottocollect.com/catalog"
          }
        ]
      }
    };
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ottocollect.com/catalog">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="512">
  <meta property="og:image:height" content="512">
  <meta property="og:image:alt" content="OttoCollect Catalog">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://ottocollect.com/catalog">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:creator" content="@OttoCollect">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://ottocollect.com/catalog">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="alternate" hreflang="x-default" href="https://ottocollect.com/catalog">

  <!-- Structured Data -->
  <script type="application/ld+json">
    ${JSON.stringify(generateStructuredData(), null, 2)}
  </script>

  <!-- CSS to match the catalog page layout -->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f0;
      color: #333;
      line-height: 1.6;
      min-height: 100vh;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .hero-section {
      background-color: #E5D0C3;
      padding: 48px 0;
      margin-bottom: 16px;
      position: relative;
      overflow: hidden;
    }
    
    .hero-section::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(201, 168, 130, 0.4) 0%, rgba(201, 168, 130, 0.1) 100%);
      z-index: 1;
    }
    
    .hero-content {
      text-align: center;
      position: relative;
      z-index: 10;
    }
    
    .hero-title {
      font-size: 2.5rem;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 16px;
      font-family: serif;
    }
    
    @media (min-width: 768px) {
      .hero-title {
        font-size: 3rem;
      }
    }
    
    .hero-subtitle {
      font-size: 1rem;
      color: #4a5568;
      max-width: 896px;
      margin: 16px auto 0;
      line-height: 1.6;
    }
    
    @media (min-width: 768px) {
      .hero-subtitle {
        font-size: 1.125rem;
      }
    }
    
    .catalog-container {
      width: 90%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px 0;
    }
    
    .countries-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      align-items: start;
    }
    
    .country-card-link {
      text-decoration: none;
      color: inherit;
      display: block;
    }
    
    .country-card {
      background: white;
      border: 1px solid rgba(201, 168, 130, 0.5);
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.3s ease;
      height: 100%;
    }
    
    @media (prefers-color-scheme: dark) {
      .country-card {
        background-color: #2c1810;
        border-color: rgba(86, 58, 39, 0.5);
      }
    }
    
    .country-card:hover {
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }
    
    .country-image-container {
      position: relative;
      aspect-ratio: 4/2;
      overflow: hidden;
    }
    
    .country-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    
    .country-card:hover .country-image {
      transform: scale(1.05);
    }
    
    .country-placeholder {
      width: 100%;
      height: 100%;
      background-color: #E5D0C3;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    @media (prefers-color-scheme: dark) {
      .country-placeholder {
        background-color: #E5D0C3;
      }
    }
    
    .country-placeholder-text {
      color: #9C6644;
      font-size: 1.25rem;
      font-weight: 500;
    }
    
    .country-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
      display: flex;
      align-items: end;
    }
    
    .country-info {
      width: 100%;
      padding: 16px;
      background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
    }
    
    .country-name {
      font-size: 1.25rem;
      font-weight: bold;
      color: #ffffff;
      margin-bottom: 4px;
    }
    
    .country-count {
      font-size: 0.875rem;
      color: rgba(255,255,255,0.9);
    }
    
    .loading-spinner {
      display: flex;
      justify-content: center;
      padding: 48px 0;
    }
    
    .spinner {
      width: 48px;
      height: 48px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #8b4513;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .no-countries {
      text-align: center;
      padding: 32px 0;
    }
    
    .no-countries h3 {
      font-size: 1.25rem;
      font-weight: 500;
      margin-bottom: 16px;
      color: #2c3e50;
    }
    
    .no-countries p {
      color: #666;
    }
    
    .redirect-notice {
      text-align: center;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-top: 20px;
      color: #666;
    }
    
    .redirect-notice a {
      color: #8b4513;
      text-decoration: none;
    }
    
    .redirect-notice a:hover {
      text-decoration: underline;
    }
    
    @media (max-width: 768px) {
      .hero-title {
        font-size: 2rem;
      }
      
      .catalog-container {
        width: 92%;
      }
      
      .countries-grid {
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
      }
    }
    
    @media (max-width: 480px) {
      .countries-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <!-- Hero Section -->
  <section class="hero-section">
    <div class="container">
      <div class="hero-content">
        <h1 class="hero-title"><span>Ottoman Empire Banknote Catalog</span></h1>
        <p class="hero-subtitle">
          Explore our comprehensive collection of Ottoman Empire banknotes and historical currency from successor countries.
          Discover authentic banknotes from Turkey, Jordan, Egypt, Lebanon, Palestine, Syria, Israel, Bulgaria, Albania, and beyond.
        </p>
      </div>
    </div>
  </section>

  <!-- Catalog Content -->
  <div class="catalog-container">
    <div class="countries-grid">
      ${generateCountryCards()}
    </div>
  </div>
  
  <div class="redirect-notice">
    <p>If you are not redirected automatically, <a href="/catalog">click here to view the interactive version</a>.</p>
  </div>

  <!-- No redirects for crawlers - they should see the static content -->
  <script>
    // Only redirect regular users, not crawlers
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      // Small delay to ensure meta tags are processed by social media crawlers
      setTimeout(() => {
        window.location.replace('/catalog');
      }, 100);
    }
  </script>
</body>
</html>`;
}
// Community hub page. /community is sitemapped and linked from the homepage,
// but previously had no static file, so crawlers got the homepage shell (a
// soft-duplicate). This gives it unique, crawlable content + structured data.
function generateCommunityPageHTML(countries: any[] = [], forumPosts: any[] = []) {
  const title = 'OttoCollect Community — Ottoman Banknote Collectors Worldwide';
  const description = 'Connect with Ottoman Empire banknote collectors worldwide on OttoCollect — join the forum, read the blog, browse the marketplace and share your collection.';
  const imageUrl = 'https://ottocollect.com/web-app-manifest-512x512.png';
  const canonical = 'https://ottocollect.com/community';

  const recentPosts = (forumPosts || []).slice(0, 6);
  const postsList = recentPosts.length
    ? recentPosts.map((p: any) => {
        const u = `/forum-post/${p.id}`;
        return `<li><a href="${u}">${escapeHtml(p.title || 'Forum discussion')}</a></li>`;
      }).join('')
    : '';

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "OttoCollect Community",
    "description": description,
    "url": canonical,
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://ottocollect.com/" },
        { "@type": "ListItem", "position": 2, "name": "Community", "item": canonical }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "OttoCollect community areas",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Collectors Forum", "url": "https://ottocollect.com/forum" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "url": "https://ottocollect.com/blog" },
        { "@type": "ListItem", "position": 3, "name": "Marketplace", "url": "https://ottocollect.com/marketplace" },
        { "@type": "ListItem", "position": 4, "name": "Banknote Catalog", "url": "https://ottocollect.com/catalog" }
      ]
    }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="512">
  <meta property="og:image:height" content="512">
  <meta property="og:image:alt" content="OttoCollect Community">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:url" content="${canonical}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:creator" content="@OttoCollect">

  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="alternate" hreflang="x-default" href="${canonical}">

  <script type="application/ld+json">
${JSON.stringify(structuredData, null, 2)}
  </script>

  <style>
    body { font-family: Inter, system-ui, sans-serif; margin: 0; color: #1f2937; line-height: 1.6; background:#fff; }
    .container { max-width: 1000px; margin: 0 auto; padding: 0 1rem; }
    .hero-section { padding: 3rem 0 1rem; text-align: center; }
    .hero-title { font-size: 2.4rem; margin: 0 0 .5rem; }
    .hero-subtitle { font-size: 1.1rem; color: #4b5563; max-width: 720px; margin: 0 auto; }
    .areas { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin: 2rem 0; }
    .area-card { display:block; border:1px solid #e5e7eb; border-radius:.5rem; padding:1.25rem; text-decoration:none; color:inherit; }
    .area-card h2 { font-size:1.2rem; margin:.25rem 0; }
    .recent { margin: 2rem 0; }
    .redirect-notice { text-align:center; color:#6b7280; padding:1rem 0 2rem; }
    @media (max-width:768px){ .hero-title{ font-size:1.8rem; } }
  </style>
</head>
<body>
  <section class="hero-section">
    <div class="container">
      <h1 class="hero-title"><span>OttoCollect Community</span></h1>
      <p class="hero-subtitle">A worldwide community of Ottoman Empire banknote collectors. Discuss finds and authentication, read expert articles, trade in the marketplace, and showcase your collection.</p>
    </div>
  </section>

  <div class="container">
    <div class="areas">
      <a class="area-card" href="/forum"><h2>Collectors Forum</h2><p>Discuss rare currency, authentication and grading with fellow collectors.</p></a>
      <a class="area-card" href="/blog"><h2>Blog</h2><p>Expert articles on Ottoman banknotes, history and numismatic guides.</p></a>
      <a class="area-card" href="/marketplace"><h2>Marketplace</h2><p>Buy and sell authentic Ottoman Empire banknotes and historical paper money.</p></a>
      <a class="area-card" href="/catalog"><h2>Banknote Catalog</h2><p>Browse the full catalog of Ottoman Empire banknotes by country.</p></a>
    </div>

    ${postsList ? `<section class="recent"><h2>Recent forum discussions</h2><ul>${postsList}</ul></section>` : ''}
  </div>

  <div class="redirect-notice">
    <p>If you are not redirected automatically, <a href="/community">click here to view the interactive version</a>.</p>
  </div>

  <script>
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      setTimeout(() => { window.location.replace('/community'); }, 100);
    }
  </script>
</body>
</html>`;
}

export function generateGuideHTML() {
  const title = 'OttoCollect Guide - How to Use the Platform | Ottoman Banknote Catalogues and Collections';
  const description = 'Learn how to use OttoCollect platform for Ottoman Empire banknote collection. Complete guide for adding banknotes, managing collections, and connecting with collectors worldwide.';
  const imageUrl = 'https://ottocollect.com/web-app-manifest-512x512.png';
  
  // Guide sections data
  const sections = {
    addBanknote: {
      title: 'How to Add a Banknote to Your Collection',
      icon: '🧾',
      steps: {
        step1: {
          title: 'Go to the Catalogues',
          description: 'From the top menu, click on "Catalogues".',
          type: 'success'
        },
        step2: {
          title: 'Choose a Country',
          description: 'Click on the country whose banknotes you want to view.',
          type: 'success'
        },
        step3: {
          title: 'Browse and Add Banknotes',
          description: 'Scroll through the list of banknotes. To add one to your collection, click the "+" icon on the top-right of the banknote card.',
          type: 'success'
        },
        step4: {
          title: 'Add More Banknotes',
          description: 'Repeat the process for every banknote you own. You can quickly add multiple this way.',
          type: 'success'
        },
        step5: {
          title: 'View Your Collection',
          description: 'Once you\'re done, go to the "My Collection" section from the menu to see all the banknotes you\'ve added.',
          type: 'success'
        },
        step6: {
          title: 'Remove a Mistaken Entry',
          description: 'If you added a banknote by mistake: Click on that banknote in your collection. On its page, click the trash icon 🗑️ to remove it. The banknote will be deleted from your collection.',
          type: 'error'
        }
      }
    },
    editBanknote: {
      title: 'How to Add Information or a Picture to a Banknote in Your Collection',
      icon: '🖼️',
      steps: {
        step1: {
          title: 'Open "My Collection"',
          description: 'From the top menu, click on "My Collection" to access your personal banknotes.',
          type: 'success'
        },
        step2: {
          title: 'Select a Country',
          description: 'Choose the country of the banknote you\'d like to edit.',
          type: 'success'
        },
        step3: {
          title: 'Choose the Banknote',
          description: 'Scroll down and click on the banknote you want to update.',
          type: 'success'
        },
        step4: {
          title: 'Click the Edit Icon ✏️',
          description: 'In the banknote details page, click on the Edit icon (typically a pencil).',
          type: 'success'
        },
        step5: {
          title: 'Fill in the Details',
          description: 'A form will appear. You can now: Add or update quantity, Enter notes, grade, purchase source, or any other personal details.',
          type: 'success'
        },
        step6: {
          title: 'Click "Change Picture"',
          description: 'To upload or replace a photo, click the "Change Picture" button.',
          type: 'success'
        },
        step7: {
          title: 'Select Your Image',
          description: 'Choose a front or back image of the banknote from your device.',
          type: 'success'
        },
        step8: {
          title: 'Edit Image (Optional)',
          description: 'Adjust or crop the picture to fit the required display area. Then click the "Save" to confirm.',
          type: 'success'
        },
        step9: {
          title: 'Click "Update Item"',
          description: 'To finish, scroll to the bottom. Then click the "Update Item" button to apply the edits to your collection.',
          type: 'success'
        }
      }
    },
    suggestPicture: {
      title: 'How to Suggest a banknote image from Your Collection to the Main Catalogues',
      icon: '🖼️',
      steps: {
        step1: {
          title: 'Go to the Banknote Page',
          description: 'Navigate to the banknote page in your collection that contains the banknote image you want to suggest.',
          type: 'success'
        },
        step2: {
          title: 'Click "Suggest to Catalogues"',
          description: 'Above your uploaded banknote image, click the "Suggest to Catalogues" button. This submits your image for review by an administrator.',
          type: 'success'
        },
        step3: {
          title: 'Wait for Review',
          description: 'Your suggestion will be reviewed by the site\'s admin team. They may approve or reject your submission based on quality and clarity.',
          type: 'success'
        },
        step4: {
          title: 'Edit and Re-Suggest if Needed',
          description: 'If you edit or change the banknote image later, the system will allow you to suggest it again for catalogues inclusion.',
          type: 'success'
        }
      },
      note: {
        title: 'Best Picture Wins',
        description: 'Only the best-quality images are selected for the main catalogues. Admins may choose another user\'s banknote image if it\'s better suited.'
      }
    }
  };
  
  // Generate structured data
  const generateStructuredData = () => {
    return {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": title,
      "description": description,
      "url": "https://ottocollect.com/guide",
      "step": [
        ...Object.entries(sections.addBanknote.steps).map(([key, step]: [string, any]) => ({
          "@type": "HowToStep",
          "name": step.title,
          "text": step.description,
          "position": parseInt(key.replace('step', ''))
        })),
        ...Object.entries(sections.editBanknote.steps).map(([key, step]: [string, any]) => ({
          "@type": "HowToStep",
          "name": step.title,
          "text": step.description,
          "position": parseInt(key.replace('step', '')) + 6
        })),
        ...Object.entries(sections.suggestPicture.steps).map(([key, step]: [string, any]) => ({
          "@type": "HowToStep",
          "name": step.title,
          "text": step.description,
          "position": parseInt(key.replace('step', '')) + 15
        }))
      ],
      "about": {
        "@type": "Thing",
        "name": "OttoCollect Platform Guide",
        "description": "Comprehensive guide for using OttoCollect platform to manage Ottoman Empire banknote collections"
      }
    };
  };
  
  // Render a section
  const renderSection = (sectionKey) => {
    const section = sections[sectionKey];
    const stepEntries = Object.entries(section.steps);
    
    return `
      <div class="guide-card">
        <div class="guide-card-header">
          <h2 class="guide-section-title">
            <span class="guide-icon">${section.icon}</span>
            <span>${section.title}</span>
          </h2>
        </div>
        <div class="guide-card-content">
          <div class="guide-steps">
            ${stepEntries.map(([stepKey, step]: [string, any]) => {
              const isError = step.type === 'error';
              return `
                <div class="guide-step">
                  <div class="guide-step-content">
                    ${isError ? `
                      <svg class="guide-step-icon error" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                      </svg>
                    ` : `
                      <svg class="guide-step-icon success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    `}
                    <div class="guide-step-text">
                      <h3 class="guide-step-title">${step.title}</h3>
                      <p class="guide-step-description">${step.description}</p>
                    </div>
                  </div>
                  ${stepKey !== stepEntries[stepEntries.length - 1][0] ? '<div class="guide-separator"></div>' : ''}
                </div>
              `;
            }).join('')}
            
            ${section.note ? `
              <div class="guide-separator"></div>
              <div class="guide-note">
                <svg class="guide-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <div class="guide-note-content">
                  <h4 class="guide-note-title">ℹ️ ${section.note.title}</h4>
                  <p class="guide-note-description">${section.note.description}</p>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  };
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ottocollect.com/guide">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="512">
  <meta property="og:image:height" content="512">
  <meta property="og:image:alt" content="OttoCollect Guide">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://ottocollect.com/guide">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:creator" content="@OttoCollect">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://ottocollect.com/guide">
  <meta name="robots" content="index, follow">
  <link rel="alternate" hreflang="x-default" href="https://ottocollect.com/guide">
  
  <!-- Structured Data -->
  <script type="application/ld+json">
    ${JSON.stringify(generateStructuredData(), null, 2)}
  </script>
  
  <!-- CSS -->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f0;
      color: #333;
      line-height: 1.6;
      min-height: 100vh;
    }
    
    .guide-container {
      max-width: 896px;
      margin: 0 auto;
      padding: 32px 16px;
    }
    
    .guide-header {
      text-align: center;
      margin-bottom: 48px;
    }
    
    .guide-title {
      font-size: 2.5rem;
      font-weight: bold;
      color: #333;
      margin-bottom: 16px;
      font-family: serif;
    }
    
    .guide-subtitle {
      font-size: 1.125rem;
      color: #666;
    }
    
    .guide-card {
      background: white;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      margin-bottom: 32px;
      overflow: hidden;
    }
    
    .guide-card-header {
      padding: 32px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .guide-section-title {
      font-size: 1.25rem;
      font-weight: bold;
      color: #333;
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: serif;
    }
    
    .guide-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }
    
    .guide-card-content {
      padding: 32px;
    }
    
    .guide-steps {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    
    .guide-step {
      display: flex;
      flex-direction: column;
    }
    
    .guide-step-content {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    
    .guide-step-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      margin-top: 4px;
    }
    
    .guide-step-icon.success {
      color: #22c55e;
    }
    
    .guide-step-icon.error {
      color: #ef4444;
    }
    
    .guide-step-text {
      flex: 1;
    }
    
    .guide-step-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }
    
    .guide-step-description {
      color: #666;
      line-height: 1.6;
    }
    
    .guide-separator {
      height: 1px;
      background-color: #e5e7eb;
      margin: 24px 0;
      margin-left: 36px;
    }
    
    .guide-note {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      background-color: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      margin-top: 8px;
    }
    
    .guide-info-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      margin-top: 4px;
      color: #3b82f6;
    }
    
    .guide-note-content {
      flex: 1;
    }
    
    .guide-note-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }
    
    .guide-note-description {
      color: #666;
      font-size: 0.875rem;
    }
    
    .redirect-notice {
      text-align: center;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-top: 20px;
      color: #666;
    }
    
    .redirect-notice a {
      color: #8b4513;
      text-decoration: none;
    }
    
    .redirect-notice a:hover {
      text-decoration: underline;
    }
    
    @media (max-width: 768px) {
      .guide-container {
        padding: 20px 16px;
      }
      
      .guide-title {
        font-size: 2rem;
      }
      
      .guide-card-header,
      .guide-card-content {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="guide-container">
    <div class="guide-header">
      <h1 class="guide-title">User Guide</h1>
      <p class="guide-subtitle">Learn how to use OttoCollect effectively</p>
    </div>
    
    <div class="guide-sections">
      ${renderSection('addBanknote')}
      ${renderSection('editBanknote')}
      ${renderSection('suggestPicture')}
    </div>
    
    <div class="redirect-notice">
      <p>If you are not redirected automatically, <a href="/guide">click here to view the interactive version</a>.</p>
    </div>
  </div>
  
  <script>
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      setTimeout(() => {
        window.location.replace('/guide');
      }, 100);
    }
  </script>
</body>
</html>`;
}

function generateBlogPageHTML(blogPosts: any[] = []) {
  const title = 'OttoCollect Blog - Ottoman Empire Banknote News & Insights';
  const description = 'Latest news, insights and stories about Ottoman Empire banknotes — expert analysis, market trends and collector stories from the numismatic community.';
  const imageUrl = 'https://ottocollect.com/web-app-manifest-512x512.png';
  
  // Generate blog post cards HTML in masonry grid layout
  const generateBlogPostCards = () => {
    if (!blogPosts || blogPosts.length === 0) {
      return `
        <div class="no-posts">
          <p>No blog posts yet. Be the first to create one!</p>
        </div>
      `;
    }
    return blogPosts.map((post: any) => {
      const postUrl = `/blog-post/${post.id}`;
      const authorName = post.author?.username || post.author?.name || 'Anonymous';
      const authorAvatar = post.author?.avatar_url || post.author?.avatarUrl || '';
      const commentCount = post.commentCount || post.comment_count || 0;
      const createdDate = new Date(post.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const postTitle = post.title || 'Untitled Post';
      const postExcerpt = post.excerpt || (post.content ? post.content.substring(0, 150) + '...' : 'Blog post about Ottoman Empire banknotes');
      const mainImage = post.main_image_url || post.featured_image || post.image_url || '';
      
      return `
        <article class="blog-post-card" itemscope itemtype="https://schema.org/BlogPosting" onclick="window.location.href='${postUrl}'">
          ${mainImage ? `
            <div class="post-image-container">
              <img src="${mainImage}" alt="${postTitle}" class="post-image" itemprop="image">
            </div>
          ` : ''}
          <div class="post-header">
            <h3 class="post-title" itemprop="headline">${postTitle}</h3>
          </div>
          <div class="post-content">
            <p class="post-excerpt" itemprop="description">${postExcerpt}</p>
          </div>
          <div class="post-footer">
            <div class="post-author" itemprop="author" itemscope itemtype="https://schema.org/Person">
              <div class="author-avatar">
                ${authorAvatar ? `
                  <img src="${authorAvatar}" alt="${authorName}" class="avatar-img">
                ` : `
                  <div class="avatar-placeholder"></div>
                `}
              </div>
              <span class="author-name" itemprop="name">${authorName}</span>
            </div>
            <div class="post-meta">
              <time class="post-date" datetime="${post.created_at}" itemprop="datePublished">
                <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                ${createdDate}
              </time>
              <div class="comment-count" itemprop="interactionStatistic" itemscope itemtype="https://schema.org/InteractionCounter">
                <meta itemprop="interactionType" content="https://schema.org/CommentAction">
                <meta itemprop="userInteractionCount" content="${commentCount}">
                <svg class="comment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>${commentCount}</span>
              </div>
            </div>
          </div>
          <a href="${postUrl}" itemprop="url" style="display:none;">${escapeHtml(postTitle)}</a>
        </article>
      `;
    }).join('');
  };
  
  // Generate structured data for blog posts
  const generateStructuredData = () => {
    return {
      "@context": "https://schema.org",
      "@type": "Blog",
      "name": "OttoCollect Blog",
      "description": description,
      "url": "https://ottocollect.com/blog",
      "publisher": {
        "@type": "Organization",
        "name": "OttoCollect",
        "url": "https://ottocollect.com",
        "logo": {
          "@type": "ImageObject",
          "url": imageUrl
        }
      },
      "blogPost": blogPosts && blogPosts.length > 0 ? blogPosts.map((post: any) => ({
        "@type": "BlogPosting",
        "headline": post.title || 'Untitled Post',
        "description": post.excerpt || (post.content ? metaDescription(post.content, 160) : 'Blog post about Ottoman Empire banknotes'),
        "author": {
          "@type": "Person",
          "name": post.author?.username || post.author?.name || 'OttoCollect Team'
        },
        "datePublished": post.created_at,
        "dateModified": post.updated_at || post.created_at,
        "url": `https://ottocollect.com/blog-post/${post.id}`,
        "image": post.featured_image || post.main_image_url || post.image_url || imageUrl,
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": `https://ottocollect.com/blog-post/${post.id}`
        }
      })) : [],
      "about": {
        "@type": "Thing",
        "name": "Ottoman Empire Banknotes",
        "description": "Historical banknotes from the Ottoman Empire and successor countries, numismatic collecting, authentication, grading, market trends, and collector stories"
      },
      "keywords": "Ottoman Empire banknotes, Turkish catalog, banknote collecting, numismatics, historical currency, rare banknotes, collecting tips, market analysis, numismatic news"
    };
  };
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ottocollect.com/blog">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="512">
  <meta property="og:image:height" content="512">
  <meta property="og:image:alt" content="OttoCollect Blog">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://ottocollect.com/blog">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:creator" content="@OttoCollect">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://ottocollect.com/blog">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="alternate" hreflang="x-default" href="https://ottocollect.com/blog">

  <!-- Structured Data for Blog Posts -->
  <script type="application/ld+json">
    ${JSON.stringify(generateStructuredData(), null, 2)}
  </script>
  
  <!-- CSS matching Blog.tsx layout -->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #FBFBFB;
      color: #3C2415;
      line-height: 1.6;
      min-height: 100vh;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .hero-section {
      background: linear-gradient(135deg, #8b4513 0%, #a0522d 100%);
      padding: 48px 0;
      margin-bottom: 24px;
      position: relative;
      overflow: hidden;
    }
    
    .hero-section::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(139, 69, 19, 0.1) 0%, rgba(160, 82, 45, 0.1) 100%);
      z-index: -1;
    }
    
    .hero-content {
      text-align: center;
      position: relative;
      z-index: 10;
    }
    
    .hero-title {
      font-size: 2.5rem;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 8px;
      font-family: serif;
    }
    
    .hero-subtitle {
      font-size: 1rem;
      color: #555;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .main-content {
      padding: 20px 0;
    }
    
    .blog-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 32px;
    }
    
    .search-container {
      position: relative;
      width: 200px;
    }
    
    .search-input {
      width: 100%;
      padding: 8px 32px 8px 32px;
      border: 1px solid #D4CFCB;
      border-radius: 8px;
      font-size: 0.875rem;
      background: white;
    }
    
    .search-icon {
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: #6B7280;
    }
    
    .action-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: white;
      color: #3C2415;
      border: 1px solid #D4CFCB;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.3s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .action-button:hover {
      background: #F5F5F5;
    }
    
    .blog-posts-grid {
      columns: 1;
      column-gap: 24px;
      padding: 0 16px;
    }
    
    @media (min-width: 768px) {
      .blog-posts-grid {
        columns: 2;
      }
    }
    
    @media (min-width: 1024px) {
      .blog-posts-grid {
        columns: 3;
      }
    }
    
    .blog-post-card {
      break-inside: avoid;
      margin-bottom: 24px;
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
    }
    
    .blog-post-card:hover {
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }
    
    .post-image-container {
      position: relative;
      aspect-ratio: 16 / 9;
      overflow: hidden;
      background: #F3F4F6;
    }
    
    .post-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    
    .blog-post-card:hover .post-image {
      transform: scale(1.05);
    }
    
    .post-header {
      padding: 16px 16px 8px;
    }
    
    .post-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #3C2415;
      line-height: 1.4;
      margin-bottom: 0;
    }
    
    .post-content {
      padding: 0 16px;
      flex: 1;
    }
    
    .post-excerpt {
      font-size: 0.875rem;
      color: #6B7280;
      line-height: 1.6;
      margin-bottom: 16px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .post-footer {
      padding: 12px 16px;
      border-top: 1px solid #E5E7EB;
      background: #F9FAFB;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .post-author {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .author-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      overflow: hidden;
      background: #F3F4F6;
      flex-shrink: 0;
    }
    
    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .avatar-placeholder {
      width: 100%;
      height: 100%;
      background: #D1D5DB;
      border-radius: 50%;
    }
    
    .author-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: #3C2415;
    }
    
    .post-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .post-date {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: #6B7280;
    }
    
    .calendar-icon {
      width: 14px;
      height: 14px;
    }
    
    .comment-count {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: #6B7280;
    }
    
    .comment-icon {
      width: 16px;
      height: 16px;
    }
    
    .no-posts {
      text-align: center;
      padding: 48px 20px;
      color: #6B7280;
    }
    
    .redirect-notice {
      text-align: center;
      padding: 20px;
      background: #F8F9FA;
      border-radius: 8px;
      margin-top: 32px;
      color: #6B7280;
    }
    
    .redirect-notice a {
      color: #8B4513;
      text-decoration: none;
    }
    
    .redirect-notice a:hover {
      text-decoration: underline;
    }
    
    @media (max-width: 768px) {
      .hero-title {
        font-size: 2rem;
      }
      
      .blog-controls {
        flex-direction: column;
        gap: 12px;
      }
      
      .search-container {
        width: 100%;
        max-width: 300px;
      }
      
      .post-footer {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
      
      .post-meta {
        align-self: flex-end;
      }
    }
  </style>
</head>
<body>
  <!-- Hero Section -->
  <section class="hero-section">
    <div class="container">
      <div class="hero-content">
        <h1 class="hero-title"><span>Ottoman Empire Banknote Blog</span></h1>
        <p class="hero-subtitle">Discover insights, stories, and knowledge about banknote collecting</p>
      </div>
    </div>
  </section>

  <!-- Main Content -->
  <div class="main-content">
    <div class="container">
      <!-- Blog Controls -->
      <div class="blog-controls">
        <div class="search-container">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input type="search" class="search-input" placeholder="Search blog posts...">
        </div>
        <a href="/auth" class="action-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          Post
        </a>
      </div>

      <!-- Blog Posts Grid -->
      <div class="blog-posts-grid">
        ${generateBlogPostCards()}
      </div>
    </div>
  </div>

  <div class="redirect-notice">
    <p>If you are not redirected automatically, <a href="/blog">click here to view the interactive version</a>.</p>
  </div>

  <!-- No redirects for crawlers -->
  <script>
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      setTimeout(() => {
        window.location.replace('/blog');
      }, 100);
    }
  </script>
</body>
</html>`;
}
function generateForumPostHTML(post, comments = [], allPosts: any[] = []) {
  const imageUrl = post.image_url || 'https://ottocollect.com/web-app-manifest-512x512.png';
  const rawTitle = post.title || 'Forum discussion';
  const title = `${escapeHtml(rawTitle)} - OttoCollect Forum`;
  const commentCount = post.commentCount || 0;
  const authorName = post.author?.username || 'Anonymous';
  const authorAvatar = post.author?.avatar_url || '';
  // Strip HTML/URLs and trim to a SERP-safe length. If the post body is just a
  // bare link (common), fall back to a templated, descriptive sentence.
  const cleanBody = String(post.content || '').replace(/<[^>]*>/g, ' ').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
  const description = cleanBody.length > 20
    ? metaDescription(cleanBody, 155)
    : `Discussion of "${rawTitle}"${commentCount ? `, ${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}` : ''} on the OttoCollect Ottoman banknote forum.`;
  const createdDate = new Date(post.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  // DiscussionForumPosting structured data — was previously absent.
  const forumPostStructuredData = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: rawTitle,
    text: cleanBody || rawTitle,
    url: `https://ottocollect.com/forum-post/${post.id}`,
    datePublished: post.created_at,
    ...(post.updated_at ? { dateModified: post.updated_at } : {}),
    author: { "@type": "Person", name: authorName },
    ...(post.image_url ? { image: post.image_url } : {}),
    commentCount: commentCount,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/CommentAction",
      userInteractionCount: commentCount
    }
  };
  const forumPostBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://ottocollect.com/" },
      { "@type": "ListItem", position: 2, name: "Forum", item: "https://ottocollect.com/forum" },
      { "@type": "ListItem", position: 3, name: rawTitle, item: `https://ottocollect.com/forum-post/${post.id}` }
    ]
  };
  // Generate comments HTML
  const generateComments = (commentsList, depth = 0)=>{
    if (!commentsList || commentsList.length === 0) {
      return `
        <div class="no-comments">
          <p>No comments yet. Be the first to comment!</p>
        </div>
      `;
    }
    return commentsList.map((comment)=>{
      const commentAuthorName = comment.author?.username || 'Anonymous';
      const commentAuthorAvatar = comment.author?.avatar_url || '';
      const commentDate = new Date(comment.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const isReply = depth > 0;
      const marginLeft = isReply ? '20px' : '0';
      return `
        <div class="comment-item" style="margin-left: ${marginLeft};">
          <div class="comment-content">
            <div class="comment-header">
              <div class="comment-author">
                ${commentAuthorAvatar ? `
                  <img src="${commentAuthorAvatar}" alt="${commentAuthorName}" class="comment-avatar">
                ` : `
                  <div class="comment-avatar-placeholder"></div>
                `}
                <span class="comment-author-name">${commentAuthorName}</span>
                <span class="comment-separator">•</span>
                <span class="comment-date">${commentDate}</span>
                ${comment.isEdited ? `
                  <span class="comment-separator">•</span>
                  <span class="comment-edited">edited</span>
                ` : ''}
              </div>
            </div>
            <div class="comment-text">${comment.content}</div>
          </div>
          ${comment.replies && comment.replies.length > 0 ? `
            <div class="comment-replies">
              ${generateComments(comment.replies, depth + 1)}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://ottocollect.com/forum-post/${post.id}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${post.title}">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://ottocollect.com/forum-post/${post.id}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:creator" content="@OttoCollect">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://ottocollect.com/forum-post/${post.id}">
  <meta name="robots" content="${commentCount === 0 && cleanBody.length < 20 ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">
  <link rel="alternate" hreflang="x-default" href="https://ottocollect.com/forum-post/${post.id}">

  <!-- Structured Data -->
  <script type="application/ld+json">
${JSON.stringify(forumPostStructuredData, null, 2)}
  </script>
  <script type="application/ld+json">
${JSON.stringify(forumPostBreadcrumb, null, 2)}
  </script>

  <!-- CSS matching the exact layout from ForumPost.tsx -->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #FBFBFB;
      color: #3C2415;
      line-height: 1.6;
      min-height: 100vh;
    }
    
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .post-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    
    .back-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: transparent;
      color: #6B7280;
      border: none;
      border-radius: 6px;
      text-decoration: none;
      font-size: 0.875rem;
      transition: all 0.2s ease;
    }
    
    .back-button:hover {
      background: #F3F4F6;
      color: #374151;
    }
    
    .back-icon {
      width: 16px;
      height: 16px;
    }
    
    .main-post {
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    
    .post-content-wrapper {
      display: flex;
      gap: 12px;
    }
    
    .post-author-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
    
    .post-author-avatar-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #D1D5DB;
      flex-shrink: 0;
    }
    
    .post-details {
      flex: 1;
      min-width: 0;
    }
    
    .post-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    
    .post-author-name {
      font-weight: 500;
      font-size: 0.875rem;
      color: #3C2415;
    }
    
    .post-separator {
      font-size: 0.75rem;
      color: #6B7280;
    }
    
    .post-date {
      font-size: 0.75rem;
      color: #6B7280;
    }
    
    .post-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #3C2415;
      margin-bottom: 12px;
      line-height: 1.4;
      word-break: break-word;
    }
    
    .post-content {
      font-size: 0.875rem;
      line-height: 1.6;
      color: #3C2415;
      margin-bottom: 16px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    .post-images {
      margin-bottom: 16px;
    }
    
    .post-image {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin-bottom: 8px;
    }
    
    .comments-section {
      margin-bottom: 24px;
    }
    
    .comments-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .comments-icon {
      width: 16px;
      height: 16px;
    }
    
    .comments-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #3C2415;
    }
    
    .comment-form {
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    
    .comment-form-content {
      display: flex;
      gap: 12px;
    }
    
    .comment-form-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
    
    .comment-form-avatar-placeholder {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #D1D5DB;
      flex-shrink: 0;
    }
    
    .comment-form-details {
      flex: 1;
    }
    
    .comment-textarea {
      width: 100%;
      min-height: 80px;
      padding: 12px;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      font-size: 0.875rem;
      resize: none;
      margin-bottom: 12px;
    }
    
    .comment-submit {
      display: inline-flex;
      align-items: center;
      padding: 8px 16px;
      background: #8B4513;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    
    .comment-submit:hover {
      background: #7A3A0F;
    }
    
    .login-prompt {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      margin-bottom: 16px;
    }
    
    .login-prompt-text {
      font-size: 0.875rem;
      color: #6B7280;
    }
    
    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .comment-item {
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 16px;
    }
    
    .comment-content {
      display: flex;
      gap: 12px;
    }
    
    .comment-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
    
    .comment-avatar-placeholder {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #D1D5DB;
      flex-shrink: 0;
    }
    
    .comment-details {
      flex: 1;
      min-width: 0;
    }
    
    .comment-header {
      margin-bottom: 8px;
    }
    
    .comment-author {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .comment-author-name {
      font-weight: 500;
      font-size: 0.875rem;
      color: #3C2415;
    }
    
    .comment-separator {
      font-size: 0.75rem;
      color: #6B7280;
    }
    
    .comment-date {
      font-size: 0.75rem;
      color: #6B7280;
    }
    
    .comment-edited {
      font-size: 0.75rem;
      font-style: italic;
      color: #6B7280;
    }
    
    .comment-text {
      font-size: 0.875rem;
      line-height: 1.6;
      color: #3C2415;
      word-break: break-word;
    }
    
    .comment-replies {
      margin-top: 16px;
      padding-left: 20px;
      border-left: 2px solid #F3F4F6;
    }
    
    .no-comments {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 32px;
      text-align: center;
    }
    
    .no-comments p {
      font-size: 0.875rem;
      color: #6B7280;
    }
    
    .redirect-notice {
      text-align: center;
      padding: 20px;
      background: #F8F9FA;
      border-radius: 8px;
      margin-top: 20px;
      color: #6B7280;
    }
    
    .redirect-notice a {
      color: #8B4513;
      text-decoration: none;
    }
    
    .redirect-notice a:hover {
      text-decoration: underline;
    }
    
    @media (max-width: 768px) {
      .page-container {
        padding: 16px;
      }
      
      .post-content-wrapper {
        flex-direction: column;
      }
      
      .post-author-avatar,
      .post-author-avatar-placeholder {
        width: 32px;
        height: 32px;
      }
      
      .comment-content {
        flex-direction: column;
      }
      
      .comment-avatar,
      .comment-avatar-placeholder {
        width: 24px;
        height: 24px;
      }
      
      .comment-replies {
        padding-left: 12px;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Header with back button -->
    <div class="post-header">
      <a href="/forum" class="back-button">
        <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Forum
      </a>
    </div>

    <!-- Main Post -->
    <div class="main-post">
      <div class="post-content-wrapper">
        ${authorAvatar ? `
          <img src="${authorAvatar}" alt="${authorName}" class="post-author-avatar">
        ` : `
          <div class="post-author-avatar-placeholder"></div>
        `}
        
        <div class="post-details">
          <div class="post-meta">
            <span class="post-author-name">${authorName}</span>
            <span class="post-separator">•</span>
            <span class="post-date">${createdDate}</span>
          </div>
          
          <h1 class="post-title">${post.title}</h1>
          
          <div class="post-content">${post.content}</div>
          
          ${post.imageUrls && post.imageUrls.length > 0 ? `
            <div class="post-images">
              ${post.imageUrls.map((imageUrl)=>`
                <img src="${imageUrl}" alt="${escapeHtml(rawTitle)} — forum image" class="post-image">
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- Comments Section -->
    <div class="comments-section">
      <div class="comments-header">
        <svg class="comments-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <h2 class="comments-title">Comments (${commentCount})</h2>
      </div>

      <!-- Comment Form -->
      <div class="comment-form">
        <div class="comment-form-content">
          <div class="comment-form-avatar-placeholder"></div>
          <div class="comment-form-details">
            <textarea class="comment-textarea" placeholder="Write your comment..." disabled></textarea>
            <button class="comment-submit" disabled>Post Comment</button>
          </div>
        </div>
      </div>

      <!-- Comments List -->
      <div class="comments-list">
        ${generateComments(comments)}
      </div>
    </div>

    <!-- Related discussions: internal links so every forum post is reachable from others (SEO) -->
    ${(() => {
      const related = (allPosts || []).filter((p: any) => p && p.id !== post.id).slice(0, 6);
      if (related.length === 0) return '';
      return `
    <nav class="related-posts" style="max-width:800px;margin:32px auto 0;padding:0;">
      <h2 style="font-size:1.1rem;margin-bottom:12px;"><span>More discussions</span></h2>
      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:8px;">
        ${related.map((p: any) => `<li><a href="/forum-post/${p.id}" rel="related">${p.title}</a></li>`).join('')}
      </ul>
      <p style="margin-top:12px;"><a href="/forum">Browse all forum discussions</a></p>
    </nav>`;
    })()}
  </div>

  <div class="redirect-notice">
    <p>If you are not redirected automatically, <a href="/forum-post/${post.id}">click here to view the interactive version</a>.</p>
  </div>

  <!-- No redirects for crawlers -->
  <script>
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      setTimeout(() => {
        window.location.replace('/forum-post/${post.id}');
      }, 100);
    }
  </script>
</body>
</html>`;
}
function generateCountryPageHTML(countryData, banknotes) {
  const countryName = countryData?.name || 'Unknown Country';
  const encodedCountry = encodeURIComponent(countryName);
  const title = `${countryName} Banknotes Catalog | OttoCollect`;
  const description = `Explore ${banknotes?.length || 0} ${countryName} banknotes in the OttoCollect catalog — face values, Pick numbers, years, signatures, printers and detailed images.`;
  // Social-share image. The previous convention path /images/<slug>.jpg does
  // not exist (returned the SPA shell), so fall back to a real country image,
  // then the first banknote image, then the brand icon. No width/height is
  // declared so crawlers measure the real pixels.
  const socialImage = (countryData && (countryData.image_url || countryData.imageUrl))
    || (banknotes && banknotes[0] && (banknotes[0].front_picture_watermarked || banknotes[0].front_picture_thumbnail))
    || 'https://ottocollect.com/OttoCollectIcon.PNG';
  // Generate banknote cards HTML
  const generateBanknoteCards = ()=>{
    if (!banknotes || banknotes.length === 0) {
      return `
        <div class="no-banknotes">
          <h3>No banknotes found for ${countryName}</h3>
          <p>Try adjusting your search criteria or check back later for new additions.</p>
        </div>
      `;
    }
    return banknotes.map((banknote)=>{
      const imageUrl = banknote.front_picture_watermarked || banknote.front_picture_thumbnail || 'https://ottocollect.com/OttoCollectIcon.PNG';
      const banknoteUrl = `/catalog-banknote/${banknote.id}`;
      return `
          <div class="banknote-card" itemscope itemtype="https://schema.org/CreativeWork">
            <a href="${banknoteUrl}" class="banknote-link">
              <div class="banknote-image-container">
                <img src="${imageUrl}" alt="${banknote.face_value} ${countryName} banknote from ${banknote.gregorian_year || banknote.islamic_year || ''}" class="banknote-image" itemprop="image">
              </div>
              <div class="banknote-info">
                <h3 class="banknote-title" itemprop="name">${banknote.face_value} ${countryName}</h3>
                
                <!-- Core Details -->
                <div class="banknote-details-list">
                  ${banknote.extended_pick_number ? `<p class="banknote-detail"><strong>Extended Pick:</strong> ${banknote.extended_pick_number}</p>` : ''}
                  ${banknote.pick_number ? `<p class="banknote-detail"><strong>Pick Number:</strong> ${banknote.pick_number}</p>` : ''}
                  ${banknote.turk_catalog_number ? `<p class="banknote-detail"><strong>Turk Catalog:</strong> ${banknote.turk_catalog_number}</p>` : ''}
                  ${banknote.face_value ? `<p class="banknote-detail"><strong>Face Value:</strong> ${banknote.face_value}</p>` : ''}
                  ${banknote.country ? `<p class="banknote-detail"><strong>Country:</strong> ${banknote.country}</p>` : ''}
                  ${banknote.gregorian_year ? `<p class="banknote-detail"><strong>Gregorian Year:</strong> ${banknote.gregorian_year}</p>` : ''}
                  ${banknote.islamic_year ? `<p class="banknote-detail"><strong>Islamic Year:</strong> ${banknote.islamic_year}</p>` : ''}
                  ${banknote.sultan_name ? `<p class="banknote-detail"><strong>Sultan:</strong> ${banknote.sultan_name}</p>` : ''}
                  ${banknote.printer ? `<p class="banknote-detail"><strong>Printer:</strong> ${banknote.printer}</p>` : ''}
                  ${banknote.type ? `<p class="banknote-detail"><strong>Type:</strong> ${banknote.type}</p>` : ''}
                  ${banknote.category ? `<p class="banknote-detail"><strong>Category:</strong> ${banknote.category}</p>` : ''}
                  ${banknote.rarity ? `<p class="banknote-detail"><strong>Rarity:</strong> ${banknote.rarity}</p>` : ''}
                  ${banknote.security_element ? `<p class="banknote-detail"><strong>Security Element:</strong> ${banknote.security_element}</p>` : ''}
                  ${banknote.colors ? `<p class="banknote-detail"><strong>Colors:</strong> ${banknote.colors}</p>` : ''}
                  ${banknote.serial_numbering ? `<p class="banknote-detail"><strong>Serial Numbering:</strong> ${banknote.serial_numbering}</p>` : ''}
                  ${banknote.dimensions ? `<p class="banknote-detail"><strong>Dimensions:</strong> ${banknote.dimensions}</p>` : ''}
                  ${banknote.width_mm && banknote.height_mm ? `<p class="banknote-detail"><strong>Size:</strong> ${banknote.width_mm}mm × ${banknote.height_mm}mm</p>` : ''}
                  ${banknote.signatures_front ? `<p class="banknote-detail"><strong>Front Signatures:</strong> ${banknote.signatures_front}</p>` : ''}
                  ${banknote.signatures_back ? `<p class="banknote-detail"><strong>Back Signatures:</strong> ${banknote.signatures_back}</p>` : ''}
                  ${banknote.seal_names ? `<p class="banknote-detail"><strong>Seal Names:</strong> ${banknote.seal_names}</p>` : ''}
                  ${banknote.material ? `<p class="banknote-detail"><strong>Material:</strong> ${banknote.material}</p>` : ''}
                  ${banknote.watermark ? `<p class="banknote-detail"><strong>Watermark:</strong> ${banknote.watermark}</p>` : ''}
                  ${banknote.issuing_authority ? `<p class="banknote-detail"><strong>Issuing Authority:</strong> ${banknote.issuing_authority}</p>` : ''}
                  ${banknote.designers ? `<p class="banknote-detail"><strong>Designers:</strong> ${banknote.designers}</p>` : ''}
                  ${banknote.security_features ? `<p class="banknote-detail"><strong>Security Features:</strong> ${banknote.security_features}</p>` : ''}
                  ${banknote.series ? `<p class="banknote-detail"><strong>Series:</strong> ${banknote.series}</p>` : ''}
                  ${banknote.grade ? `<p class="banknote-detail"><strong>Grade:</strong> ${banknote.grade}</p>` : ''}
                  ${banknote.obverse_description ? `<p class="banknote-detail"><strong>Obverse Description:</strong> ${banknote.obverse_description}</p>` : ''}
                  ${banknote.reverse_description ? `<p class="banknote-detail"><strong>Reverse Description:</strong> ${banknote.reverse_description}</p>` : ''}
                </div>
                
                <!-- Descriptions -->
                ${banknote.banknote_description ? `<p class="banknote-description" itemprop="description"><strong>Description:</strong> ${banknote.banknote_description}</p>` : ''}
                ${banknote.historical_description ? `<p class="banknote-historical"><strong>Historical Context:</strong> ${banknote.historical_description}</p>` : ''}
              </div>
              <div itemprop="about" itemscope itemtype="https://schema.org/Thing" style="display:none;">
                <span itemprop="name">${banknote.face_value} ${countryName} banknote</span>
                ${banknote.country ? `<span itemprop="description">Historical banknote from ${banknote.country}</span>` : ''}
              </div>
            </a>
          </div>
        `;
    }).join('');
  };
  // Helper function to generate comprehensive banknote structured data
  const generateBanknoteItemData = (banknote) => {
    const imageUrl = banknote.front_picture_watermarked || 
                     banknote.front_picture_thumbnail || 
                     banknote.front_picture ||
                     'https://ottocollect.com/OttoCollectIcon.PNG';
    const backImageUrl = banknote.back_picture_watermarked || 
                         banknote.back_picture_thumbnail || 
                         banknote.back_picture;

    // Build images array with ImageObject schema
    const images = [];
    if (imageUrl) {
      images.push({
        "@type": "ImageObject",
        "url": imageUrl,
        "caption": `${banknote.face_value} ${countryName} banknote front side from ${banknote.gregorian_year || banknote.islamic_year || ''} - Pick ${banknote.extended_pick_number || banknote.pick_number || ''}`,
        "contentUrl": imageUrl
      });
    }
    if (backImageUrl) {
      images.push({
        "@type": "ImageObject",
        "url": backImageUrl,
        "caption": `${banknote.face_value} ${countryName} banknote back side from ${banknote.gregorian_year || banknote.islamic_year || ''} - Pick ${banknote.extended_pick_number || banknote.pick_number || ''}`,
        "contentUrl": backImageUrl
      });
    }

    // Build identifiers array
    const identifiers = [];
    if (banknote.extended_pick_number) {
      identifiers.push({
        "@type": "PropertyValue",
        "name": "Extended Pick",
        "value": banknote.extended_pick_number
      });
    }
    if (banknote.pick_number) {
      identifiers.push({
        "@type": "PropertyValue",
        "name": "Pick",
        "value": banknote.pick_number
      });
    }
    if (banknote.turk_catalog_number) {
      identifiers.push({
        "@type": "PropertyValue",
        "name": `${countryName} Catalog`,
        "value": banknote.turk_catalog_number
      });
    }

    // Fields to exclude from additionalProperty (already handled or system fields)
    const excludeFields = new Set([
      'id',
      'is_approved',
      'is_pending',
      'created_at',
      'updated_at',
      'user_id',
      'approved_by',
      'pending_by',
      'front_picture_watermarked',
      'front_picture_thumbnail',
      'back_picture_watermarked',
      'back_picture_thumbnail',
      'front_picture',
      'back_picture'
    ]);

    // Build additionalProperty array with all available fields
    const additionalProperty = [];
    
    // Core fields
    if (banknote.face_value) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Face Value",
        "value": banknote.face_value
      });
    }
    if (banknote.country) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Country",
        "value": banknote.country
      });
    }
    if (banknote.gregorian_year) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Gregorian Year",
        "value": banknote.gregorian_year.toString()
      });
    }
    if (banknote.islamic_year) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Islamic Year",
        "value": banknote.islamic_year.toString()
      });
    }
    if (banknote.sultan_name) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Sultan",
        "value": banknote.sultan_name
      });
    }
    if (banknote.printer) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Printer",
        "value": banknote.printer
      });
    }
    if (banknote.signatures_front) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Front Signatures",
        "value": banknote.signatures_front
      });
    }
    if (banknote.signatures_back) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Back Signatures",
        "value": banknote.signatures_back
      });
    }
    if (banknote.seal_names) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Seal Names",
        "value": banknote.seal_names
      });
    }
    if (banknote.material) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Material",
        "value": banknote.material
      });
    }
    if (banknote.dimensions) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Dimensions",
        "value": banknote.dimensions
      });
    }
    if (banknote.width_mm) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Width (mm)",
        "value": banknote.width_mm.toString()
      });
    }
    if (banknote.height_mm) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Height (mm)",
        "value": banknote.height_mm.toString()
      });
    }
    if (banknote.watermark) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Watermark",
        "value": banknote.watermark
      });
    }
    if (banknote.type) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Type",
        "value": banknote.type
      });
    }
    if (banknote.category) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Category",
        "value": banknote.category
      });
    }
    if (banknote.rarity) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Rarity",
        "value": banknote.rarity
      });
    }
    if (banknote.security_element) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Security Element",
        "value": banknote.security_element
      });
    }
    if (banknote.colors) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Colors",
        "value": banknote.colors
      });
    }
    if (banknote.serial_numbering) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Serial Numbering",
        "value": banknote.serial_numbering
      });
    }
    if (banknote.banknote_description) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Description",
        "value": banknote.banknote_description
      });
    }
    if (banknote.historical_description) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Historical Context",
        "value": banknote.historical_description
      });
    }
    if (banknote.obverse_description) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Obverse Description",
        "value": banknote.obverse_description
      });
    }
    if (banknote.reverse_description) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Reverse Description",
        "value": banknote.reverse_description
      });
    }
    if (banknote.series) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Series",
        "value": banknote.series
      });
    }
    if (banknote.grade) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Grade",
        "value": banknote.grade
      });
    }
    if (banknote.issuing_authority) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Issuing Authority",
        "value": banknote.issuing_authority
      });
    }
    if (banknote.designers) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Designers",
        "value": banknote.designers
      });
    }
    if (banknote.security_features) {
      additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Security Features",
        "value": banknote.security_features
      });
    }

    // Include any other fields dynamically
    for (const [key, value] of Object.entries(banknote)) {
      if (excludeFields.has(key) || value === null || value === undefined || value === '') {
        continue;
      }
      
      // Skip if already added
      if (additionalProperty.some(prop => prop.name.toLowerCase() === key.replace(/_/g, ' ').toLowerCase())) {
        continue;
      }

      // Skip arrays and objects (handled separately)
      if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        continue;
      }

      additionalProperty.push({
        "@type": "PropertyValue",
        "name": key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        "value": value.toString()
      });
    }

    return {
      "@type": "CreativeWork",
      "name": `${banknote.face_value || ''}, ${banknote.gregorian_year || banknote.islamic_year || ''} (${banknote.sultan_name || banknote.country || countryName})`,
      "url": `https://ottocollect.com/catalog-banknote/${banknote.id}`,
      "image": images.length > 0 ? images : undefined,
      "description": banknote.banknote_description || `${banknote.face_value} ${countryName} banknote from ${banknote.gregorian_year || banknote.islamic_year || 'historic period'}`,
      "identifier": identifiers.length > 0 ? identifiers : undefined,
      "isPartOf": {
        "@type": "Collection",
        "name": `${countryName} Banknotes`,
        "url": `https://ottocollect.com/catalog/${encodedCountry}`
      },
      "publisher": {
        "@type": "Organization",
        "name": "OttoCollect",
        "url": "https://ottocollect.com"
      },
      "additionalProperty": additionalProperty.length > 0 ? additionalProperty : undefined
    };
  };

  // ✅ Structured Data: CollectionPage + ItemList (per Google guidelines)
  // CollectionPage + ItemList. Each ListItem carries only a SLIM reference
  // (name, url, image) — not the full per-note property dump. The previous
  // version embedded every DB column per note here AND re-emitted 173 standalone
  // CreativeWork blocks (generatePerNoteStructuredData), producing a ~2 MB page
  // with ~725 KB of duplicated JSON-LD that exceeded Google's limits and added
  // zero ranking value. The rich per-banknote data lives on each banknote's own
  // detail page, where it belongs.
  const generateStructuredData = ()=>{
    const itemListElement = banknotes?.map((banknote, index)=>{
        const year = banknote.gregorian_year || banknote.islamic_year || '';
        const img = banknote.front_picture_watermarked || banknote.front_picture_thumbnail;
        const name = [banknote.face_value, year && `(${year})`].filter(Boolean).join(' ') || `${countryName} banknote`;
        return {
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "CreativeWork",
            name: `${name} ${countryName}`.trim(),
            url: `https://ottocollect.com/catalog-banknote/${banknote.id}`,
            ...(img ? { image: img } : {})
          }
        };
      }) || [];
    return {
      "@context": "https://schema.org",
      "@type": [
        "CollectionPage",
        "ItemList"
      ],
      name: `${countryName} Banknotes`,
      description: `Catalog of ${countryName} banknotes documented on OttoCollect.`,
      url: `https://ottocollect.com/catalog/${encodedCountry}`,
      numberOfItems: banknotes?.length || 0,
      itemListElement,
      isPartOf: {
        "@type": "WebSite",
        name: "OttoCollect Banknote Catalog",
        url: "https://ottocollect.com/catalog"
      },
      publisher: {
        "@type": "Organization",
        name: "OttoCollect",
        url: "https://ottocollect.com"
      }
    };
  };
  // Return final HTML
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="https://ottocollect.com/catalog/${encodedCountry}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="alternate" hreflang="x-default" href="https://ottocollect.com/catalog/${encodedCountry}">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ottocollect.com/catalog/${encodedCountry}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${socialImage}">
  <meta property="og:image:alt" content="${countryName} Banknote Catalog">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="https://ottocollect.com/catalog/${encodedCountry}">
  <meta property="twitter:title" content="${title}">
  <meta property="twitter:description" content="${description}">
  <meta property="twitter:image" content="${socialImage}">
  <meta property="twitter:creator" content="@OttoCollect">

  <!-- Schema.org: CollectionPage + ItemList (slim per-item references) -->
  <script type="application/ld+json">
    ${JSON.stringify(generateStructuredData(), null, 2)}
  </script>

  <!-- Styles -->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f0;
      color: #333;
      line-height: 1.6;
      min-height: 100vh;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .back-button {
      font-size: 24px;
      margin-right: 15px;
      color: #666;
      cursor: pointer;
      background: none;
      border: none;
      padding: 5px 10px;
    }
    
    .header h1 {
      font-size: 2rem;
      font-weight: bold;
      color: #222;
    }
    
    .stats {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    
    .stat-item {
      text-align: center;
    }
    
    .stat-number {
      font-size: 2rem;
      font-weight: bold;
      color: #8b4513;
      margin-bottom: 5px;
    }
    
    .stat-label {
      font-size: 0.9rem;
      color: #666;
    }
    
    .filter-section {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .filter-section h2 {
      font-size: 1.5rem;
      margin-bottom: 10px;
      color: #333;
    }
    
    .catalog-intro {
      background: white;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .catalog-intro h2 {
      font-size: 1.75rem;
      margin-bottom: 16px;
      color: #333;
    }
    
    .catalog-intro p {
      margin-bottom: 12px;
      color: #555;
      line-height: 1.7;
    }
    
    .banknotes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .banknote-card {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .banknote-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    
    .banknote-link {
      text-decoration: none;
      color: inherit;
      display: block;
    }
    
    .banknote-image-container {
      width: 100%;
      height: 200px;
      overflow: hidden;
      background: #f5f5f0;
    }
    
    .banknote-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    
    .banknote-info {
      padding: 16px;
    }
    
    .banknote-title {
      font-size: 1.2rem;
      font-weight: bold;
      margin-bottom: 8px;
      color: #222;
    }
    
    .banknote-year {
      font-size: 0.95rem;
      color: #666;
      margin-bottom: 5px;
    }
    
    .banknote-pick {
      font-size: 0.9rem;
      color: #8b4513;
      font-weight: 500;
      margin-bottom: 5px;
    }
    
    .banknote-sultan,
    .banknote-printer {
      font-size: 0.85rem;
      color: #555;
      margin-bottom: 5px;
    }
    
    .banknote-details-list {
      margin-top: 10px;
    }
    
    .banknote-detail {
      font-size: 0.85rem;
      color: #555;
      margin: 4px 0;
      line-height: 1.4;
    }
    
    .banknote-detail strong {
      color: #333;
      font-weight: 600;
      margin-right: 6px;
    }
    
    .banknote-description,
    .banknote-historical {
      font-size: 0.85rem;
      color: #666;
      margin-top: 12px;
      line-height: 1.5;
    }
    
    .banknote-description strong,
    .banknote-historical strong {
      color: #333;
      font-weight: 600;
      margin-right: 6px;
    }
    
    .banknote-list-detailed {
      background: white;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .banknote-list-detailed h2 {
      font-size: 1.5rem;
      margin-bottom: 16px;
      color: #333;
    }
    
    .banknote-list-detailed ul {
      list-style: none;
    }
    
    .banknote-list-detailed li {
      padding: 12px 0;
      border-bottom: 1px solid #eee;
      color: #555;
      line-height: 1.6;
    }
    
    .banknote-list-detailed li:last-child {
      border-bottom: none;
    }
    
    .banknote-list-detailed li strong {
      color: #333;
      font-weight: 600;
    }
    
    .redirect-notice {
      text-align: center;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-top: 20px;
      color: #666;
    }
    
    .redirect-notice a {
      color: #8b4513;
      text-decoration: none;
    }
    
    .redirect-notice a:hover {
      text-decoration: underline;
    }
    
    @media (max-width: 768px) {
      .banknotes-grid {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
      }
      
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <button class="back-button" onclick="window.history.back()">←</button>
      <h1><span>${countryName} Banknotes</span></h1>
    </div>

    <div class="stats">
      <div class="stats-grid">
        <div class="stat-item"><div class="stat-number">${banknotes?.length || 0}</div><div class="stat-label">Total Banknotes</div></div>
        <div class="stat-item"><div class="stat-number">${new Set(banknotes?.map((b)=>b.gregorian_year || b.islamic_year).filter(Boolean)).size || 0}</div><div class="stat-label">Different Years</div></div>
        <div class="stat-item"><div class="stat-number">${new Set(banknotes?.map((b)=>b.sultan_name).filter(Boolean)).size || 0}</div><div class="stat-label">Sultans</div></div>
        <div class="stat-item"><div class="stat-number">${new Set(banknotes?.map((b)=>b.printer).filter(Boolean)).size || 0}</div><div class="stat-label">Printers</div></div>
      </div>
    </div>

    <div class="filter-section">
      <h2>Filter Options</h2>
      <p>Use the interactive version to access advanced filtering, sorting, and search.</p>
    </div>

    <!-- Comprehensive Banknote Data for AI Crawlers (Plain Text Format) -->
    <section id="banknote-data-ai" style="background: #f9f9f9; padding: 24px; margin-bottom: 30px; border: 2px solid #ddd; border-radius: 8px;">
      <h2>Complete ${countryName} Banknote Catalog - All ${banknotes?.length || 0} Banknotes</h2>
      <p><strong>Total Banknotes:</strong> ${banknotes?.length || 0}</p>
      <div style="font-family: monospace; font-size: 14px; line-height: 1.8; background: white; padding: 20px; border-radius: 4px; overflow-x: auto;">
        ${banknotes?.map((banknote, index) => {
          const details = [];
          details.push(`Face Value: ${banknote.face_value || 'N/A'}`);
          details.push(`Country: ${banknote.country || countryName}`);
          details.push(`Gregorian Year: ${banknote.gregorian_year || 'N/A'}`);
          details.push(`Islamic Year: ${banknote.islamic_year || 'N/A'}`);
          details.push(`Extended Pick Number: ${banknote.extended_pick_number || 'N/A'}`);
          details.push(`Pick Number: ${banknote.pick_number || 'N/A'}`);
          details.push(`Turk Catalog Number: ${banknote.turk_catalog_number || 'N/A'}`);
          if (banknote.sultan_name) details.push(`Sultan: ${banknote.sultan_name}`);
          if (banknote.printer) details.push(`Printer: ${banknote.printer}`);
          if (banknote.type) details.push(`Type: ${banknote.type}`);
          if (banknote.category) details.push(`Category: ${banknote.category}`);
          if (banknote.rarity) details.push(`Rarity: ${banknote.rarity}`);
          if (banknote.security_element) details.push(`Security Element: ${banknote.security_element}`);
          if (banknote.colors) details.push(`Colors: ${banknote.colors}`);
          if (banknote.serial_numbering) details.push(`Serial Numbering: ${banknote.serial_numbering}`);
          if (banknote.dimensions) details.push(`Dimensions: ${banknote.dimensions}`);
          if (banknote.width_mm && banknote.height_mm) details.push(`Size: ${banknote.width_mm}mm × ${banknote.height_mm}mm`);
          if (banknote.signatures_front) details.push(`Front Signatures: ${banknote.signatures_front}`);
          if (banknote.signatures_back) details.push(`Back Signatures: ${banknote.signatures_back}`);
          if (banknote.seal_names) details.push(`Seal Names: ${banknote.seal_names}`);
          if (banknote.material) details.push(`Material: ${banknote.material}`);
          if (banknote.watermark) details.push(`Watermark: ${banknote.watermark}`);
          if (banknote.issuing_authority) details.push(`Issuing Authority: ${banknote.issuing_authority}`);
          if (banknote.designers) details.push(`Designers: ${banknote.designers}`);
          if (banknote.security_features) details.push(`Security Features: ${banknote.security_features}`);
          if (banknote.series) details.push(`Series: ${banknote.series}`);
          if (banknote.grade) details.push(`Grade: ${banknote.grade}`);
          if (banknote.obverse_description) details.push(`Obverse Description: ${banknote.obverse_description}`);
          if (banknote.reverse_description) details.push(`Reverse Description: ${banknote.reverse_description}`);
          if (banknote.banknote_description) details.push(`Description: ${banknote.banknote_description}`);
          if (banknote.historical_description) details.push(`Historical Context: ${banknote.historical_description}`);
          details.push(`URL: https://ottocollect.com/catalog-banknote/${banknote.id}`);
          return `\n\n=== Banknote ${index + 1} of ${banknotes.length} ===\n${details.join('\n')}\n`;
        }).join('') || 'No banknotes available'}
      </div>
    </section>

    <!-- Descriptive content for crawlers -->
    <div class="catalog-intro">
      <h2>${countryName} Banknote Collection</h2>
      <p>This catalog contains ${banknotes?.length || 0} historical banknotes from ${countryName}. Each banknote represents a piece of numismatic history from the Ottoman Empire period and successor countries. Browse through authentic banknotes with detailed information including face values, issuance years, Pick numbers, sultan names, printers, and historical context.</p>
      <p>The collection includes banknotes from various periods, featuring different denominations, rulers, and printing houses. Each banknote has been cataloged with comprehensive details including dimensions, security features, watermarks, seals, and signatures.</p>
    </div>

    <div class="banknotes-grid">${generateBanknoteCards()}</div>

    <!-- Detailed banknote list for crawlers -->
    <div class="banknote-list-detailed">
      <h2>Complete ${countryName} Banknote List</h2>
      <ul>
        ${banknotes?.map((banknote) => `
          <li>
            <strong>${banknote.face_value} ${countryName}</strong> - 
            Year: ${banknote.gregorian_year || banknote.islamic_year || 'Unknown'} - 
            Pick #${banknote.extended_pick_number || banknote.pick_number || 'Unknown'}${banknote.turk_catalog_number ? ` - Turk Catalog: ${banknote.turk_catalog_number}` : ''}${banknote.sultan_name ? ` - Sultan: ${banknote.sultan_name}` : ''}${banknote.printer ? ` - Printer: ${banknote.printer}` : ''}${banknote.type ? ` - Type: ${banknote.type}` : ''}${banknote.category ? ` - Category: ${banknote.category}` : ''}${banknote.rarity ? ` - Rarity: ${banknote.rarity}` : ''}${banknote.security_element ? ` - Security: ${banknote.security_element}` : ''}${banknote.colors ? ` - Colors: ${banknote.colors}` : ''}${banknote.dimensions ? ` - Dimensions: ${banknote.dimensions}` : ''}${banknote.width_mm && banknote.height_mm ? ` - Size: ${banknote.width_mm}mm × ${banknote.height_mm}mm` : ''}${banknote.signatures_front ? ` - Front Signatures: ${banknote.signatures_front}` : ''}${banknote.signatures_back ? ` - Back Signatures: ${banknote.signatures_back}` : ''}${banknote.seal_names ? ` - Seals: ${banknote.seal_names}` : ''}${banknote.material ? ` - Material: ${banknote.material}` : ''}${banknote.watermark ? ` - Watermark: ${banknote.watermark}` : ''}${banknote.issuing_authority ? ` - Issuing Authority: ${banknote.issuing_authority}` : ''}${banknote.designers ? ` - Designers: ${banknote.designers}` : ''}${banknote.security_features ? ` - Security Features: ${banknote.security_features}` : ''}${banknote.series ? ` - Series: ${banknote.series}` : ''}${banknote.grade ? ` - Grade: ${banknote.grade}` : ''}${banknote.banknote_description ? ` - Description: ${banknote.banknote_description.substring(0, 100)}...` : ''}${banknote.historical_description ? ` - Historical: ${banknote.historical_description.substring(0, 80)}...` : ''}
          </li>
        `).join('') || '<li>No banknotes available</li>'}
      </ul>
    </div>

    <div class="redirect-notice">
      <p>If you are not redirected automatically, <a href="/catalog/${encodedCountry}">click here to view the interactive version</a>.</p>
    </div>
  </div>

  <!-- Structured Data: Complete JSON-LD for all banknotes -->
  <script type="application/ld+json">
    ${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Complete ${countryName} Banknote Catalog",
      "description": "All ${banknotes?.length || 0} banknotes from ${countryName} with complete details",
      "numberOfItems": banknotes?.length || 0,
      "itemListElement": banknotes?.map((banknote, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "CreativeWork",
          "name": `${banknote.face_value} ${countryName} Banknote ${banknote.gregorian_year || banknote.islamic_year || ''}`,
          "url": `https://ottocollect.com/catalog-banknote/${banknote.id}`,
          "description": banknote.banknote_description || `Historical ${banknote.face_value} ${countryName} banknote from ${banknote.gregorian_year || banknote.islamic_year || 'historic period'}`,
          "identifier": [
            banknote.extended_pick_number && { "@type": "PropertyValue", "name": "Extended Pick Number", "value": banknote.extended_pick_number },
            banknote.pick_number && { "@type": "PropertyValue", "name": "Pick Number", "value": banknote.pick_number },
            banknote.turk_catalog_number && { "@type": "PropertyValue", "name": "Turk Catalog Number", "value": banknote.turk_catalog_number }
          ].filter(Boolean),
          "additionalProperty": [
            banknote.face_value && { "@type": "PropertyValue", "name": "Face Value", "value": banknote.face_value },
            banknote.country && { "@type": "PropertyValue", "name": "Country", "value": banknote.country },
            banknote.gregorian_year && { "@type": "PropertyValue", "name": "Gregorian Year", "value": banknote.gregorian_year.toString() },
            banknote.islamic_year && { "@type": "PropertyValue", "name": "Islamic Year", "value": banknote.islamic_year.toString() },
            banknote.sultan_name && { "@type": "PropertyValue", "name": "Sultan", "value": banknote.sultan_name },
            banknote.printer && { "@type": "PropertyValue", "name": "Printer", "value": banknote.printer },
            banknote.type && { "@type": "PropertyValue", "name": "Type", "value": banknote.type },
            banknote.category && { "@type": "PropertyValue", "name": "Category", "value": banknote.category },
            banknote.rarity && { "@type": "PropertyValue", "name": "Rarity", "value": banknote.rarity },
            banknote.security_element && { "@type": "PropertyValue", "name": "Security Element", "value": banknote.security_element },
            banknote.colors && { "@type": "PropertyValue", "name": "Colors", "value": banknote.colors },
            banknote.serial_numbering && { "@type": "PropertyValue", "name": "Serial Numbering", "value": banknote.serial_numbering },
            banknote.dimensions && { "@type": "PropertyValue", "name": "Dimensions", "value": banknote.dimensions },
            banknote.width_mm && banknote.height_mm && { "@type": "PropertyValue", "name": "Size", "value": `${banknote.width_mm}mm × ${banknote.height_mm}mm` },
            banknote.signatures_front && { "@type": "PropertyValue", "name": "Front Signatures", "value": banknote.signatures_front },
            banknote.signatures_back && { "@type": "PropertyValue", "name": "Back Signatures", "value": banknote.signatures_back },
            banknote.seal_names && { "@type": "PropertyValue", "name": "Seal Names", "value": banknote.seal_names },
            banknote.material && { "@type": "PropertyValue", "name": "Material", "value": banknote.material },
            banknote.watermark && { "@type": "PropertyValue", "name": "Watermark", "value": banknote.watermark },
            banknote.issuing_authority && { "@type": "PropertyValue", "name": "Issuing Authority", "value": banknote.issuing_authority },
            banknote.designers && { "@type": "PropertyValue", "name": "Designers", "value": banknote.designers },
            banknote.security_features && { "@type": "PropertyValue", "name": "Security Features", "value": banknote.security_features },
            banknote.series && { "@type": "PropertyValue", "name": "Series", "value": banknote.series },
            banknote.grade && { "@type": "PropertyValue", "name": "Grade", "value": banknote.grade },
            banknote.obverse_description && { "@type": "PropertyValue", "name": "Obverse Description", "value": banknote.obverse_description },
            banknote.reverse_description && { "@type": "PropertyValue", "name": "Reverse Description", "value": banknote.reverse_description },
            banknote.historical_description && { "@type": "PropertyValue", "name": "Historical Context", "value": banknote.historical_description }
          ].filter(Boolean)
        }
      })) || []
    }, null, 2)}
  </script>

  <script>
    // Only redirect regular users, not crawlers
    if (!navigator.userAgent.match(/bot|crawler|spider|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      setTimeout(() => {
        window.location.replace('/catalog/${encodedCountry}');
      }, 100);
    }
  </script>
</body>
</html>`;
}
function generateBlogPostHTML(post, comments = [], allPosts: any[] = []) {
  const hasRealImage = !!(post.featured_image || post.main_image_url);
  const imageUrl = post.featured_image || post.main_image_url || 'https://ottocollect.com/web-app-manifest-512x512.png';
  const rawTitle = post.title || 'Blog post';
  const title = `${escapeHtml(rawTitle)} - OttoCollect Blog`;
  const description = metaDescription(post.excerpt || post.content || `Blog post: ${rawTitle}`, 155);
  const authorName = post.author?.username || 'OttoCollect Team';
  const authorAvatar = post.author?.avatar_url || '';
  const createdDate = new Date(post.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const commentCount = post.commentCount || 0;
  // BlogPosting structured data — was previously absent on post pages.
  const blogPostStructuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: rawTitle,
    description: description,
    ...(hasRealImage ? { image: imageUrl } : {}),
    author: { "@type": "Person", name: authorName },
    publisher: {
      "@type": "Organization",
      name: "OttoCollect",
      logo: { "@type": "ImageObject", url: "https://ottocollect.com/web-app-manifest-512x512.png" }
    },
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://ottocollect.com/blog-post/${post.id}` },
    url: `https://ottocollect.com/blog-post/${post.id}`
  };
  const blogPostBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://ottocollect.com/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://ottocollect.com/blog" },
      { "@type": "ListItem", position: 3, name: rawTitle, item: `https://ottocollect.com/blog-post/${post.id}` }
    ]
  };
  // Generate comments HTML
  const generateComments = (commentsList)=>{
    if (!commentsList || commentsList.length === 0) {
      return `
        <div class="no-comments">
          <p>No comments yet. Be the first to comment!</p>
        </div>
      `;
    }
    return commentsList.map((comment)=>{
      const commentAuthorName = comment.author?.username || 'Anonymous';
      const commentAuthorAvatar = comment.author?.avatar_url || '';
      const commentDate = new Date(comment.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      return `
        <div class="comment-item">
          <div class="comment-content">
            <div class="comment-author-section">
              ${commentAuthorAvatar ? `
                <img src="${commentAuthorAvatar}" alt="${commentAuthorName}" class="comment-avatar">
              ` : `
                <div class="comment-avatar-placeholder"></div>
              `}
              <div class="comment-details">
                <div class="comment-header">
                  <span class="comment-author-name">${commentAuthorName}</span>
                  <span class="comment-date">${commentDate}</span>
                  ${comment.isEdited ? '<span class="comment-edited">(edited)</span>' : ''}
                </div>
                <div class="comment-text">${comment.content}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://ottocollect.com/blog-post/${post.id}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:alt" content="${escapeHtml(rawTitle)}">

  <!-- Twitter -->
  <meta name="twitter:card" content="${hasRealImage ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:url" content="https://ottocollect.com/blog-post/${post.id}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:creator" content="@OttoCollect">

  <!-- Canonical URL -->
  <link rel="canonical" href="https://ottocollect.com/blog-post/${post.id}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="alternate" hreflang="x-default" href="https://ottocollect.com/blog-post/${post.id}">

  <!-- Structured Data -->
  <script type="application/ld+json">
${JSON.stringify(blogPostStructuredData, null, 2)}
  </script>
  <script type="application/ld+json">
${JSON.stringify(blogPostBreadcrumb, null, 2)}
  </script>

  <!-- CSS matching the exact layout from BlogPost.tsx -->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #FBFBFB;
      color: #3C2415;
      line-height: 1.6;
      min-height: 100vh;
    }
    
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .post-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    
    .back-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: transparent;
      color: #6B7280;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .back-button:hover {
      background: #F3F4F6;
      color: #374151;
    }
    
    .back-icon {
      width: 20px;
      height: 20px;
    }
    
    .glass-card {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    .main-post {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    .post-content-wrapper {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    @media (min-width: 640px) {
      .post-content-wrapper {
        flex-direction: row;
        align-items: flex-start;
      }
    }
    
    .post-author-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      border: 2px solid #8B4513;
    }
    
    .post-author-avatar-placeholder {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #8B4513;
      color: #F5F5DC;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      flex-shrink: 0;
      border: 2px solid #8B4513;
    }
    
    .post-details {
      flex: 1;
      min-width: 0;
    }
    
    .post-meta {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 8px;
    }
    
    @media (min-width: 640px) {
      .post-meta {
        flex-direction: row;
        align-items: center;
        gap: 8px;
      }
    }
    
    .post-author-name {
      font-weight: 600;
      font-size: 1rem;
      color: #3C2415;
    }
    
    .post-date {
      font-size: 0.875rem;
      color: #6B7280;
      flex-shrink: 0;
    }
    
    .post-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #3C2415;
      margin-bottom: 16px;
      line-height: 1.4;
      word-break: break-word;
    }
    
    @media (min-width: 640px) {
      .post-title {
        font-size: 1.75rem;
      }
    }
    
    .post-content {
      font-size: 1rem;
      line-height: 1.6;
      color: #3C2415;
      margin-bottom: 16px;
      white-space: pre-line;
      word-break: break-word;
    }
    
    .post-image {
      margin-bottom: 16px;
    }
    
    .post-image img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }
    
    .comments-section {
      margin-bottom: 24px;
    }
    
    .comments-header {
      font-size: 1.25rem;
      font-weight: 600;
      color: #3C2415;
      margin-bottom: 16px;
    }
    
    .comment-form {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    .comment-form-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    @media (min-width: 640px) {
      .comment-form-content {
        flex-direction: row;
        align-items: flex-start;
      }
    }
    
    .comment-form-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      border: 2px solid #8B4513;
    }
    
    .comment-form-avatar-placeholder {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #8B4513;
      color: #F5F5DC;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      flex-shrink: 0;
      border: 2px solid #8B4513;
    }
    
    .comment-form-details {
      flex: 1;
      min-width: 0;
    }
    
    .comment-textarea {
      width: 100%;
      min-height: 100px;
      padding: 12px;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      font-size: 0.875rem;
      resize: none;
      margin-bottom: 12px;
    }
    
    .comment-submit {
      display: inline-flex;
      align-items: center;
      padding: 8px 16px;
      background: #8B4513;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    
    .comment-submit:hover {
      background: #7A3A0F;
    }
    
    .login-prompt {
      background: rgba(245, 245, 220, 0.3);
      border: 1px solid rgba(139, 69, 19, 0.1);
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      margin-bottom: 24px;
    }
    
    .login-prompt-text {
      font-size: 0.875rem;
      color: #6B7280;
    }
    
    .comments-container {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    .comments-list {
      background: rgba(245, 245, 220, 0.2);
      border-radius: 8px;
      border: 1px solid rgba(139, 69, 19, 0.1);
      padding: 16px;
    }
    
    .comment-item {
      margin-bottom: 12px;
    }
    
    .comment-item:last-child {
      margin-bottom: 0;
    }
    
    .comment-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    @media (min-width: 640px) {
      .comment-content {
        flex-direction: row;
        align-items: flex-start;
      }
    }
    
    .comment-author-section {
      display: flex;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }
    
    .comment-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      border: 2px solid #8B4513;
    }
    
    .comment-avatar-placeholder {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #8B4513;
      color: #F5F5DC;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      flex-shrink: 0;
      border: 2px solid #8B4513;
    }
    
    .comment-details {
      flex: 1;
      min-width: 0;
    }
    
    .comment-header {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 8px;
    }
    
    @media (min-width: 640px) {
      .comment-header {
        flex-direction: row;
        align-items: center;
        gap: 8px;
      }
    }
    
    .comment-author-name {
      font-weight: 600;
      font-size: 0.875rem;
      color: #3C2415;
    }
    
    .comment-date {
      font-size: 0.875rem;
      color: #6B7280;
      flex-shrink: 0;
    }
    
    .comment-edited {
      font-size: 0.75rem;
      font-style: italic;
      color: #6B7280;
      flex-shrink: 0;
    }
    
    .comment-text {
      font-size: 0.875rem;
      line-height: 1.6;
      color: #3C2415;
      word-break: break-word;
    }
    
    .no-comments {
      background: rgba(245, 245, 220, 0.2);
      border: 1px solid rgba(139, 69, 19, 0.1);
      border-radius: 8px;
      padding: 32px;
      text-align: center;
    }
    
    .no-comments p {
      font-size: 0.875rem;
      color: #6B7280;
    }
    
    .redirect-notice {
      text-align: center;
      padding: 20px;
      background: #F8F9FA;
      border-radius: 8px;
      margin-top: 20px;
      color: #6B7280;
    }
    
    .redirect-notice a {
      color: #8B4513;
      text-decoration: none;
    }
    
    .redirect-notice a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Header with back button -->
    <div class="post-header">
      <button class="back-button" onclick="window.history.back()">
        <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
    </div>

    <!-- Main Post -->
    <div class="main-post glass-card">
      <div class="post-content-wrapper">
        ${authorAvatar ? `
          <img src="${authorAvatar}" alt="${authorName}" class="post-author-avatar">
        ` : `
          <div class="post-author-avatar-placeholder">${authorName.charAt(0).toUpperCase()}</div>
        `}
        
        <div class="post-details">
          <div class="post-meta">
            <span class="post-author-name">${authorName}</span>
            <span class="post-date">${createdDate}</span>
          </div>
          
          <h1 class="post-title">${post.title}</h1>
          
          <div class="post-content">${post.content}</div>
          
          ${post.main_image_url ? `
            <div class="post-image">
              <img src="${post.main_image_url}" alt="${escapeHtml(rawTitle)}">
            </div>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- Comments Section -->
    <div class="comments-section">
      <h2 class="comments-header">Comments • ${commentCount}</h2>

      <!-- Comment Form -->
      <div class="comment-form glass-card">
        <div class="comment-form-content">
          <div class="comment-form-avatar-placeholder">U</div>
          <div class="comment-form-details">
            <textarea class="comment-textarea" placeholder="Add your comment..." disabled></textarea>
            <button class="comment-submit" disabled>Post Comment</button>
          </div>
        </div>
      </div>

      <!-- Comments Container -->
      <div class="comments-container glass-card">
        <div class="comments-list">
          ${generateComments(comments)}
        </div>
      </div>
    </div>

    <!-- Related articles: internal links so every blog post is reachable from others (SEO) -->
    ${(() => {
      const related = (allPosts || []).filter((p: any) => p && p.id !== post.id).slice(0, 6);
      if (related.length === 0) return '';
      return `
    <nav class="related-posts" style="max-width:800px;margin:32px auto 0;padding:0;">
      <h2 style="font-size:1.1rem;margin-bottom:12px;"><span>More articles</span></h2>
      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:8px;">
        ${related.map((p: any) => `<li><a href="/blog-post/${p.id}" rel="related">${p.title}</a></li>`).join('')}
      </ul>
      <p style="margin-top:12px;"><a href="/blog">Browse all blog articles</a></p>
    </nav>`;
    })()}
  </div>

  <div class="redirect-notice">
    <p>If you are not redirected automatically, <a href="/blog-post/${post.id}">click here to view the interactive version</a>.</p>
  </div>

  <!-- No redirects for crawlers -->
  <script>
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      setTimeout(() => {
        window.location.replace('/blog-post/${post.id}');
      }, 100);
    }
  </script>
</body>
</html>`;
}
function generateHomePageHTML(forumPosts, marketplaceItems1, countries) {
  const title = 'OttoCollect - Ottoman Empire Banknotes Catalog & Collectors Platform';
  const description = 'OttoCollect is a comprehensive catalog and management platform dedicated to collectors of Ottoman Empire banknotes and those from successor countries since 1840. Our mission is to document and preserve numismatic history while supporting a vibrant community of collectors across Turkey, Jordan, Egypt, Lebanon, Palestine, Syria, Israel, Bulgaria, Albania, and beyond. Collectors can track personal collections, share images, contribute to the catalog, and connect with enthusiasts worldwide.';
  // SERP-safe meta description (the long `description` stays for JSON-LD/body).
  const metaDesc = 'Catalog and collector platform for Ottoman Empire banknotes and successor states — Turkey, Egypt, Jordan, Syria, Bulgaria and more — since 1840. Track, trade and connect.';
  // Generate forum posts HTML
  const generateForumPosts = ()=>{
    if (!forumPosts || forumPosts.length === 0) {
      return `
        <div class="text-center py-12">
          <p class="text-gray-500">No forum posts available.</p>
        </div>
      `;
    }
    return forumPosts.slice(0, 3).map((post)=>{
      const postContent = post.content || 'No content available';
      const fullContent = postContent.length > 300 ? postContent.substring(0, 300) + '...' : postContent;
      return `
      <div class="forum-post-card" itemscope itemtype="https://schema.org/DiscussionForumPosting">
        <div class="post-header">
          <h3 class="post-title" itemprop="headline">${post.title || 'Untitled Post'}</h3>
          <div class="post-meta">
            <span class="post-author" itemprop="author" itemscope itemtype="https://schema.org/Person">
              <span itemprop="name">${post.author?.username || post.author_name || 'Anonymous'}</span>
            </span>
            <span class="post-date" itemprop="datePublished">${new Date(post.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div class="post-content" itemprop="text">
          ${fullContent}
        </div>
        <div class="post-stats">
          <span class="post-replies">${post.commentCount || post.reply_count || 0} replies</span>
        </div>
        <a href="/forum-post/${post.id}" itemprop="url" class="post-link">Read full discussion</a>
      </div>
    `;
    }).join('');
  };
  // Generate marketplace items HTML
  const generateMarketplaceItems = ()=>{
    if (!marketplaceItems1 || marketplaceItems1.length === 0) {
      return `
        <div class="text-center py-12">
          <p class="text-gray-500">No marketplace items available.</p>
        </div>
      `;
    }
    return marketplaceItems1.slice(0, 6).map((item)=>{
      const ci = item.collectionItem;
      if (!ci || !ci.banknote) return '';
      const bn = ci.banknote;
      const itemTitle = `${bn.denomination || ''} ${bn.country || ''}${bn.year ? `, ${bn.year}` : ''}`.trim() || 'Marketplace Item';
      const itemDescription = bn.description || `${itemTitle} - Authentic Ottoman Empire banknote`;
      const itemImage = ci.obverseImage || bn.imageUrls?.[0] || 'https://ottocollect.com/OttoCollectIcon.PNG';
      return `
      <div class="marketplace-item-card" itemscope itemtype="https://schema.org/Product">
        <div class="item-image">
          <img src="${itemImage}" alt="${itemTitle}" itemprop="image">
        </div>
        <div class="item-info">
          <h3 class="item-title" itemprop="name"><span>${itemTitle}</span></h3>
          <p class="item-description" itemprop="description">${itemDescription.length > 100 ? itemDescription.substring(0, 100) + '...' : itemDescription}</p>
          <p class="item-price" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
            <span itemprop="price">${ci.salePrice || 'Price on request'}</span>
            <span itemprop="priceCurrency">USD</span>
          </p>
          <p class="item-seller" itemprop="seller" itemscope itemtype="https://schema.org/Person">
            Seller: <span itemprop="name">${item.seller?.username || 'Anonymous'}</span>
          </p>
          ${ci.condition ? `<p class="item-condition" itemprop="itemCondition">Condition: ${ci.condition}</p>` : ''}
          <a href="${marketplaceItemPath(item)}" itemprop="url" class="item-link">View item details</a>
        </div>
      </div>
    `;
    }).join('');
  };
  // Generate countries list HTML
  const generateCountriesList = ()=>{
    // Use actual countries data if available, otherwise use defaults
    const availableCountries = countries && countries.length > 0 ? countries.map(c => c.name || c) : [];
    
    // Categorize countries if we have them, otherwise use defaults
    const middleEastCountries = availableCountries.length > 0 
      ? availableCountries.filter(c => ['Turkey', 'Egypt', 'Iraq', 'Israel', 'Jordan', 'Libya', 'Kuwait', 'Lebanon', 'Palestine', 'Saudi Arabia', 'Syria'].includes(c))
      : ['Turkey', 'Egypt', 'Iraq', 'Israel', 'Jordan', 'Libya', 'Kuwait', 'Lebanon', 'Palestine', 'Saudi Arabia', 'Syria'];
    
    const balkanCountries = availableCountries.length > 0
      ? availableCountries.filter(c => ['Albania', 'Bosnia & Herzegovina', 'Bulgaria', 'Kosovo', 'Macedonia', 'Montenegro', 'Serbia'].includes(c))
      : ['Albania', 'Bosnia & Herzegovina', 'Bulgaria', 'Kosovo', 'Macedonia', 'Montenegro', 'Serbia'];
    
    const allCountries = [...middleEastCountries, ...balkanCountries];
    
    return `
      <div class="countries-section">
        <div class="ottoman-empire-header">
          <h3>Ottoman Empire</h3>
          <p>Explore banknotes from successor countries of the Ottoman Empire, covering the Middle East, North Africa, and the Balkans from 1840 to 1948.</p>
        </div>
        
        <div class="regions">
          <div class="region">
            <h4>Middle East & North Africa</h4>
            <p class="region-description">Countries in the Middle East and North Africa that were part of or succeeded the Ottoman Empire, featuring unique historical banknotes from Turkey, Egypt, Jordan, Palestine, Syria, and more.</p>
            <div class="countries-grid">
              ${middleEastCountries.map((country)=>`
                <a href="/catalog/${encodeURIComponent(country)}" itemprop="url" class="country-card" itemscope itemtype="https://schema.org/CollectionPage">
                  <span itemprop="name">${country}</span>
                  <span class="country-link">${country} Banknotes</span>
                </a>
              `).join('')}
            </div>
          </div>
          
          <div class="region">
            <h4>Balkans</h4>
            <p class="region-description">Balkan countries that were part of the Ottoman Empire, including Albania, Bulgaria, Bosnia & Herzegovina, and others, each with distinct numismatic heritage.</p>
            <div class="countries-grid">
              ${balkanCountries.map((country)=>`
                <a href="/catalog/${encodeURIComponent(country)}" itemprop="url" class="country-card" itemscope itemtype="https://schema.org/CollectionPage">
                  <span itemprop="name">${country}</span>
                  <span class="country-link">${country} Banknotes</span>
                </a>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  };
  // Generate structured data
  const generateStructuredData = ()=>{
    // Forum posts structured data
    const forumPostsList = forumPosts && forumPosts.length > 0 ? forumPosts.slice(0, 3).map((post, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "DiscussionForumPosting",
        "headline": post.title || 'Untitled Post',
        "text": post.content ? (post.content.length > 500 ? post.content.substring(0, 500) + '...' : post.content) : 'No content available',
        "author": {
          "@type": "Person",
          "name": post.author?.username || post.author_name || 'Anonymous'
        },
        "datePublished": post.created_at,
        "url": `https://ottocollect.com/forum-post/${post.id}`,
        "interactionStatistic": {
          "@type": "InteractionCounter",
          "interactionType": "https://schema.org/ReplyAction",
          "userInteractionCount": post.commentCount || post.reply_count || 0
        }
      }
    })) : [];

    // Marketplace items structured data
    const marketplaceItemsList = marketplaceItems1 && marketplaceItems1.length > 0 ? marketplaceItems1.slice(0, 6).map((item, index) => {
      const ci = item.collectionItem || {};
      const bn = ci.banknote || {};
      const itemTitle = `${bn.denomination || ''} ${bn.country || ''}${bn.year ? `, ${bn.year}` : ''}`.trim() || 'Marketplace Item';
      return {
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "name": itemTitle,
        "description": bn.description || `${itemTitle} - Authentic Ottoman Empire banknote`,
        "image": ci.obverseImage || bn.imageUrls?.[0] || 'https://ottocollect.com/OttoCollectIcon.PNG',
        "offers": {
          "@type": "Offer",
          "price": ci.salePrice || '0',
          "priceCurrency": 'USD',
          "availability": item.status === 'sold' ? "https://schema.org/SoldOut" : "https://schema.org/InStock"
        },
        "seller": {
          "@type": "Person",
          "name": item.seller?.username || 'Anonymous'
        },
        "itemCondition": ci.condition ? `https://schema.org/${ci.condition}` : undefined,
        "url": `https://ottocollect.com${marketplaceItemPath(item)}`
      }
    };
    }) : [];

    // Countries structured data
    const countriesList = countries && countries.length > 0 ? countries.map((country, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "CollectionPage",
        "name": `${country.name || country} Banknotes`,
        "description": `Catalog of ${country.name || country} banknotes from the Ottoman Empire period (1840-1948)`,
        "url": `https://ottocollect.com/catalog/${encodeURIComponent(country.name || country)}`,
        "isPartOf": {
          "@type": "WebSite",
          "name": "OttoCollect Banknote Catalog",
          "url": "https://ottocollect.com/catalog/"
        }
      }
    })) : [];

    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "OttoCollect",
      "description": description,
      "url": "https://ottocollect.com/",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://ottocollect.com/catalog?search={search_term_string}",
        "query-input": "required name=search_term_string"
      },
      "mainEntity": [
        {
          "@type": "ItemList",
          "name": "Ottoman Empire Banknote Catalog",
          "description": "Comprehensive catalog of Ottoman Empire banknotes from successor countries including Turkey, Jordan, Egypt, Lebanon, Palestine, Syria, Israel, Bulgaria, Albania, and more",
          "numberOfItems": countries?.length || 0,
          "itemListElement": countriesList
        },
        {
          "@type": "ItemList",
          "name": "Latest Forum Discussions",
          "description": "Recent community discussions about Ottoman Empire banknotes, authentication, grading, and collecting",
          "numberOfItems": forumPostsList.length,
          "itemListElement": forumPostsList
        },
        {
          "@type": "ItemList",
          "name": "Featured Marketplace Items",
          "description": "Authentic Ottoman Empire banknotes available for purchase from verified sellers",
          "numberOfItems": marketplaceItemsList.length,
          "itemListElement": marketplaceItemsList
        }
      ],
      "about": {
        "@type": "Thing",
        "name": "Ottoman Empire Banknotes",
        "description": "Historical banknotes from the Ottoman Empire and its successor states (1840-1948), including Turkey, Middle Eastern countries, North African nations, and Balkan states"
      },
      "keywords": "Ottoman Empire banknotes, Turkish lira, historical currency, numismatics, banknote collection, Ottoman currency, rare banknotes, Turkey, Jordan, Egypt, Palestine, Syria, Lebanon, Bulgaria, Albania"
    };
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${metaDesc}">
  <link rel="canonical" href="https://ottocollect.com/">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="alternate" hreflang="x-default" href="https://ottocollect.com/">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ottocollect.com/">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:image" content="https://ottocollect.com/web-app-manifest-512x512.png">
  <meta property="og:image:width" content="512">
  <meta property="og:image:height" content="512">
  <meta property="og:image:alt" content="OttoCollect - Ottoman Empire Banknote Collectors Hub">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary">
  <meta property="twitter:url" content="https://ottocollect.com/">
  <meta property="twitter:title" content="${title}">
  <meta property="twitter:description" content="${metaDesc}">
  <meta property="twitter:image" content="https://ottocollect.com/web-app-manifest-512x512.png">
  <meta property="twitter:creator" content="@OttoCollect">

  <script type="application/ld+json">
    ${JSON.stringify(generateStructuredData(), null, 2)}
  </script>

  <!-- CSS to match the homepage layout -->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f0;
      color: #333;
      line-height: 1.6;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .hero-section {
      text-align: center;
      padding: 60px 20px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 12px;
      margin-bottom: 40px;
    }
    
    .hero-title {
      font-size: 3.5rem;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 20px;
      font-family: serif;
    }
    
    .hero-logo {
      width: 200px;
      height: 200px;
      margin: 20px auto;
      display: block;
    }
    
    .hero-subtitle {
      font-size: 1.8rem;
      color: #34495e;
      margin-bottom: 20px;
      font-family: serif;
    }
    
    .hero-description {
      font-size: 1.2rem;
      color: #7f8c8d;
      max-width: 600px;
      margin: 0 auto 30px;
    }
    
    .hero-buttons {
      display: flex;
      gap: 20px;
      justify-content: center;
      flex-wrap: wrap;
    }
    
    .btn {
      padding: 15px 30px;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      transition: all 0.3s ease;
    }
    
    .btn-primary {
      background: #8b4513;
      color: white;
    }
    
    .btn-primary:hover {
      background: #a0522d;
      transform: translateY(-2px);
    }
    
    .btn-secondary {
      background: transparent;
      color: #8b4513;
      border: 2px solid #8b4513;
    }
    
    .btn-secondary:hover {
      background: #8b4513;
      color: white;
    }
    
    .features-section {
      background: white;
      padding: 60px 20px;
      border-radius: 12px;
      margin-bottom: 40px;
    }
    
    .features-title {
      font-size: 2.5rem;
      text-align: center;
      margin-bottom: 20px;
      color: #2c3e50;
      font-family: serif;
    }
    
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 30px;
      margin-top: 40px;
    }
    
    .feature-card {
      padding: 30px;
      border-radius: 12px;
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      transition: all 0.3s ease;
      cursor: pointer;
    }
    
    .feature-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .feature-icon {
      width: 50px;
      height: 50px;
      background: #8b4513;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      color: white;
    }
    
    .feature-title {
      font-size: 1.3rem;
      font-weight: 600;
      margin-bottom: 15px;
      color: #2c3e50;
    }
    
    .feature-description {
      color: #7f8c8d;
      line-height: 1.6;
    }
    
    .section {
      margin: 60px 0;
    }
    
    .section-title {
      font-size: 2.2rem;
      text-align: center;
      margin-bottom: 30px;
      color: #2c3e50;
      font-family: serif;
    }
    
    .section-description {
      font-size: 1.125rem;
      text-align: center;
      color: #666;
      margin-bottom: 30px;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.6;
    }
    
    .forum-posts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    
    .forum-post-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e9ecef;
      transition: all 0.3s ease;
    }
    
    .forum-post-card:hover {
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    
    .post-title {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 10px;
      color: #2c3e50;
    }
    
    .post-meta {
      display: flex;
      gap: 15px;
      margin-bottom: 15px;
      font-size: 0.9rem;
      color: #7f8c8d;
    }
    
    .post-content {
      color: #5a6c7d;
      margin-bottom: 15px;
    }
    
    .post-stats {
      font-size: 0.9rem;
      color: #8b4513;
      font-weight: 600;
      margin-bottom: 10px;
    }
    
    .post-link {
      display: inline-block;
      color: #8b4513;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      margin-top: 10px;
    }
    
    .post-link:hover {
      text-decoration: underline;
    }
    
    .marketplace-items {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }
    
    .marketplace-item-card {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e9ecef;
      transition: all 0.3s ease;
    }
    
    .marketplace-item-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.1);
    }
    
    .item-image {
      width: 100%;
      height: 200px;
      overflow: hidden;
    }
    
    .item-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .item-info {
      padding: 15px;
    }
    
    .item-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 10px;
      color: #2c3e50;
    }
    
    .item-price {
      font-size: 1.2rem;
      font-weight: bold;
      color: #8b4513;
      margin-bottom: 5px;
    }
    
    .item-description {
      color: #5a6c7d;
      font-size: 0.9rem;
      margin-bottom: 10px;
      line-height: 1.5;
    }
    
    .item-condition {
      color: #7f8c8d;
      font-size: 0.85rem;
      margin-top: 5px;
    }
    
    .item-seller {
      font-size: 0.9rem;
      color: #7f8c8d;
      margin-bottom: 8px;
    }
    
    .item-link {
      display: inline-block;
      color: #8b4513;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      margin-top: 10px;
    }
    
    .item-link:hover {
      text-decoration: underline;
    }
    
    .countries-section {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e9ecef;
    }
    
    .ottoman-empire-header {
      background: #8b4513;
      color: white;
      padding: 30px;
      text-align: center;
      font-size: 1.8rem;
      font-weight: bold;
    }
    
    .regions {
      padding: 30px;
    }
    
    .region {
      margin-bottom: 30px;
    }
    
    .region h4 {
      font-size: 1.3rem;
      margin-bottom: 15px;
      color: #2c3e50;
      border-bottom: 2px solid #8b4513;
      padding-bottom: 10px;
    }
    
    .region-description {
      font-size: 1rem;
      color: #5a6c7d;
      margin-bottom: 20px;
      line-height: 1.6;
    }
    
    .countries-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
    }
    
    .country-card {
      padding: 15px;
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      text-align: center;
      transition: all 0.3s ease;
      font-weight: 500;
      display: block;
      text-decoration: none;
      color: inherit;
    }
    
    .country-card:hover {
      background: #8b4513;
      color: white;
      transform: translateY(-2px);
    }
    
    .country-link {
      font-size: 0.85rem;
      margin-top: 5px;
      opacity: 0.8;
    }
    
    .country-card:hover {
      cursor: pointer;
    }
    
    .country-card:hover .country-link {
      opacity: 1;
    }
    
    .cta-section {
      background: linear-gradient(135deg, #8b4513 0%, #a0522d 100%);
      color: white;
      padding: 60px 20px;
      text-align: center;
      border-radius: 12px;
      margin: 40px 0;
    }
    
    .cta-title {
      font-size: 2.5rem;
      margin-bottom: 20px;
      font-family: serif;
    }
    
    .cta-description {
      font-size: 1.2rem;
      margin-bottom: 30px;
      opacity: 0.9;
    }
    
    .redirect-notice {
      text-align: center;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-top: 20px;
      color: #7f8c8d;
    }
    
    .redirect-notice a {
      color: #8b4513;
      text-decoration: none;
    }
    
    .redirect-notice a:hover {
      text-decoration: underline;
    }
    
    @media (max-width: 768px) {
      .hero-title {
        font-size: 2.5rem;
      }
      
      .hero-buttons {
        flex-direction: column;
        align-items: center;
      }
      
      .features-grid {
        grid-template-columns: 1fr;
      }
      
      .countries-grid {
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      }
    }
    
    /* Footer Styles */
    .footer {
      background-color: #070504;
      color: #E5D0C3;
      margin-top: 60px;
      width: 100%;
    }
    
    .footer-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px 16px;
    }
    
    .footer-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 32px;
      padding: 20px 0;
    }
    
    @media (min-width: 768px) {
      .footer-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    
    @media (min-width: 1024px) {
      .footer-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    
    .footer-brand {
      width: 100%;
    }
    
    .footer-logo-container {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 32px;
      position: relative;
      margin-bottom: 16px;
    }
    
    .footer-logo-wrapper {
      position: absolute;
      top: -8px;
      left: 0;
    }
    
    .footer-logo {
      width: 56px;
      height: 56px;
      object-fit: contain;
      margin-top: -8px;
    }
    
    .footer-logo-spacer {
      width: 56px;
      height: 32px;
      flex-shrink: 0;
    }
    
    .footer-brand-title {
      font-size: 1.25rem;
      font-family: serif;
      font-weight: bold;
      color: #E5D0C3 !important;
      line-height: 32px;
      margin: 0;
    }
    
    .footer-brand-title span {
      color: #E5D0C3 !important;
    }
    
    .footer-description {
      color: #C3936B;
      font-size: 0.875rem;
      max-width: 448px;
      margin-top: 16px;
      text-align: left;
    }
    
    .footer-links-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 32px;
    }
    
    .footer-links-column {
      text-align: left;
    }
    
    .footer-links-title {
      font-size: 1.125rem;
      font-family: serif;
      font-weight: 600;
      color: #E5D0C3 !important;
      height: 32px;
      line-height: 32px;
      margin: 0 0 16px 0;
    }
    
    .footer-links-title span {
      color: #E5D0C3 !important;
    }
    
    .footer-nav {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .footer-link {
      display: block;
      color: #C3936B;
      text-decoration: none;
      transition: color 0.2s ease;
    }
    
    .footer-link:hover {
      color: #E5D0C3;
    }
    
    .footer-bottom {
      border-top: 1px solid rgba(86, 58, 39, 0.5);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: center;
      justify-content: space-between;
    }
    
    @media (min-width: 768px) {
      .footer-bottom {
        flex-direction: row;
      }
    }
    
    .footer-copyright {
      color: #C3936B;
      font-size: 0.875rem;
      text-align: left;
      margin: 0;
    }
    
    @media (min-width: 768px) {
      .footer-copyright {
        text-align: left;
      }
    }
    
    .footer-social {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .footer-social-link {
      color: #C3936B;
      text-decoration: none;
      transition: color 0.2s ease;
    }
    
    .footer-social-link:hover {
      color: #E5D0C3;
    }
    
    .footer-icon {
      width: 20px;
      height: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Hero Section -->
    <section class="hero-section">
      <h1 class="hero-title">OttoCollect</h1>
      <img src="/OttoCollectIconHome.PNG" alt="OttoCollect Logo" class="hero-logo">
      <h2 class="hero-subtitle">Discover the Legacy of Ottoman Empire and Its Successor Countries' Banknotes</h2>
      <p class="hero-description">
        Explore, collect, and trade historical banknotes from across regions and eras. Join our community of passionate collectors.
      </p>
      <div class="hero-buttons">
        <a href="/catalog" class="btn btn-primary">Explore Catalogues</a>
        <a href="/auth" class="btn btn-secondary">Join Community</a>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features-section">
      <h2 class="features-title">Complete Platform for Collectors</h2>
      <p class="hero-description">
        Everything you need to manage, showcase, and grow your Ottoman and its successor countries banknotes collection
      </p>
      <div class="features-grid">
        <div class="feature-card" onclick="window.location.href='/catalog'">
          <div class="feature-icon">📚</div>
          <h3 class="feature-title">Catalogues</h3>
          <p class="feature-description">
            Browse comprehensive catalogues of Ottoman and its successor countries/authorities banknotes with detailed information
          </p>
        </div>
        
        <div class="feature-card" onclick="window.location.href='/collection'">
          <div class="feature-icon">📖</div>
          <h3 class="feature-title">Collection Management</h3>
          <p class="feature-description">
            Organize and track your personal collection with advanced filtering and categorization tools
          </p>
        </div>
        
        <div class="feature-card" onclick="window.location.href='/marketplace'">
          <div class="feature-icon">💰</div>
          <h3 class="feature-title">Marketplace</h3>
          <p class="feature-description">
            Buy and sell authentic banknotes in our secure marketplace with 
            verified sellers.
          </p>
        </div>
        
        <div class="feature-card" onclick="window.location.href='/community'">
          <div class="feature-icon">👥</div>
          <h3 class="feature-title">Community</h3>
          <p class="feature-description">
            Connect with fellow collectors, share knowledge, and participate in discussions
          </p>
        </div>
      </div>
    </section>

    <!-- Forum Posts Section -->
    <section class="section">
      <h2 class="section-title">Community Discussions</h2>
      <p class="section-description">
        Join the conversation and share your knowledge with other collectors.
      </p>
      <div class="forum-posts">
        ${generateForumPosts()}
      </div>
    </section>

    <!-- Marketplace Section -->
    <section class="section">
      <h2 class="section-title">Marketplace Highlights</h2>
      <p class="section-description">
        Currently available items from our collector community
      </p>
      <div class="marketplace-items">
        ${generateMarketplaceItems()}
      </div>
    </section>

    <!-- Countries Section -->
    <section class="section">
      <h2 class="section-title">Our full list of banknotes catalogues and collections</h2>
      <p class="section-description">
        Ottoman Empire's successor countries/authorities since 1840 to the present days
      </p>
      ${generateCountriesList()}
    </section>

    <!-- Call to Action -->
    <section class="cta-section">
      <h2 class="cta-title">Join Our Community Today</h2>
      <p class="cta-description">
        Connect with fellow collectors, track your collection, and explore Ottoman banknotes history
      </p>
      <div class="hero-buttons">
        <a href="/catalog" class="btn btn-primary">Start Exploring</a>
        <a href="/auth" class="btn btn-secondary">Sign Up Now</a>
      </div>
    </section>
    
    <div class="redirect-notice">
      <p>If you are not redirected automatically, <a href="/">click here to view the interactive version</a>.</p>
    </div>
  </div>

  <!-- Footer -->
  <footer class="footer">
    <div class="footer-container">
      <div class="footer-grid">
        <!-- Brand Column -->
        <div class="footer-brand">
          <div class="footer-logo-container">
            <div class="footer-logo-wrapper">
              <img
                src="/favicon-96x96.png"
                alt="OttoCollect Logo"
                class="footer-logo"
                loading="lazy"
              />
            </div>
            <div class="footer-logo-spacer"></div>
            <h2 class="footer-brand-title">
              <span>OttoCollect</span>
            </h2>
          </div>
          <p class="footer-description">
            The premier platform for Ottoman Empire and successor states banknote collectors, numismatists, and historians.
          </p>
        </div>

        <!-- Quick Links and Help & Support container -->
        <div class="footer-links-grid">
          <!-- Quick Links -->
          <div class="footer-links-column">
            <h3 class="footer-links-title">
              <span>Quick Links</span>
            </h3>
            <nav class="footer-nav">
              <a href="/" class="footer-link">Home</a>
              <a href="/catalog" class="footer-link">Catalogues</a>
              <a href="/marketplace" class="footer-link">Marketplace</a>
              <a href="/collection" class="footer-link">My Collection</a>
              <a href="/blog" class="footer-link">Blog</a>
              <a href="/forum" class="footer-link">Forum</a>
            </nav>
          </div>

          <!-- Help & Support -->
          <div class="footer-links-column">
            <h3 class="footer-links-title">
              <span>Help & Support</span>
            </h3>
            <nav class="footer-nav">
              <a href="/guide" class="footer-link">User Guide</a>
              <a href="/contact" class="footer-link">Contact Us</a>
              <a href="/privacy" class="footer-link">Privacy Policy</a>
              <a href="/terms" class="footer-link">Terms of Service</a>
              <a href="/cookie-policy" class="footer-link">Cookie Policy</a>
              <a href="/about" class="footer-link">About Us</a>
            </nav>
          </div>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="footer-bottom">
        <p class="footer-copyright">
          © 2025 Otto Collect. All rights reserved.
        </p>
        <div class="footer-social">
          <a
            href="https://www.facebook.com/share/g/1An224PDXp/?mibextid=wwXIfr"
            target="_blank"
            rel="noopener noreferrer"
            class="footer-social-link"
          >
            <svg class="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
            </svg>
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            class="footer-social-link"
          >
            <svg class="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
            </svg>
          </a>
          <a
            href="https://www.instagram.com/ottocollect?igsh=MXdnN2M2bTEwZjlwZg%3D%3D&utm_source=qr"
            target="_blank"
            rel="noopener noreferrer"
            class="footer-social-link"
          >
            <svg class="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </a>
        </div>
      </div>
    </div>
  </footer>

  <!-- No redirects for crawlers - they should see the static content -->
  <script>
    // Only redirect regular users, not crawlers
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      // Small delay to ensure meta tags are processed by social media crawlers
      setTimeout(() => {
        window.location.replace('/');
      }, 100);
    }
  </script>
</body>
</html>`;
}
function generateAboutPageHTML() {
  const title = 'About OttoCollect - Ottoman Banknote Platform';
  const description = 'Discover OttoCollect, the catalog and collection platform for Ottoman Empire and successor-country banknotes since 1840 — meet our founders and our collector community.';
  const imageUrl = 'https://ottocollect.com/web-app-manifest-512x512.png';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ottocollect.com/about">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="512">
  <meta property="og:image:height" content="512">
  <meta property="og:image:alt" content="OttoCollect About">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://ottocollect.com/about">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:creator" content="@OttoCollect">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://ottocollect.com/about">
  <meta name="robots" content="index, follow">
  <link rel="alternate" hreflang="x-default" href="https://ottocollect.com/about">
  
  <!-- Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About OttoCollect",
    "description": "${description}",
    "url": "https://ottocollect.com/about",
    "mainEntity": {
      "@type": "Organization",
      "name": "OttoCollect",
      "description": "Premier platform for Ottoman Empire banknote collectors",
      "url": "https://ottocollect.com",
      "founder": [
        {
          "@type": "Person",
          "name": "Assaf U.",
          "description": "Assaf has been collecting banknotes for over 40 years and is a leading expert in Ottoman Empire and Palestinian banknotes. He founded this platform to share his knowledge and passion with fellow collectors worldwide."
        },
        {
          "@type": "Person", 
          "name": "Dror K.",
          "description": "Dror, a second-generation banknote collector specializing in banknotes of the Ottoman Empire and their historical context. He founded this platform to share his knowledge and passion with fellow collectors worldwide."
        }
      ],
      "knowsAbout": [
        "Ottoman Empire banknotes",
        "Numismatic history",
        "Historical currency collection",
        "Turkish lira paper money",
        "Rare banknotes"
      ]
    }
  }
  </script>

  <!-- CSS to match the about page layout -->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #f5f5f0 0%, #e8e3d3 100%);
      color: #333;
      line-height: 1.6;
      min-height: 100vh;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 48px;
    }
    
    .header h1 {
      font-size: 3rem;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 16px;
      font-family: serif;
    }
    
    .header .divider {
      width: 96px;
      height: 4px;
      background: #8b4513;
      margin: 0 auto;
      border-radius: 2px;
    }
    
    .section {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid #d4af37;
      border-radius: 12px;
      margin-bottom: 48px;
      padding: 32px;
    }
    
    .section h2 {
      font-size: 2rem;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: serif;
    }
    
    .section h2::before {
      content: "📚";
      font-size: 1.5rem;
    }
    
    .section h2.founders::before {
      content: "👥";
    }
    
    .section h2.features::before {
      content: "⚡";
    }
    
    .section h2.cta::before {
      content: "🚀";
    }
    
    .section p {
      font-size: 1.125rem;
      line-height: 1.8;
      color: #555;
      margin-bottom: 16px;
    }
    
    .founders-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 32px;
      margin-top: 32px;
    }
    
    .founder-card {
      background: linear-gradient(135deg, #f8f6f0 0%, #f0ede4 100%);
      border: 1px solid #d4af37;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .founder-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }
    
    .founder-avatar {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      border: 4px solid #d4af37;
      margin: 0 auto 16px;
      background: #e8e3d3;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: bold;
      color: #8b4513;
    }
    
    .founder-name {
      font-size: 1.25rem;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 8px;
    }
    
    .founder-description {
      color: #666;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-top: 32px;
    }
    
    .feature-card {
      background: linear-gradient(135deg, #f8f6f0 0%, #f0ede4 100%);
      border: 1px solid #d4af37;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      transition: transform 0.3s ease;
    }
    
    .feature-card:hover {
      transform: translateY(-2px);
    }
    
    .feature-icon {
      width: 48px;
      height: 48px;
      background: #8b4513;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      color: white;
      font-size: 1.5rem;
    }
    
    .feature-title {
      font-size: 1.25rem;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 8px;
      font-family: serif;
    }
    
    .feature-description {
      color: #666;
      font-size: 0.95rem;
    }
    
    .cta-section {
      text-align: center;
    }
    
    .cta-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: center;
      margin-top: 24px;
    }
    
    .cta-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: #8b4513;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      transition: background 0.3s ease;
    }
    
    .cta-button:hover {
      background: #6b3410;
    }
    
    .cta-button.secondary {
      background: white;
      color: #8b4513;
      border: 2px solid #8b4513;
    }
    
    .cta-button.secondary:hover {
      background: #8b4513;
      color: white;
    }
    
    .redirect-notice {
      text-align: center;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-top: 20px;
      color: #666;
    }
    
    .redirect-notice a {
      color: #8b4513;
      text-decoration: none;
    }
    
    .redirect-notice a:hover {
      text-decoration: underline;
    }
    
    @media (max-width: 768px) {
      .header h1 {
        font-size: 2.5rem;
      }
      
      .section {
        padding: 24px;
      }
      
      .founders-grid,
      .features-grid {
        grid-template-columns: 1fr;
      }
      
      .cta-buttons {
        flex-direction: column;
        align-items: center;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>About OttoCollect</h1>
      <div class="divider"></div>
    </div>

    <!-- About the Project Section -->
    <section class="section">
      <h2>About the Project</h2>
      <p>OttoCollect is a comprehensive catalog and collection management platform dedicated to collectors of banknotes from the Ottoman Empire and from countries or authorities that were formerly under Ottoman rule, dating back to 1840.</p>
      
      <p>Our educational mission is to document, share, and preserve the numismatic history of the Ottoman Empire and its successor countries and authorities. We aim to build a vibrant community of collectors across regions that share this historical heritage-including Turkey, Jordan, Egypt, Lebanon, Syria, Israel, Albania, Bulgaria, Montenegro, and more.</p>
      
      <p>We provide detailed information on Ottoman banknotes as well as banknotes issued by various countries that were once part of the Ottoman realm, from 1840 to the present day. This makes our platform uniquely valuable to collectors who often expand their collections to include Ottoman currencies after completing collections from their home countries.</p>
      
      <p>OttoCollect enables collectors to track their personal collections, share images, contribute to the catalog, engage in discussions, and connect with fellow enthusiasts worldwide. All of this makes OttoCollect an ideal platform for banknote collectors, numismatists, and historians.</p>
    </section>

    <!-- Founders Section -->
    <section class="section">
      <h2 class="founders">Meet Our Founders</h2>
      <div class="founders-grid">
        <div class="founder-card">
          <div class="founder-avatar">A</div>
          <div class="founder-name">Assaf U.</div>
          <div class="founder-description">
            Assaf has been collecting banknotes for over 40 years and is a leading expert in Ottoman Empire and Palestinian banknotes. He founded this platform to share his knowledge and passion with fellow collectors worldwide.
          </div>
        </div>
        
        <div class="founder-card">
          <div class="founder-avatar">D</div>
          <div class="founder-name">Dror K.</div>
          <div class="founder-description">
            Dror, a second-generation banknote collector specializing in banknotes of the Ottoman Empire and their historical context. He founded this platform to share his knowledge and passion with fellow collectors worldwide.
          </div>
        </div>
      </div>
    </section>

    <!-- Platform Features Section -->
    <section class="section">
      <h2 class="features">Comprehensive Platform for Collectors</h2>
      <div style="text-align: center; max-width: 768px; margin: 0 auto 48px;">
        <h3 style="font-size: 2rem; color: #2c3e50; margin-bottom: 16px;">Comprehensive Platform for Collectors</h3>
        <p style="font-size: 1.125rem; color: #666;">Everything you need to manage, showcase, and grow your Ottoman Empire and successor-country banknote collection.</p>
      </div>
      
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">🗄️</div>
          <div class="feature-title">Catalogues</div>
          <div class="feature-description">Browse comprehensive catalogues of Ottoman and its successor countries/authorities banknotes with detailed information</div>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">📚</div>
          <div class="feature-title">Collection Management</div>
          <div class="feature-description">Track your collection, wishlist, and display missing items with detailed information</div>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">💰</div>
          <div class="feature-title">Marketplace</div>
          <div class="feature-description">Buy and sell banknotes within the community through our integrated marketplace</div>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">👥</div>
          <div class="feature-title">Community</div>
          <div class="feature-description">View other personal collection. Connect interact and follow other collectors from around the world.</div>
        </div>
      </div>
    </section>

    <!-- Call to Action -->
    <section class="section cta-section">
      <h2 class="cta">Join Our Community</h2>
            <p style="font-size: 1.125rem; color: #666; margin-bottom: 24px;">
                Ready to explore the fascinating world of Ottoman Empire banknotes? Join our community of collectors and researchers today.
      </p>
      <div class="cta-buttons">
        <a href="/catalog" class="cta-button">
          📚 Explore Catalog
        </a>
        <a href="/auth" class="cta-button secondary">
          👥 Join Community
        </a>
      </div>
    </section>
    
    <div class="redirect-notice">
      <p>If you are not redirected automatically, <a href="/about">click here to view the interactive version</a>.</p>
    </div>
  </div>

  <!-- No redirects for crawlers - they should see the static content -->
  <script>
    // Only redirect regular users, not crawlers
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      // Small delay to ensure meta tags are processed by social media crawlers
      setTimeout(() => {
        window.location.replace('/about');
      }, 100);
    }
  </script>
</body>
</html>`;
}
function generateContactPageHTML() {
  const title = 'Contact OttoCollect - Ottoman Banknote Platform';
  const description = 'Contact OttoCollect, the premier platform for Ottoman Empire banknote collectors. Get support, ask questions, and connect with our team.';
  const imageUrl = 'https://ottocollect.com/web-app-manifest-512x512.png';
  // Generate structured data
  const generateStructuredData = ()=>{
    return {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      "name": "Contact OttoCollect",
      "description": description,
      "url": "https://ottocollect.com/contact",
      "mainEntity": {
        "@type": "Organization",
        "name": "OttoCollect",
        "email": "info@ottocollect.com",
        "url": "https://ottocollect.com",
        "sameAs": [
          "https://www.instagram.com/ottocollect"
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "customer service",
          "email": "info@ottocollect.com",
          "availableLanguage": [
            "English",
            "Arabic",
            "Turkish"
          ]
        }
      },
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://ottocollect.com/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Contact",
            "item": "https://ottocollect.com/contact"
          }
        ]
      }
    };
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ottocollect.com/contact">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="512">
  <meta property="og:image:height" content="512">
  <meta property="og:image:alt" content="OttoCollect Contact">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://ottocollect.com/contact">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:creator" content="@OttoCollect">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://ottocollect.com/contact">
  <meta name="robots" content="index, follow">
  <link rel="alternate" hreflang="x-default" href="https://ottocollect.com/contact">
  
  <!-- Structured Data -->
  <script type="application/ld+json">
    ${JSON.stringify(generateStructuredData(), null, 2)}
  </script>

  <!-- CSS to match the contact page layout -->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f0;
      color: #333;
      line-height: 1.6;
      min-height: 100vh;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .hero-section {
      background: linear-gradient(135deg, #8b4513 0%, #a0522d 100%);
      padding: 48px 0;
      margin-bottom: 40px;
      position: relative;
      overflow: hidden;
    }
    
    .hero-section::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(139, 69, 19, 0.1) 0%, rgba(160, 82, 45, 0.1) 100%);
      z-index: -1;
    }
    
    .hero-content {
      text-align: center;
      position: relative;
      z-index: 10;
    }
    
    .hero-title {
      font-size: 2.5rem;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 16px;
      font-family: serif;
    }
    
    .hero-description {
      font-size: 1.125rem;
      color: #555;
      max-width: 512px;
      margin: 0 auto;
    }
    
    .content-container {
      max-width: 1024px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .contact-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }
    
    .contact-card {
      background: white;
      border: 1px solid #d4af37;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      transition: box-shadow 0.3s ease;
    }
    
    .contact-card:hover {
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }
    
    .contact-icon {
      width: 32px;
      height: 32px;
      margin: 0 auto 16px;
      color: #8b4513;
    }
    
    .contact-title {
      font-size: 1.25rem;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 8px;
    }
    
    .contact-description {
      color: #666;
      margin-bottom: 16px;
      font-size: 0.95rem;
    }
    
    .contact-link {
      color: #8b4513;
      text-decoration: none;
      font-weight: 500;
    }
    
    .contact-link:hover {
      text-decoration: underline;
    }
    
    .contact-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: white;
      color: #8b4513;
      border: 2px solid #8b4513;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.3s ease;
      width: 100%;
      justify-content: center;
    }
    
    .contact-button:hover {
      background: #8b4513;
      color: white;
    }
    
    .help-card {
      background: white;
      border: 1px solid #d4af37;
      border-radius: 12px;
      padding: 24px;
      margin-top: 32px;
    }
    
    .help-title {
      font-size: 1.25rem;
      font-weight: bold;
      color: #2c3e50;
      text-align: center;
      margin-bottom: 16px;
    }
    
    .help-content {
      text-align: center;
    }
    
    .help-tip {
      color: #666;
      font-size: 0.9rem;
      margin-bottom: 8px;
    }
    
    .redirect-notice {
      text-align: center;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-top: 20px;
      color: #666;
    }
    
    .redirect-notice a {
      color: #8b4513;
      text-decoration: none;
    }
    
    .redirect-notice a:hover {
      text-decoration: underline;
    }
    
    @media (max-width: 768px) {
      .hero-title {
        font-size: 2rem;
      }
      
      .contact-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
      
      .contact-card {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <!-- Hero Section -->
  <section class="hero-section">
    <div class="container">
      <div class="hero-content">
        <h1 class="hero-title">Contact Us</h1>
        <p class="hero-description">
          We're here to help! Choose the best way to reach us based on your needs.
        </p>
      </div>
    </div>
  </section>

  <!-- Contact Content -->
  <div class="content-container">
    <div class="contact-grid">
      <!-- Email Section -->
      <div class="contact-card">
        <div class="contact-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        </div>
        <h3 class="contact-title">Email Support</h3>
        <p class="contact-description">
          Get in touch via email for general inquiries.
        </p>
        <a href="mailto:info@ottocollect.com" class="contact-link">
          info@ottocollect.com
        </a>
      </div>

      <!-- Social Media Section -->
      <div class="contact-card">
        <div class="contact-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        </div>
        <h3 class="contact-title">Social Media</h3>
        <p class="contact-description">
          Follow us on Instagram for updates, community highlights, and collector stories.
        </p>
        <a href="https://www.instagram.com/ottocollect" target="_blank" class="contact-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
          @ottocollect
        </a>
      </div>

      <!-- Direct Messaging Section -->
      <div class="contact-card">
        <div class="contact-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <h3 class="contact-title">Direct Messaging</h3>
        <p class="contact-description">
          Message our administrators directly for personalized assistance and community support.
        </p>
        <p class="contact-description" style="font-size: 0.85rem; color: #888;">
          Sign in to access direct messaging with our team members.
        </p>
      </div>
    </div>

    <!-- Help Section -->
    <div class="help-card">
      <h3 class="help-title">How We Can Help</h3>
      <div class="help-content">
        <p class="help-tip">• Email us for general inquiries, technical support, or feedback</p>
        <p class="help-tip">• Follow our Instagram for community updates and collector highlights</p>
        <p class="help-tip">• Message our administrators for personalized assistance and community support</p>
      </div>
    </div>
  </div>
  
  <div class="redirect-notice">
    <p>If you are not redirected automatically, <a href="/contact">click here to view the interactive version</a>.</p>
  </div>

  <!-- No redirects for crawlers - they should see the static content -->
  <script>
    // Only redirect regular users, not crawlers
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      // Small delay to ensure meta tags are processed by social media crawlers
      setTimeout(() => {
        window.location.replace('/contact');
      }, 100);
    }
  </script>
</body>
</html>`;
}
// Shared shell for the legal/info static pages (privacy, terms, cookie-policy)
// so each gets its own title/canonical/description and isn't a duplicate of the
// React shell. Pages render full content for crawlers; humans hit the React
// route via the normal Cloud Run server (no JS redirect from here).
function generateLegalPageHTML(opts: { slug: string; title: string; description: string; bodyHtml: string }) {
  const url = `https://ottocollect.com/${opts.slug}`;
  const safeDesc = opts.description.replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.title}</title>
  <meta name="description" content="${safeDesc}">
  <meta name="robots" content="index, follow">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${opts.title}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="https://ottocollect.com/web-app-manifest-512x512.png">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:url" content="${url}">
  <meta name="twitter:title" content="${opts.title}">
  <meta name="twitter:description" content="${safeDesc}">
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="x-default" href="${url}">
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": opts.title,
    "description": opts.description,
    "url": url,
    "isPartOf": { "@type": "WebSite", "name": "OttoCollect", "url": "https://ottocollect.com" }
  })}</script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#FBFBFB;color:#3C2415;line-height:1.7;padding:0 20px}
    .crumbs{max-width:900px;margin:24px auto 0;color:#6B7280;font-size:.9rem}
    .crumbs a{color:#8B4513;text-decoration:none}
    main{max-width:900px;margin:24px auto 48px;background:#fff;border-radius:12px;padding:48px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
    h1{font-size:2rem;margin-bottom:24px;color:#3C2415}
    h2{font-size:1.35rem;margin-top:32px;margin-bottom:12px;color:#5C3A1F}
    h3{font-size:1.1rem;margin-top:20px;margin-bottom:8px;color:#5C3A1F}
    p,li{margin-bottom:12px;color:#3C2415}
    ul{padding-left:24px;margin-bottom:16px}
    a{color:#8B4513}
    a:hover{text-decoration:underline}
    .related-legal{margin-top:40px;padding-top:20px;border-top:1px solid #E5E7EB;color:#6B7280;font-size:.9rem}
    .related-legal a{margin-right:14px}
  </style>
</head>
<body>
  <nav class="crumbs"><a href="/">Home</a> &middot; ${opts.title}</nav>
  <main>
    <h1><span>${opts.title}</span></h1>
    ${opts.bodyHtml}
    <p class="related-legal">
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms of Service</a>
      <a href="/cookie-policy">Cookie Policy</a>
      <a href="/contact">Contact</a>
      <a href="/about">About</a>
    </p>
  </main>
</body>
</html>`;
}

function generateCookiePolicyHTML() {
  return generateLegalPageHTML({
    slug: 'cookie-policy',
    title: 'Cookie Policy | OttoCollect',
    description: 'How OttoCollect uses essential cookies for authentication, security, session management and basic site functionality.',
    bodyHtml: `
      <h2><span>Essential Cookies</span></h2>
      <p>Our website uses only essential cookies that are strictly necessary for the operation of our website. These cookies enable core functionality such as user authentication and session management. Without these cookies, you would not be able to log in or maintain a secure session on our website.</p>

      <h2><span>What Are Cookies?</span></h2>
      <p>Cookies are small text files that are stored on your device when you visit a website. They help the website remember information about your visit, which can both make it work better and make your next visit easier.</p>

      <h2><span>How We Use Essential Cookies</span></h2>
      <p>We use essential cookies for the following purposes:</p>
      <ul>
        <li><strong>Authentication:</strong> To remember your login status and keep you signed in during your session.</li>
        <li><strong>Security:</strong> To protect user accounts and prevent unauthorized access.</li>
        <li><strong>Session Management:</strong> To maintain your session while you browse different pages of our website.</li>
        <li><strong>Basic Functionality:</strong> To ensure the website works correctly and maintains your preferences during your visit.</li>
      </ul>

      <h2><span>Cookie Duration</span></h2>
      <p>Our essential cookies are session cookies, which means they are temporary and are deleted when you close your browser. Some security-related cookies may persist for a longer period to maintain your secure session and remember your login status.</p>

      <h2><span>Managing Cookies</span></h2>
      <p>Since we only use essential cookies that are strictly necessary for the website to function, these cookies will always be active and cannot be disabled. However, you can set your browser to block or alert you about these cookies, but some parts of the website may not work properly.</p>

      <h2><span>Updates to This Policy</span></h2>
      <p>We may update this Cookie Policy from time to time to reflect changes in our practices or for operational, legal, or regulatory reasons. We encourage you to periodically review this page for the latest information on our cookie practices.</p>

      <h2><span>Contact Us</span></h2>
      <p>If you have any questions about our use of cookies, please contact us through our <a href="/contact">contact page</a>.</p>
    `
  });
}

function generatePrivacyPolicyHTML() {
  return generateLegalPageHTML({
    slug: 'privacy',
    title: 'Privacy Policy | OttoCollect',
    description: 'How OttoCollect collects, uses, stores and protects your personal data, including GDPR rights, cookies, marketplace data and account removal.',
    bodyHtml: `
      <p>Your privacy is important to us. This privacy statement explains how user (also "you", "your", "member") personal information is collected, used, secured and processed on OttoCollect (also "we", "us", "our"). Many parts of OttoCollect are freely accessible without the need for registration. In order to use some key features of OttoCollect (such as personal collection management), you must first complete the registration form. If you do not agree with our privacy policy you can't use our services.</p>

      <h2><span>Collection of information</span></h2>
      <p>Your personal data is stored in our database, server logs and their backups, as well as on cookies in your browser. OttoCollect does not collect any sensitive personal data.</p>

      <h3><span>Database</span></h3>
      <p>Most of your personal data is stored in our database. This includes your:</p>
      <ul>
        <li>first and last name (mandatory),</li>
        <li>email address (mandatory),</li>
        <li>Facebook or Google ID (if you use any of these services to log in).</li>
      </ul>
      <p>Any additional info you may provide while updating your personal page, writing forum posts and private messages, answering surveys and updating your personal inventory.</p>
      <p>If you use OttoCollect Marketplace, the following information is also stored:</p>
      <ul>
        <li>physical address (mandatory),</li>
        <li>chosen payment information (such as bank account number, PayPal/Skrill email address — mandatory for sellers).</li>
      </ul>

      <h3><span>Server logs</span></h3>
      <p>As is true of most websites, we gather certain information automatically and store it in log files. This information includes internet protocol (IP) addresses, user-agent identifier, referring pages and time stamp. Any request which generates an exception is saved in a specialized error log and may contain your OttoCollect user name. Any request which generates a fatal error is additionally sent via email to our development team.</p>

      <h3><span>Cookies</span></h3>
      <p>A cookie is a small text file that is stored on a user's computer for record-keeping purposes. We use both session ID cookies and persistent cookies. We use session cookies to make it easier for you to navigate OttoCollect. A session ID cookie expires when you close your browser. A persistent cookie remains on your hard drive for an extended period of time. We set a persistent cookie to make your session last longer, so you don't have to enter your password too often. You can remove persistent cookies by following directions provided by your Internet browser vendor.</p>
      <p>OttoCollect does not use cookies to store personally identifiable information such as your name or age.</p>
      <p>Third party vendors may use their own cookies to deliver ads related to OttoCollect, while you are surfing other websites. This is called Behavioral Advertising or Interest-Based Advertising. You can change your Google ad settings on <a href="https://adssettings.google.com" rel="nofollow">adssettings.google.com</a>. You can opt out of interest-based ads on <a href="http://optout.networkadvertising.org/" rel="nofollow">optout.networkadvertising.org</a>. We have no access to or control over these cookies.</p>
      <p>If you reject cookies, you may still use OttoCollect, but your ability to use some areas of OttoCollect will be limited. This privacy statement covers the use of cookies by OttoCollect only and does not cover the use of cookies by any third parties.</p>

      <h2><span>Use of information</span></h2>
      <p>We collect this data based on your consent to provide services related to creating and maintaining your personal collection, to better our services, and to resolve problems and bugs faster by analyzing server logs and automatic error reports. We do not use personal data to make automated decisions nor do we transfer it internationally.</p>
      <p>We use this information to analyze trends, to administer OttoCollect, to track users' movements around OttoCollect and to gather demographic information about our user base as a whole.</p>

      <h3><span>Personal Collection</span></h3>
      <p>Managing your personal collection and profile on OttoCollect may make inventory information you submit publicly available. In case your privacy settings have allowed your lists to be viewed publicly in the past, we cannot guarantee that nobody (be it crawlers or other users) has saved it.</p>

      <h3><span>Forums</span></h3>
      <p>If you use OttoCollect's forums or chat messages, you should be aware that any personally identifiable information you submit there can be read, collected, or used by other users of these forums, and could be used to send you unsolicited messages. We are not responsible for the personally identifiable information you choose to submit there.</p>

      <h2><span>Choice / Opt-out</span></h2>
      <p>We will send you strictly service-related announcements on rare occasions when it is necessary to do so. Generally, you may not opt out of these communications, which are not promotional in nature. If you do not wish to receive them, you have the option to deactivate or remove your account. Other email preferences may be set using the "Settings" option on the top bar of the site.</p>

      <h2><span>Third Parties</span></h2>
      <p>We DO NOT share personally identifiable information with third parties except for the rare cases described in this document. Do note that personal information you place on your profile or post on our forums may be publicly available. We reserve the right to disclose your personally identifiable information as required by law and when we believe that disclosure is necessary to protect our rights and/or to comply with a judicial proceeding, court order, or legal process served on OttoCollect.</p>

      <h3><span>Analytics</span></h3>
      <p>We use a third-party tracking service, Google Analytics, to track non-personally identifiable information about visitors to OttoCollect. This helps us monitor use of OttoCollect and improve our service. Please consult Google's privacy policy.</p>

      <h3><span>Integrated Payment Methods</span></h3>
      <p>If you choose to use an integrated payment method (such as PayPal) we disclose your email and chosen shipping address in order to make the transaction possible.</p>

      <h2><span>Links to Other Sites</span></h2>
      <p>OttoCollect contains links to other sites that are not owned or controlled by OttoCollect. Please be aware that we are not responsible for the privacy practices of such other sites. We encourage you to be aware when you leave OttoCollect and to read the privacy statements of each and every website that collects personally identifiable information. This privacy statement applies only to information collected by OttoCollect.</p>

      <h2><span>Security</span></h2>
      <p>We generally follow accepted industry standards to protect the personal information submitted to us, both during transmission and once we receive it. No method of transmission over the Internet, or method of electronic storage, is 100% secure; therefore, while we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.</p>

      <h2><span>You're in charge of your data</span></h2>
      <h3><span>Accessing and changing your data</span></h3>
      <p>All personal data you share with us can be found in your profile / my collection and your Marketplace. You can access and change this data any time.</p>
      <h3><span>Account removal</span></h3>
      <p>If you no longer want to use your OttoCollect account you can deactivate it. After deactivation your lists will be hidden but your collection will not be deleted and you will be able to get it back in case you change your mind. If you're sure that you want your account completely deleted, please contact our support at <a href="mailto:info@ottocollect.com">info@ottocollect.com</a>. This action cannot be undone and your collection will be lost forever.</p>

      <h2><span>User rights under GDPR</span></h2>
      <p>If GDPR applies to you there are some rights you are subject to. Some of them have already been addressed in this document.</p>
      <ul>
        <li>we inform you about collection and use of your personal data,</li>
        <li>you can review the information you provide us,</li>
        <li>you can change and complete your personal data,</li>
        <li>you can remove your account and we'll take care of the rest,</li>
        <li>processing of your data can be suppressed,</li>
        <li>you can download a digital copy of your data and ask us to transfer your data to another controller,</li>
        <li>you can ask us to stop contacting you with direct marketing,</li>
        <li>you don't have to agree to automatic processing of your personal data or transferring it to third parties for further processing.</li>
      </ul>

      <h2><span>Data retention</span></h2>
      <p>We retain your personal data for at least as long as your OttoCollect account is active. We may use the data you provided for a prolonged period of time, for example to finalize Marketplace transactions or when we detect suspected behavior which would otherwise expose other users to fraud. Following your account deactivation, you may request complete removal of your information by writing to <a href="mailto:info@ottocollect.com">info@ottocollect.com</a>.</p>

      <h2><span>Changes to this Privacy Statement</span></h2>
      <p>We reserve the right to modify this privacy statement at any time. Any such change will be announced by email.</p>

      <h2><span>Contact Us</span></h2>
      <p>If you have any questions or suggestions regarding our privacy policy, please contact us at <a href="mailto:info@ottocollect.com">info@ottocollect.com</a>.</p>
    `
  });
}

// Render Terms of Service from the English i18n pages.json fetched at runtime,
// so the SSR copy stays in sync with whatever the React app shows.
function generateTermsHTML(termsData: any) {
  const t = termsData || {};
  const sections: any = t.sections || {};
  const renderPoints = (sec: any) => {
    const out: string[] = [];
    if (sec.intro) out.push(`<p>${sec.intro}</p>`);
    for (const key of Object.keys(sec)) {
      if (key === 'title' || key === 'intro') continue;
      const v = sec[key];
      if (!v || typeof v !== 'object') {
        if (typeof v === 'string') out.push(`<p>${v}</p>`);
        continue;
      }
      // point with label/content
      if (typeof v.label === 'string' || typeof v.content === 'string') {
        const label = v.label ? `<strong>${v.label}</strong> ` : '';
        const content = v.content || '';
        out.push(`<p>${label}${content}</p>`);
        // optional nested list
        if (v.list && typeof v.list === 'object') {
          const items = Object.values(v.list).filter((x: any) => typeof x === 'string') as string[];
          if (items.length) out.push(`<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`);
        }
      } else {
        // generic nested object — flatten string leaves into a list
        const items = Object.values(v).filter((x: any) => typeof x === 'string') as string[];
        if (items.length) out.push(`<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`);
      }
    }
    return out.join('');
  };
  const body = Object.values(sections).map((sec: any) => {
    const title = sec.title || '';
    return `<h2><span>${title}</span></h2>${renderPoints(sec)}`;
  }).join('');
  return generateLegalPageHTML({
    slug: 'terms',
    title: (t.title || 'Terms of Service') + ' | OttoCollect',
    description: 'OttoCollect Terms of Service — rules for using the catalog, marketplace, forum, blog and API, plus user account, content and liability terms.',
    bodyHtml: body || '<p>Terms of Service unavailable.</p>'
  });
}

// Marketplace items live at two route shapes depending on whether the underlying
// banknote is unlisted. Every link to an item must pick the matching path.
function marketplaceItemPath(item) {
  return item?.collectionItem?.is_unlisted_banknote
    ? `/marketplace-item-unlisted/${item.id}`
    : `/marketplace-item/${item.id}`;
}
function generateMarketplaceHTML(marketplaceItems) {
  const title = 'Ottoman Banknote Marketplace - Buy & Sell Rare Currency | OttoCollect';
  const description = 'Browse and buy authentic Ottoman Empire banknotes listed by collectors worldwide. Compare prices, condition and grades on OttoCollect\'s secure marketplace.';
  const imageUrl = 'https://ottocollect.com/web-app-manifest-512x512.png';
  // CollectionPage + ItemList structured data for the listings (capped to the
  // items actually rendered, so the block stays lightweight).
  const buildStructuredData = () => {
    const items = (marketplaceItems || []).filter((i: any) => i?.collectionItem?.banknote);
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Ottoman Banknotes Marketplace",
      description,
      url: "https://ottocollect.com/marketplace",
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: items.length,
        itemListElement: items.map((item: any, index: number) => {
          const { collectionItem, seller, status } = item;
          const { banknote, salePrice } = collectionItem;
          return {
            "@type": "ListItem",
            position: index + 1,
            url: `https://ottocollect.com${marketplaceItemPath(item)}`,
            item: {
              "@type": "Product",
              name: `${banknote.denomination} ${banknote.country} Banknote ${banknote.year || ''}`.trim(),
              ...(collectionItem.obverseImage ? { image: collectionItem.obverseImage } : {}),
              offers: {
                "@type": "Offer",
                priceCurrency: "USD",
                price: salePrice,
                availability: (status || '').toLowerCase() === 'available' ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
                seller: { "@type": "Person", name: seller?.username || 'OttoCollect seller' }
              }
            }
          };
        })
      }
    };
  };
  // Generate marketplace items HTML
  const generateMarketplaceItems = ()=>{
    if (!marketplaceItems || marketplaceItems.length === 0) {
      return `
        <div class="empty-state">
          <h3>No Items Found</h3>
          <p>There are currently no items available in the marketplace</p>
          <button class="refresh-button">
            <svg class="refresh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M3 21v-5h5"/>
            </svg>
            Refresh
          </button>
        </div>
      `;
    }
    return marketplaceItems.map((item, index)=>{
      const { collectionItem, seller, status } = item;
      if (!collectionItem || !collectionItem.banknote) return '';
      const { banknote, condition, salePrice, publicNote, grade, grade_by } = collectionItem;
      const displayImage = collectionItem.obverseImage || '/placeholder.svg';
      const sellerName = seller?.username || 'Unknown';
      const sellerRank = seller?.rank || 'Newbie Collector';
      return `
        <div class="marketplace-item" onclick="window.location.href='${marketplaceItemPath(item)}'">
          <div class="item-image-container">
            <img src="${displayImage}" alt="${banknote.country} ${banknote.denomination} (${banknote.year})" class="item-image">
            <div class="price-badge">$${salePrice}</div>
            <div class="status-badge status-${status.toLowerCase()}">${status}</div>
          </div>
          
          <div class="item-content">
            <div class="item-header">
              <div class="item-title-section">
                <h3 class="item-title">
                  <a href="${marketplaceItemPath(item)}">${banknote.denomination} ${banknote.country}${banknote.year ? ` (${banknote.year})` : ''}${banknote.extendedPickNumber ? ` — Pick ${banknote.extendedPickNumber}` : ''}</a>
                </h3>
                <p class="item-subtitle">
                  ${banknote.country}${banknote.year ? `, ${banknote.year}` : ''}
                </p>
              </div>
              <div class="condition-badges">
                ${condition ? `<span class="condition-badge">${condition}</span>` : ''}
                ${grade ? `<span class="grade-badge">${grade_by ? `${grade_by} ` : ''}${grade}</span>` : ''}
              </div>
            </div>
            
            ${publicNote ? `
              <p class="item-note">${publicNote}</p>
            ` : ''}
            
            <div class="seller-info">
              <span class="seller-label">Seller:</span>
              <span class="seller-name">${sellerName}</span>
              <span class="seller-rank">${sellerRank}</span>
            </div>
          </div>
          
          <div class="item-footer">
            <button class="contact-seller-btn">Contact Seller</button>
          </div>
        </div>
      `;
    }).join('');
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ottocollect.com/marketplace">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="512">
  <meta property="og:image:height" content="512">
  <meta property="og:image:alt" content="OttoCollect Marketplace">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://ottocollect.com/marketplace">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:creator" content="@OttoCollect">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://ottocollect.com/marketplace">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="alternate" hreflang="x-default" href="https://ottocollect.com/marketplace">

  <!-- Structured Data: CollectionPage + ItemList of listings -->
  <script type="application/ld+json">
${JSON.stringify(buildStructuredData(), null, 2)}
  </script>

  <!-- CSS matching the exact layout from Marketplace.tsx -->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #FBFBFB;
      color: #3C2415;
      line-height: 1.6;
      min-height: 100vh;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .hero-section {
      background-color: #EFEBE9;
      padding: 48px 0;
      position: relative;
      overflow: hidden;
    }
    
    .hero-section::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(139, 69, 19, 0.1) 0%, rgba(139, 69, 19, 0.05) 100%);
      z-index: -1;
    }
    
    .hero-content {
      text-align: center;
      position: relative;
      z-index: 10;
    }
    
    .hero-title {
      font-size: 2.5rem;
      font-weight: bold;
      color: #3C2415;
      margin-bottom: 8px;
      font-family: serif;
    }
    
    .hero-subtitle {
      font-size: 1rem;
      color: #3C2415;
      max-width: 600px;
      margin: 0 auto;
    }
    
    .main-content {
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      margin: 40px auto 24px;
      padding: 24px;
      width: 95%;
      max-width: 1200px;
    }
    
    .filter-section {
      margin-bottom: 24px;
      padding: 16px;
      background: #F9FAFB;
      border-radius: 8px;
      border: 1px solid #E5E7EB;
    }
    
    .filter-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }
    
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .filter-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }
    
    .filter-select {
      padding: 8px 12px;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      background: white;
      font-size: 0.875rem;
    }
    
    .search-input {
      padding: 8px 12px;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      font-size: 0.875rem;
      min-width: 200px;
    }
    
    .sort-select {
      padding: 8px 12px;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      background: white;
      font-size: 0.875rem;
    }
    
    .marketplace-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 12px;
      padding-top: 8px;
    }
    
    .marketplace-item {
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .marketplace-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .item-image-container {
      position: relative;
      width: 100%;
      height: 200px;
      overflow: hidden;
    }
    
    .item-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    
    .marketplace-item:hover .item-image {
      transform: scale(1.05);
    }
    
    .price-badge {
      position: absolute;
      top: 0;
      left: 0;
      background: rgba(139, 69, 19, 0.9);
      color: white;
      padding: 8px 12px;
      font-weight: 600;
      font-size: 0.875rem;
    }
    
    .status-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .status-available {
      background: #10B981;
      color: white;
    }
    
    .status-reserved {
      background: #F59E0B;
      color: white;
    }
    
    .status-sold {
      background: #EF4444;
      color: white;
    }
    
    .item-content {
      padding: 16px;
    }
    
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    
    .item-title-section {
      flex: 1;
    }
    
    .item-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #3C2415;
      margin-bottom: 4px;
      font-family: serif;
    }
    
    .item-subtitle {
      font-size: 0.875rem;
      color: #6B7280;
    }
    
    .condition-badges {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: flex-end;
    }
    
    .condition-badge,
    .grade-badge {
      padding: 2px 6px;
      background: #F3F4F6;
      color: #374151;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .item-note {
      font-size: 0.875rem;
      color: #6B7280;
      margin-bottom: 8px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .seller-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.75rem;
      color: #6B7280;
    }
    
    .seller-label {
      font-weight: 500;
    }
    
    .seller-name {
      color: #3C2415;
    }
    
    .seller-rank {
      padding: 2px 6px;
      background: #8B4513;
      color: white;
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 500;
    }
    
    .item-footer {
      padding: 0 16px 16px;
    }
    
    .contact-seller-btn {
      width: 100%;
      padding: 8px 16px;
      background: #8B4513;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    
    .contact-seller-btn:hover {
      background: #7A3A0F;
    }
    
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      background: white;
      border-radius: 8px;
      border: 1px solid #E5E7EB;
    }
    
    .empty-state h3 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #3C2415;
      margin-bottom: 8px;
      font-family: serif;
    }
    
    .empty-state p {
      color: #6B7280;
      margin-bottom: 24px;
    }
    
    .refresh-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #8B4513;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    
    .refresh-button:hover {
      background: #7A3A0F;
    }
    
    .refresh-icon {
      width: 16px;
      height: 16px;
    }
    
    .redirect-notice {
      text-align: center;
      padding: 20px;
      background: #F8F9FA;
      border-radius: 8px;
      margin-top: 20px;
      color: #6B7280;
    }
    
    .redirect-notice a {
      color: #8B4513;
      text-decoration: none;
    }
    
    .redirect-notice a:hover {
      text-decoration: underline;
    }
    
    @media (max-width: 768px) {
      .hero-title {
        font-size: 2rem;
      }
      
      .main-content {
        width: auto;
        margin: 20px;
        padding: 16px;
      }
      
      .filter-controls {
        flex-direction: column;
        align-items: stretch;
      }
      
      .filter-group {
        width: 100%;
      }
      
      .search-input {
        min-width: auto;
        width: 100%;
      }
      
      .marketplace-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
      
      .item-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
      
      .condition-badges {
        flex-direction: row;
        align-items: center;
      }
    }
  </style>
</head>
<body>
  <!-- Hero Section -->
  <section class="hero-section">
    <div class="container">
      <div class="hero-content">
        <h1 class="hero-title">Marketplace</h1>
        <p class="hero-subtitle">Browse and purchase Ottoman banknotes from fellow collectors</p>
      </div>
    </div>
  </section>

  <!-- Main Content -->
  <div class="main-content">
    <!-- Filter Section -->
    <div class="filter-section">
      <div class="filter-controls">
        <div class="filter-group">
          <label class="filter-label">Search</label>
          <input type="text" class="search-input" placeholder="Search banknotes..." disabled>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Country</label>
          <select class="filter-select" disabled>
            <option>All Countries</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Category</label>
          <select class="filter-select" disabled>
            <option>All Categories</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Type</label>
          <select class="filter-select" disabled>
            <option>All Types</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Sort By</label>
          <select class="sort-select" disabled>
            <option>Newest Listed</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Oldest Listed</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Marketplace Items Grid -->
    <div class="marketplace-grid">
      ${generateMarketplaceItems()}
    </div>
  </div>
  
  <div class="redirect-notice">
    <p>If you are not redirected automatically, <a href="/marketplace">click here to view the interactive version</a>.</p>
  </div>

  <!-- No redirects for crawlers -->
  <script>
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      setTimeout(() => {
        window.location.replace('/marketplace');
      }, 100);
    }
  </script>
</body>
</html>`;
}
function generateMarketplaceItemHTML(marketplaceItem, allItems: any[] = []) {
  const { collectionItem, seller, status } = marketplaceItem;
  if (!collectionItem || !collectionItem.banknote) return '';
  const { banknote, condition, salePrice, publicNote, grade, grade_by, grade_condition_description, obverseImage, reverseImage } = collectionItem;
  const selfPath = marketplaceItemPath(marketplaceItem);
  const sellerName = seller?.username || 'Unknown';
  const sellerAvatar = seller?.avatar_url || '';
  const sellerRank = seller?.rank || 'Newbie Collector';
  // Price stays out of the <title> (volatile -> stale SERP snippets); it lives
  // in the description and the Offer JSON-LD where it's allowed to change.
  const pickRef = banknote.extendedPickNumber || banknote.extended_pick_number || banknote.pick_number;
  const title = `${banknote.denomination} ${banknote.country} Banknote ${banknote.year}${pickRef ? ` (P-${pickRef})` : ''} | OttoCollect`;
  const condGrade = [condition && `Condition: ${condition}`, grade && `Grade: ${grade}`].filter(Boolean).join(', ');
  const description = metaDescription(`Buy this authentic ${banknote.denomination} ${banknote.country} banknote from ${banknote.year}${pickRef ? ` (Pick #${pickRef})` : ''} for $${salePrice} on OttoCollect.${condGrade ? ` ${condGrade}.` : ''} Offered by ${sellerName}.`);
  const imageUrl = obverseImage || banknote.imageUrls?.[0] || 'https://ottocollect.com/web-app-manifest-512x512.png';
  const isAvailable = (status || '').toLowerCase() === 'available';
  // Product + Offer + breadcrumb structured data — the highest-value SEO signal
  // for a commerce listing. Was previously absent entirely.
  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${banknote.denomination} ${banknote.country} Banknote ${banknote.year}`.trim(),
    image: [obverseImage || banknote.imageUrls?.[0], reverseImage || banknote.imageUrls?.[1]].filter(Boolean),
    description: description,
    category: "Collectible Banknotes",
    ...(pickRef ? { productID: `Pick-${pickRef}`, sku: String(pickRef) } : {}),
    ...(banknote.country ? { brand: { "@type": "Brand", name: banknote.country } } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: salePrice,
      availability: isAvailable ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      url: `https://ottocollect.com${selfPath}`,
      ...(condition || grade ? { itemCondition: "https://schema.org/UsedCondition" } : {}),
      seller: { "@type": "Person", name: sellerName }
    }
  };
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Marketplace", item: "https://ottocollect.com/marketplace" },
      { "@type": "ListItem", position: 2, name: `${banknote.country} Banknotes`, item: `https://ottocollect.com/catalog/${encodeURIComponent(banknote.country || '')}` },
      { "@type": "ListItem", position: 3, name: title, item: `https://ottocollect.com${selfPath}` }
    ]
  };
  // Generate images HTML
  const generateImages = ()=>{
    const displayImages = [
      obverseImage || banknote.imageUrls?.[0],
      reverseImage || banknote.imageUrls?.[1]
    ].filter(Boolean);
    if (displayImages.length === 0) {
      return `
        <div class="no-images">
          <p>No images available</p>
        </div>
      `;
    }
    if (displayImages.length === 2) {
      return `
        <div class="images-grid">
          ${displayImages.map((url, index)=>`
            <div class="image-container">
              <img src="${url}" alt="${banknote.denomination} banknote from ${banknote.country}, issued in ${banknote.year}" class="banknote-image">
            </div>
          `).join('')}
        </div>
      `;
    }
    return `
      <div class="images-stack">
        ${displayImages.map((url, index)=>`
          <div class="image-container">
            <img src="${url}" alt="${banknote.denomination} banknote from ${banknote.country}, issued in ${banknote.year}" class="banknote-image">
          </div>
        `).join('')}
      </div>
    `;
  };
  // Generate banknote details table (simplified version of BanknoteCatalogDetailMinimized)
  const generateBanknoteDetails = ()=>{
    const details = [];
    if (banknote.face_value) details.push([
      'Face Value',
      banknote.face_value
    ]);
    if (banknote.country) details.push([
      'Country',
      banknote.country
    ]);
    if (banknote.gregorian_year) details.push([
      'Gregorian Year',
      banknote.gregorian_year
    ]);
    if (banknote.islamic_year) details.push([
      'Islamic Year',
      banknote.islamic_year
    ]);
    if (banknote.sultan) details.push([
      'Sultan',
      banknote.sultan
    ]);
    if (banknote.printer) details.push([
      'Printer',
      banknote.printer
    ]);
    if (banknote.type) details.push([
      'Type',
      banknote.type
    ]);
    if (banknote.category) details.push([
      'Category',
      banknote.category
    ]);
    if (banknote.rarity) details.push([
      'Rarity',
      banknote.rarity
    ]);
    if (banknote.security_element) details.push([
      'Security Element',
      banknote.security_element
    ]);
    if (banknote.colors) details.push([
      'Colors',
      banknote.colors
    ]);
    if (banknote.dimensions) details.push([
      'Dimensions',
      banknote.dimensions
    ]);
    if (banknote.description) details.push([
      'Description',
      banknote.description
    ]);
    if (banknote.historical_context) details.push([
      'Historical Context',
      banknote.historical_context
    ]);
    return details.map(([label, value])=>`
      <tr>
        <td class="detail-label">${label}</td>
        <td class="detail-value">${value}</td>
      </tr>
    `).join('');
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="product">
  <meta property="og:url" content="https://ottocollect.com${selfPath}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:alt" content="${banknote.denomination} ${banknote.country} Banknote">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://ottocollect.com${selfPath}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:creator" content="@OttoCollect">

  <!-- Canonical URL -->
  <link rel="canonical" href="https://ottocollect.com${selfPath}">
  <meta name="robots" content="${isAvailable ? 'index, follow, max-image-preview:large' : 'noindex, follow'}">
  <link rel="alternate" hreflang="x-default" href="https://ottocollect.com${selfPath}">

  <!-- Product + Offer structured data -->
  <script type="application/ld+json">
${JSON.stringify(productStructuredData, null, 2)}
  </script>
  <script type="application/ld+json">
${JSON.stringify(breadcrumbStructuredData, null, 2)}
  </script>

  <!-- CSS matching the exact layout from MarketplaceItemDetail.tsx -->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #FBFBFB;
      color: #3C2415;
      line-height: 1.6;
      min-height: 100vh;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 20px;
    }
    
    .back-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: transparent;
      color: #6B7280;
      border: none;
      border-radius: 6px;
      text-decoration: none;
      font-size: 0.875rem;
      transition: all 0.2s ease;
      margin-bottom: 8px;
    }
    
    .back-button:hover {
      background: #F3F4F6;
      color: #374151;
    }
    
    .back-icon {
      width: 16px;
      height: 16px;
    }
    
    .main-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-top: 24px;
    }
    
    @media (max-width: 768px) {
      .main-grid {
        grid-template-columns: 1fr;
        gap: 24px;
      }
    }
    
    .card {
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .card-content {
      padding: 24px;
    }
    
    .card-header {
      padding: 24px 24px 16px;
      border-bottom: 1px solid #E5E7EB;
      background: #F9FAFB;
    }
    
    .card-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #3C2415;
      margin: 0;
    }
    
    .card-description {
      font-size: 0.875rem;
      color: #6B7280;
      margin-top: 4px;
    }
    
    .images-container {
      margin-bottom: 24px;
    }
    
    .images-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    
    .images-stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .image-container {
      width: 100%;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      overflow: hidden;
    }
    
    .banknote-image {
      width: 100%;
      height: auto;
      object-fit: contain;
      display: block;
    }
    
    .no-images {
      padding: 48px 24px;
      text-align: center;
      background: #F9FAFB;
      border-radius: 6px;
      color: #6B7280;
    }
    
    .item-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    
    .item-title-section {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .item-title {
      font-size: 1.5rem;
      font-weight: bold;
      color: #3C2415;
      font-family: serif;
    }
    
    .pick-number {
      font-size: 1.25rem;
      font-weight: bold;
      color: #6B7280;
    }
    
    .item-price {
      font-size: 1.875rem;
      font-weight: bold;
      color: #8B4513;
    }
    
    .item-subtitle {
      font-size: 1.125rem;
      color: #6B7280;
      margin-bottom: 16px;
    }
    
    .condition-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .condition-badge {
      padding: 4px 8px;
      background: #F3F4F6;
      color: #374151;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .seller-section {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #E5E7EB;
    }
    
    .seller-info {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .seller-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .seller-avatar-placeholder {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #8B4513;
      color: #F5F5DC;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.875rem;
    }
    
    .seller-details {
      flex: 1;
    }
    
    .seller-name {
      font-weight: 600;
      color: #3C2415;
      margin-bottom: 2px;
    }
    
    .seller-rank {
      padding: 2px 6px;
      background: #8B4513;
      color: white;
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 500;
      display: inline-block;
    }
    
    .contact-button {
      padding: 8px 16px;
      background: #8B4513;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    
    .contact-button:hover {
      background: #7A3A0F;
    }
    
    .banknote-details {
      border-top: 4px solid #8B4513;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    
    .details-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .details-table tr {
      border-bottom: 1px solid #E5E7EB;
    }
    
    .details-table tr:last-child {
      border-bottom: none;
    }
    
    .detail-label {
      padding: 12px 16px;
      font-weight: 600;
      color: #374151;
      background: #F9FAFB;
      width: 30%;
      vertical-align: top;
    }
    
    .detail-value {
      padding: 12px 16px;
      color: #3C2415;
      vertical-align: top;
    }
    
    .redirect-notice {
      text-align: center;
      padding: 20px;
      background: #F8F9FA;
      border-radius: 8px;
      margin-top: 20px;
      color: #6B7280;
    }
    
    .redirect-notice a {
      color: #8B4513;
      text-decoration: none;
    }
    
    .redirect-notice a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Back Button -->
    <button class="back-button" onclick="window.history.back()">
      <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      Back
    </button>

    <div class="main-grid">
      <!-- Left Column: Images -->
      <div>
        <div class="card">
          <div class="card-content">
            <div class="images-container">
              ${generateImages()}
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Details -->
      <div>
        <!-- Item Details Card -->
        <div class="card">
          <div class="card-content">
            <div class="item-header">
              <div class="item-title-section">
                <h1 class="item-title">${banknote.denomination}</h1>
                ${banknote.extendedPickNumber ? `<span class="pick-number">(${banknote.extendedPickNumber})</span>` : ''}
              </div>
              <div class="item-price">$${salePrice}</div>
            </div>
            
            <p class="item-subtitle">
              ${banknote.country}${banknote.year ? `, ${banknote.year}` : ''}
            </p>
            
            <div class="condition-badges">
              ${condition ? `<span class="condition-badge">${condition}</span>` : ''}
              ${grade ? `<span class="condition-badge">${grade_by ? `${grade_by} ` : ''}${grade}${grade_condition_description ? ` - ${grade_condition_description}` : ''}</span>` : ''}
            </div>
            
            ${publicNote ? `
              <div class="seller-note">
                <h3>Seller's Note</h3>
                <p>${publicNote}</p>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Seller Information Card -->
        <div class="card">
          <div class="card-content">
            <div class="seller-section">
              <div class="seller-info">
                ${sellerAvatar ? `
                  <img src="${sellerAvatar}" alt="${sellerName}" class="seller-avatar">
                ` : `
                  <div class="seller-avatar-placeholder">${sellerName.charAt(0).toUpperCase()}</div>
                `}
                <div class="seller-details">
                  <div class="seller-name">${sellerName}</div>
                  <span class="seller-rank">${sellerRank}</span>
                </div>
              </div>
              <button class="contact-button">Message Seller</button>
            </div>
          </div>
        </div>

        <!-- Banknote Details Card -->
        <div class="card banknote-details">
          <div class="card-header">
            <h2 class="card-title">Banknote Details</h2>
            <p class="card-description">Detailed information about this banknote</p>
          </div>
          <div class="card-content">
            <table class="details-table">
              ${generateBanknoteDetails()}
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Cross-links: keep marketplace items, catalogue & country pages mutually reachable (SEO) -->
    ${(() => {
      const country = banknote.country;
      const sameCountry = (allItems || []).filter((it: any) => it && it.id !== marketplaceItem.id && it.collectionItem?.banknote?.country === country).slice(0, 6);
      const links = [];
      if (banknote.id) links.push(`<li><a href="/catalog-banknote/${banknote.id}">View this banknote in the catalogue</a></li>`);
      if (country) links.push(`<li><a href="/catalog/${encodeURIComponent(country)}">Browse all ${country} banknotes</a></li>`);
      const similar = sameCountry.map((it: any) => {
        const b = it.collectionItem.banknote;
        const label = `${b.denomination || ''} ${b.country || ''}${b.year ? `, ${b.year}` : ''}`.trim();
        return `<li><a href="${marketplaceItemPath(it)}" rel="related">${label}</a></li>`;
      });
      if (links.length === 0 && similar.length === 0) return '';
      return `
    <nav class="related-items" style="max-width:1200px;margin:24px auto 0;padding:0;">
      ${links.length ? `<ul style="list-style:none;padding:0;margin:0 0 16px;display:grid;gap:8px;">${links.join('')}</ul>` : ''}
      ${similar.length ? `<h2 style="font-size:1.1rem;margin-bottom:12px;"><span>Similar items for sale</span></h2>
      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:8px;">${similar.join('')}</ul>` : ''}
      <p style="margin-top:12px;"><a href="/marketplace">Browse the full marketplace</a></p>
    </nav>`;
    })()}
  </div>

  <div class="redirect-notice">
    <p>If you are not redirected automatically, <a href="${selfPath}">click here to view the interactive version</a>.</p>
  </div>

  <!-- No redirects for crawlers -->
  <script>
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      setTimeout(() => {
        window.location.replace('${selfPath}');
      }, 100);
    }
  </script>
</body>
</html>`;
}

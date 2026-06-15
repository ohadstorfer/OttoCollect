import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const baseUrl = 'https://ottocollect.com';
    const currentDate = new Date().toISOString().split('T')[0];

    // Last edit date of the truly-static page React components.
    // Bump this string when /guide, /about, /contact, /privacy, /terms or
    // /cookie-policy actually change. A stale lastmod for static pages is
    // honest: their content rarely changes.
    const STATIC_PAGE_LASTMOD = '2025-10-06';

    // Latest updated_at per content area, computed in parallel.
    const [
      forumLatest,
      blogLatest,
      countriesLatest,
      banknotesLatest,
      marketplaceLatest,
      announcementsLatest,
    ] = await Promise.all([
      supabase.from('forum_posts').select('updated_at').order('updated_at', { ascending: false }).limit(1),
      supabase.from('blog_posts').select('updated_at').order('updated_at', { ascending: false }).limit(1),
      supabase.from('countries').select('updated_at').order('updated_at', { ascending: false }).limit(1),
      supabase.from('detailed_banknotes').select('updated_at').eq('is_approved', true).order('updated_at', { ascending: false }).limit(1),
      supabase.from('collection_items').select('updated_at').eq('is_for_sale', true).order('updated_at', { ascending: false }).limit(1),
      supabase.from('forum_announcements').select('updated_at').order('updated_at', { ascending: false }).limit(1),
    ]);

    const pickMax = (...candidates: (string | undefined)[]): string => {
      const dates = candidates.filter(Boolean) as string[];
      if (!dates.length) return currentDate;
      dates.sort();
      return new Date(dates[dates.length - 1]).toISOString().split('T')[0];
    };

    const homepageLastmod = pickMax(
      forumLatest.data?.[0]?.updated_at,
      blogLatest.data?.[0]?.updated_at,
      countriesLatest.data?.[0]?.updated_at,
      banknotesLatest.data?.[0]?.updated_at,
      marketplaceLatest.data?.[0]?.updated_at,
    );
    const catalogLastmod = pickMax(
      countriesLatest.data?.[0]?.updated_at,
      banknotesLatest.data?.[0]?.updated_at,
    );
    const marketplacePageLastmod = pickMax(marketplaceLatest.data?.[0]?.updated_at);
    const forumPageLastmod = pickMax(
      forumLatest.data?.[0]?.updated_at,
      announcementsLatest.data?.[0]?.updated_at,
    );
    const blogPageLastmod = pickMax(blogLatest.data?.[0]?.updated_at);
    // Community page is profile-driven; profiles.updated_at exists but the
    // page rarely benefits from per-profile freshness, so we tie it to the
    // most recent forum activity (a reasonable proxy for community life).
    const communityLastmod = forumPageLastmod;

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${homepageLastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Main Pages -->
  <url>
    <loc>${baseUrl}/catalog</loc>
    <lastmod>${catalogLastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>${baseUrl}/marketplace</loc>
    <lastmod>${marketplacePageLastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>${baseUrl}/forum</loc>
    <lastmod>${forumPageLastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${blogPageLastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>${baseUrl}/community</loc>
    <lastmod>${communityLastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>${baseUrl}/guide</loc>
    <lastmod>${STATIC_PAGE_LASTMOD}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${STATIC_PAGE_LASTMOD}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>${STATIC_PAGE_LASTMOD}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>${STATIC_PAGE_LASTMOD}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>

  <url>
    <loc>${baseUrl}/terms</loc>
    <lastmod>${STATIC_PAGE_LASTMOD}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>

  <url>
    <loc>${baseUrl}/cookie-policy</loc>
    <lastmod>${STATIC_PAGE_LASTMOD}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
`;

    // Fetch visible countries dynamically. Hidden countries are excluded from the
    // index — their catalog page isn't public, so neither it nor their banknotes
    // belong in the sitemap.
    const { data: countries } = await supabase
      .from('countries')
      .select('name, updated_at')
      .eq('is_visible', true)
      .order('display_order');
    const visibleCountryNames = new Set((countries || []).map((c: any) => c.name));

    if (countries) {
      sitemap += '\n  <!-- Country-specific catalog pages -->\n';
      countries.forEach(country => {
        const encodedCountry = encodeURIComponent(country.name);
        const lastmod = country.updated_at 
          ? new Date(country.updated_at).toISOString().split('T')[0] 
          : currentDate;
        sitemap += `  <url>
    <loc>${baseUrl}/catalog/${encodedCountry}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      });
    }

    // Fetch blog posts dynamically
    const { data: blogPosts } = await supabase
      .from('blog_posts')
      .select('id, updated_at')
      .order('created_at', { ascending: false });

    if (blogPosts) {
      sitemap += '\n  <!-- Blog posts -->\n';
      blogPosts.forEach(post => {
        const lastmod = post.updated_at 
          ? new Date(post.updated_at).toISOString().split('T')[0] 
          : currentDate;
        sitemap += `  <url>
    <loc>${baseUrl}/blog-post/${post.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      });
    }

    // Fetch published guide / FAQ entries dynamically. Only entries that have a
    // full article (non-empty content) get a /guide-post page, so short-answer-
    // only entries are excluded here.
    const { data: qaEntries } = await supabase
      .from('qa_entries')
      .select('id, updated_at, content')
      .eq('is_draft', false)
      .order('display_order', { ascending: true });

    const qaArticleEntries = (qaEntries || []).filter(
      (e: any) => String(e.content ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0
    );
    if (qaArticleEntries.length > 0) {
      sitemap += '\n  <!-- Guide / FAQ entries -->\n';
      qaArticleEntries.forEach(entry => {
        const lastmod = entry.updated_at
          ? new Date(entry.updated_at).toISOString().split('T')[0]
          : currentDate;
        sitemap += `  <url>
    <loc>${baseUrl}/guide-post/${entry.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      });
    }

    // Fetch forum posts dynamically
    const { data: forumPosts } = await supabase
      .from('forum_posts')
      .select('id, updated_at')
      .order('created_at', { ascending: false });

    if (forumPosts) {
      sitemap += '\n  <!-- Forum posts -->\n';
      forumPosts.forEach(post => {
        const lastmod = post.updated_at 
          ? new Date(post.updated_at).toISOString().split('T')[0] 
          : currentDate;
        sitemap += `  <url>
    <loc>${baseUrl}/forum-post/${post.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      });
    }

    // Fetch banknotes dynamically. All approved banknotes in VISIBLE countries are
    // included, with or without a front image (the imageless "thin" filter was
    // intentionally removed); banknotes in hidden countries are excluded.
    const { data: banknotes } = await supabase
      .from('detailed_banknotes')
      .select('id, updated_at, country')
      .eq('is_approved', true)
      .order('extended_pick_number');

    const indexableBanknotes = (banknotes || []).filter((b: any) => visibleCountryNames.has(b.country));
    console.log(`Sitemap: ${indexableBanknotes.length} approved banknotes in visible countries included`);

    if (indexableBanknotes.length) {
      sitemap += '\n  <!-- Banknote detail pages -->\n';
      indexableBanknotes.forEach((banknote: any) => {
        const lastmod = banknote.updated_at
          ? new Date(banknote.updated_at).toISOString().split('T')[0]
          : currentDate;
        sitemap += `  <url>
    <loc>${baseUrl}/catalog-banknote/${banknote.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      });
    }

    // Fetch available marketplace listings keyed by marketplace_items.id — the id
    // the app routes and fetches by (getMarketplaceItemById). Split listed vs
    // unlisted via the joined collection item flag; is_for_sale guards stale rows.
    const { data: mpItems } = await supabase
      .from('marketplace_items')
      .select('id, updated_at, collection_items!inner(is_unlisted_banknote, is_for_sale)')
      .eq('status', 'Available')
      .order('created_at', { ascending: false });

    const forSale = (mpItems || []).filter((i: any) => i.collection_items?.is_for_sale);
    const listedItems = forSale.filter((i: any) => !i.collection_items?.is_unlisted_banknote);
    const unlistedItems = forSale.filter((i: any) => i.collection_items?.is_unlisted_banknote);

    if (listedItems.length) {
      sitemap += '\n  <!-- Marketplace listed items -->\n';
      listedItems.forEach(item => {
        const lastmod = item.updated_at
          ? new Date(item.updated_at).toISOString().split('T')[0]
          : currentDate;
        sitemap += `  <url>
    <loc>${baseUrl}/marketplace-item/${item.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      });
    }

    if (unlistedItems.length) {
      sitemap += '\n  <!-- Marketplace unlisted items -->\n';
      unlistedItems.forEach(item => {
        const lastmod = item.updated_at
          ? new Date(item.updated_at).toISOString().split('T')[0]
          : currentDate;
        sitemap += `  <url>
    <loc>${baseUrl}/marketplace-item-unlisted/${item.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      });
    }

    sitemap += '</urlset>';

    return new Response(sitemap, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

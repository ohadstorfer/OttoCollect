import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
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
    console.log('Fetching all approved banknotes...');
    // Fetch all approved banknotes
    const { data: banknotes, error } = await supabase.from('detailed_banknotes').select('*');
    if (error) {
      console.error('Error fetching banknotes:', error);
      throw error;
    }
    console.log(`Found ${banknotes?.length || 0} banknotes to process`);
    // Fetch forum posts
    console.log('Fetching forum posts...');
    const { data: forumPosts, error: forumError } = await supabase.from('forum_posts').select('*');
    if (forumError) {
      console.error('Error fetching forum posts:', forumError);
    }
    console.log(`Found ${forumPosts?.length || 0} forum posts to process`);
    // Fetch blog posts
    console.log('Fetching blog posts...');
    const { data: blogPosts, error: blogError } = await supabase.from('blog_posts').select('*');
    if (blogError) {
      console.error('Error fetching blog posts:', blogError);
    }
    console.log(`Found ${blogPosts?.length || 0} blog posts to process`);
    const generatedPages = [];
    const errors = [];
    // Fetch marketplace items
    console.log('Fetching marketplace items...');
    const { data: marketplaceItems, error: marketplaceError } = await supabase.from('marketplace_items').select('*').order('created_at', {
      ascending: false
    }).limit(6);
    if (marketplaceError) {
      console.error('Error fetching marketplace items:', marketplaceError);
    } else {
      console.log(`Found ${marketplaceItems?.length || 0} marketplace items to process`);
    }
    // Fetch countries data
    console.log('Fetching countries...');
    const { data: countries, error: countriesError } = await supabase.from('countries').select('*');
    if (countriesError) {
      console.error('Error fetching countries:', countriesError);
    // You can either throw the error or continue without countries
    // throw countriesError;
    } else {
      console.log(`Found ${countries?.length || 0} countries to process`);
    }
    // Generate HTML for blog page
    try {
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
    // Generate HTML for marketplace page
    try {
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
    // Generate HTML for each marketplace item
    for (const item of marketplaceItems || []){
      try {
        const html = generateMarketplaceItemHTML(item);
        const fileName = `marketplace-item-${item.id}.html`;
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
          generatedPages.push(`marketplace-item-${item.id}`);
        }
      } catch (itemError) {
        console.error(`Error processing marketplace item ${item.id}:`, itemError);
        errors.push({
          id: item.id,
          error: itemError.message
        });
      }
    }
    // Generate HTML for each banknote
    for (const banknote of banknotes || []){
      try {
        const html = generateCatalogItemHTML(banknote);
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
    // Generate HTML for each forum post
    for (const post of forumPosts || []){
      try {
        const html = generateForumPostHTML(post);
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
    // Generate HTML for contact page
    try {
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
    // Generate HTML for about page
    try {
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
    // Generate HTML for catalog page
    try {
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
    // Generate HTML for homepage
    try {
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
    // Generate HTML for each country page
    for (const country of countries || []){
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
    // Fetch announcements
    console.log('Fetching forum announcements...');
    const { data: announcements, error: announcementsError } = await supabase.from('forum_announcements').select(`
    *,
    author:profiles!forum_announcements_author_id_fkey(id, username, avatar_url, rank)
  `).order('created_at', {
      ascending: false
    }).limit(5);
    if (announcementsError) {
      console.error('Error fetching announcements:', announcementsError);
    }
    // Generate HTML for forum page
    try {
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
    // Generate HTML for each blog post
    for (const post of blogPosts || []){
      try {
        const html = generateBlogPostHTML(post);
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
function generateCatalogItemHTML(banknote) {
  const imageUrl = banknote.front_picture_watermarked || banknote.front_picture_thumbnail || 'https://ottocollect.com/OttoCollectIcon.PNG';
  const backImageUrl = banknote.back_picture_watermarked || banknote.back_picture_thumbnail;
  // Title matching the format from the image
  const title = `${banknote.face_value} ${banknote.country} Banknote ${banknote.gregorian_year || banknote.islamic_year || ''} - OttoCollect`;
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
        "name": "Ottoman Empire Banknotes",
        "url": "https://ottocollect.com/catalog/Ottoman%20Empire"
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
  <meta name="description" content="${description}">
  <link rel="canonical" href="https://ottocollect.com/catalog-banknote/${banknote.id}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ottocollect.com/catalog-banknote/${banknote.id}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${banknote.face_value} ${banknote.country} banknote from ${banknote.gregorian_year || banknote.islamic_year || ''} - Pick ${banknote.extended_pick_number}">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="https://ottocollect.com/catalog-banknote/${banknote.id}">
  <meta property="twitter:title" content="${title}">
  <meta property="twitter:description" content="${description}">
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
function generateForumPageHTML(forumPosts, announcements) {
  const title = 'Ottoman Banknote Collectors Forum';
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
    return forumPosts.map((post)=>{
      const postUrl = `/forum/post/${post.id}`;
      const authorName = post.author?.username || post.author_name || 'Unknown User';
      const authorAvatar = post.author?.avatar_url || '';
      const commentCount = post.commentCount || post.reply_count || 0;
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
            <h3 class="post-title" itemprop="headline">${post.title || 'Untitled Post'}</h3>
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
            <a href="${postUrl}" itemprop="url" style="display:none;">${post.title || 'Untitled Post'}</a>
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
    return announcements.map((announcement)=>{
      const announcementUrl = `/forum/post/${announcement.id}`;
      const authorName = announcement.author?.username || 'Admin';
      const authorAvatar = announcement.author?.avatar_url || '';
      const commentCount = announcement.commentCount || 0;
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
  
  <!-- Structured Data for Forum Posts -->
  <script type="application/ld+json">
    ${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
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
          ...(announcements && announcements.length > 0 ? announcements.map((announcement, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "item": {
              "@type": "DiscussionForumPosting",
              "headline": announcement.title || 'Untitled Announcement',
              "text": announcement.content || announcement.description || 'No content available',
              "author": {
                "@type": "Person",
                "name": announcement.author?.username || 'Admin'
              },
              "datePublished": announcement.created_at,
              "url": `https://ottocollect.com/forum/post/${announcement.id}`,
              "interactionStatistic": {
                "@type": "InteractionCounter",
                "interactionType": "https://schema.org/ReplyAction",
                "userInteractionCount": announcement.commentCount || 0
              }
            }
          })) : []),
          // Regular forum posts
          ...(forumPosts && forumPosts.length > 0 ? forumPosts.map((post, index) => ({
            "@type": "ListItem",
            "position": (announcements?.length || 0) + index + 1,
            "item": {
              "@type": "DiscussionForumPosting",
              "headline": post.title || 'Untitled Post',
              "text": post.content || 'No content available',
              "author": {
                "@type": "Person",
                "name": post.author?.username || post.author_name || 'Unknown User'
              },
              "datePublished": post.created_at,
              "url": `https://ottocollect.com/forum/post/${post.id}`,
              "interactionStatistic": {
                "@type": "InteractionCounter",
                "interactionType": "https://schema.org/ReplyAction",
                "userInteractionCount": post.commentCount || post.reply_count || 0
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
        <h1 class="hero-title">Forum</h1>
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
  const title = 'OttoCollect - Ottoman Empire Banknotes Catalog & Collectors Platform';
  const description = 'OttoCollect is a comprehensive catalog and management platform dedicated to collectors of Ottoman Empire banknotes and those from successor countries since 1840. Our mission is to document and preserve numismatic history while supporting a vibrant community of collectors across Turkey, Jordan, Egypt, Lebanon, Palestine, Syria, Israel, Bulgaria, Albania, and beyond. Collectors can track personal collections, share images, contribute to the catalog, and connect with enthusiasts worldwide.';
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
    return countries.map((country)=>{
      const countryUrl = `/catalog/${encodeURIComponent(country.name)}`;
      const countryImage = country.imageUrl || '';
      const banknoteCount = country.banknoteCount || 0;
      return `
        <a href="${countryUrl}" class="country-card-link">
          <div class="country-card">
            <div class="country-image-container">
              ${countryImage ? `
                <img src="${countryImage}" alt="Banknotes catalogue from ${country.name}" class="country-image">
              ` : `
                <div class="country-placeholder">
                  <span class="country-placeholder-text">${country.name}</span>
                </div>
              `}
              <div class="country-overlay">
                <div class="country-info">
                  <h3 class="country-name">${country.name}</h3>
                  <p class="country-count">${banknoteCount} banknote${banknoteCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          </div>
        </a>
      `;
    }).join('');
  };
  // Generate structured data
  const generateStructuredData = ()=>{
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "OttoCollect Banknote Catalog",
      "description": "Comprehensive catalog of Ottoman Empire banknotes and historical currency from successor countries",
      "url": "https://ottocollect.com/catalog/",
      "mainEntity": {
        "@type": "ItemList",
        "name": "Ottoman Empire Banknote Catalog",
        "description": "Complete collection of Ottoman Empire banknotes by country",
        "numberOfItems": countries?.length || 0
      },
      "hasPart": countries?.map((country)=>({
          "@type": "CollectionPage",
          "name": `${country.name} Banknote Catalog`,
          "url": `https://ottocollect.com/catalog/${encodeURIComponent(country.name)}`
        })) || [],
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
            "item": "https://ottocollect.com/catalog/"
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
      background: linear-gradient(135deg, #8b4513 0%, #a0522d 100%);
      padding: 48px 0;
      margin-bottom: 16px;
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
    
    .hero-subtitle {
      font-size: 1.125rem;
      color: #555;
      max-width: 800px;
      margin: 0 auto;
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
      border: 1px solid #d4af37;
      border-radius: 8px;
      overflow: hidden;
      transition: box-shadow 0.3s ease;
      height: 100%;
    }
    
    .country-card:hover {
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
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
      background: linear-gradient(135deg, #f8f6f0 0%, #f0ede4 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .country-placeholder-text {
      color: #8b4513;
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
      color: #e5e5e5;
      margin-bottom: 4px;
    }
    
    .country-count {
      font-size: 0.875rem;
      color: rgba(255,255,255,0.8);
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
        <h1 class="hero-title">Banknote Catalog</h1>
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

function generateBlogPageHTML(blogPosts = []) {
  const title = 'OttoCollect Blog - Ottoman Empire Banknote News & Insights';
  const description = 'Stay updated with the latest news, insights, and stories about Ottoman Empire banknotes. Expert analysis, market trends, and collector stories from the numismatic community.';
  const imageUrl = 'https://ottocollect.com/web-app-manifest-512x512.png';
  
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
      "blogPost": blogPosts && blogPosts.length > 0 ? blogPosts.map((post) => ({
        "@type": "BlogPosting",
        "headline": post.title || 'Untitled Post',
        "description": post.excerpt || (post.content ? post.content.substring(0, 160) + '...' : 'Blog post about Ottoman Empire banknotes'),
        "articleBody": post.content || post.excerpt || 'No content available',
        "author": {
          "@type": "Person",
          "name": post.author?.username || post.author_name || 'OttoCollect Team'
        },
        "datePublished": post.created_at,
        "dateModified": post.updated_at || post.created_at,
        "url": `https://ottocollect.com/blog/post/${post.id}`,
        "image": post.featured_image || post.main_image_url || post.image_url || imageUrl,
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": `https://ottocollect.com/blog/post/${post.id}`
        },
        "interactionStatistic": {
          "@type": "InteractionCounter",
          "interactionType": "https://schema.org/CommentAction",
          "userInteractionCount": post.commentCount || 0
        }
      })) : [],
      "mainEntity": {
        "@type": "ItemList",
        "name": "Blog Posts",
        "description": "Latest news, insights, and stories about Ottoman Empire banknotes, numismatic history, collecting tips, and market analysis",
        "numberOfItems": blogPosts?.length || 0,
        "itemListElement": blogPosts && blogPosts.length > 0 ? blogPosts.map((post, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "BlogPosting",
            "headline": post.title || 'Untitled Post',
            "description": post.excerpt || (post.content ? post.content.substring(0, 160) + '...' : 'Blog post about Ottoman Empire banknotes'),
            "articleBody": post.content || post.excerpt || 'No content available',
            "author": {
              "@type": "Person",
              "name": post.author?.username || post.author_name || 'OttoCollect Team'
            },
            "datePublished": post.created_at,
            "dateModified": post.updated_at || post.created_at,
            "url": `https://ottocollect.com/blog/post/${post.id}`,
            "image": post.featured_image || post.main_image_url || post.image_url || imageUrl
          }
        })) : []
      },
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
  
  <!-- Structured Data for Blog Posts -->
  <script type="application/ld+json">
    ${JSON.stringify(generateStructuredData(), null, 2)}
  </script>
  
  <!-- Redirect to React app after meta tags are read -->
  <script>
    // Only redirect regular users, not crawlers
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      setTimeout(() => {
        window.location.replace('/blog');
      }, 100);
    }
  </script>
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <img src="${imageUrl}" alt="OttoCollect Blog">
  <p>If you are not redirected automatically, <a href="/blog">click here</a>.</p>
</body>
</html>`;
}
function generateForumPostHTML(post, comments = []) {
  const imageUrl = post.image_url || 'https://ottocollect.com/web-app-manifest-512x512.png';
  const title = `${post.title} - OttoCollect Forum`;
  const description = post.content ? post.content.substring(0, 160) + '...' : `Forum discussion: ${post.title}`;
  const authorName = post.author?.username || 'Anonymous';
  const authorAvatar = post.author?.avatar_url || '';
  const createdDate = new Date(post.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const commentCount = post.commentCount || 0;
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
  <meta property="og:url" content="https://ottocollect.com/forum/post/${post.id}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${post.title}">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://ottocollect.com/forum/post/${post.id}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:creator" content="@OttoCollect">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://ottocollect.com/forum/post/${post.id}">
  
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
                <img src="${imageUrl}" alt="Post image" class="post-image">
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
  </div>
  
  <div class="redirect-notice">
    <p>If you are not redirected automatically, <a href="/forum/post/${post.id}">click here to view the interactive version</a>.</p>
  </div>

  <!-- No redirects for crawlers -->
  <script>
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      setTimeout(() => {
        window.location.replace('/forum/post/${post.id}');
      }, 100);
    }
  </script>
</body>
</html>`;
}
function generateCountryPageHTML(countryData, banknotes) {
  const countryName = countryData?.name || 'Unknown Country';
  const encodedCountry = encodeURIComponent(countryName);
  const title = `${countryName} Banknotes | OttoCollect`;
  const description = `Browse ${countryName} banknotes from Ottoman Empire period. Historical banknotes with detailed info.`;
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
                <p class="banknote-year">${banknote.gregorian_year || banknote.islamic_year || 'Unknown Year'}</p>
                <p class="banknote-pick">Pick #${banknote.extended_pick_number || banknote.pick_number || 'Unknown'}</p>
                ${banknote.sultan_name ? `<p class="banknote-sultan">Sultan: ${banknote.sultan_name}</p>` : ''}
                ${banknote.printer ? `<p class="banknote-printer">Printer: ${banknote.printer}</p>` : ''}
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
  const generateStructuredData = ()=>{
    const itemListElement = banknotes?.map((banknote, index)=>({
        "@type": "ListItem",
        position: index + 1,
        url: `https://ottocollect.com/catalog-banknote/${banknote.id}`,
        item: generateBanknoteItemData(banknote)
      })) || [];
    return {
      "@context": "https://schema.org",
      "@type": [
        "CollectionPage",
        "ItemList"
      ],
      name: `${countryName} Banknotes`,
      description: `Catalog of ${countryName} banknotes from the Ottoman Empire period.`,
      url: `https://ottocollect.com/catalog/${encodedCountry}`,
      numberOfItems: banknotes?.length || 0,
      itemListElement,
      isPartOf: {
        "@type": "WebSite",
        name: "OttoCollect Banknote Catalog",
        url: "https://ottocollect.com/catalog/"
      },
      publisher: {
        "@type": "Organization",
        name: "OttoCollect",
        url: "https://ottocollect.com"
      }
    };
  };
  // ✅ Optional enhancement: create per-note CreativeWork JSON-LD snippets for embedding
  const generatePerNoteStructuredData = ()=>{
    if (!banknotes?.length) return '';
    return banknotes.map((banknote)=>{
      const year = banknote.gregorian_year || banknote.islamic_year || '';
      const imageUrl = banknote.front_picture_watermarked || banknote.front_picture_thumbnail || 'https://ottocollect.com/OttoCollectIcon.PNG';
      return `
          <script type="application/ld+json">
          ${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: `${banknote.face_value || ''} ${countryName} Banknote (${year})`,
        url: `https://ottocollect.com/catalog-banknote/${banknote.id}`,
        image: [
          imageUrl
        ],
        identifier: [
          banknote.turk_catalog_number ? {
            "@type": "PropertyValue",
            name: `${countryName} Catalog`,
            value: banknote.turk_catalog_number
          } : null,
          banknote.pick_number ? {
            "@type": "PropertyValue",
            name: "Pick",
            value: banknote.pick_number
          } : null,
          banknote.extended_pick_number ? {
            "@type": "PropertyValue",
            name: "Extended Pick",
            value: banknote.extended_pick_number
          } : null
        ].filter(Boolean),
        temporalCoverage: year,
        width: banknote.width_mm ? {
          "@type": "QuantitativeValue",
          value: banknote.width_mm,
          unitCode: "MMT"
        } : undefined,
        height: banknote.height_mm ? {
          "@type": "QuantitativeValue",
          value: banknote.height_mm,
          unitCode: "MMT"
        } : undefined,
        isPartOf: {
          "@type": "Collection",
          name: `${countryName} Banknotes`,
          url: `https://ottocollect.com/catalog/${encodedCountry}`
        },
        publisher: {
          "@type": "Organization",
          name: "OttoCollect",
          url: "https://ottocollect.com"
        }
      }, null, 2)}
          </script>
        `;
    }).join('\n');
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

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ottocollect.com/catalog/${encodedCountry}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="https://ottocollect.com/images/${countryName.toLowerCase().replace(/\s+/g, '-')}.jpg">
  <meta property="og:image:alt" content="${countryName} Banknote Catalog">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="https://ottocollect.com/catalog/${encodedCountry}">
  <meta property="twitter:title" content="${title}">
  <meta property="twitter:description" content="${description}">
  <meta property="twitter:image" content="https://ottocollect.com/images/${countryName.toLowerCase().replace(/\s+/g, '-')}.jpg">
  <meta property="twitter:creator" content="@OttoCollect">

  <!-- ✅ Schema.org: Collection + ItemList -->
  <script type="application/ld+json">
    ${JSON.stringify(generateStructuredData(), null, 2)}
  </script>

  <!-- ✅ Per-note structured data (CreativeWork) -->
  ${generatePerNoteStructuredData()}

  <!-- Styles (unchanged) -->
  <style>
    /* Your CSS remains identical */
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <button class="back-button" onclick="window.history.back()">←</button>
      <h1>${countryName} Banknotes</h1>
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

    <div class="banknotes-grid">${generateBanknoteCards()}</div>

    <div class="redirect-notice">
      <p>If you are not redirected automatically, <a href="/catalog/${encodedCountry}">click here to view the interactive version</a>.</p>
    </div>
  </div>

  <script>
    if (!navigator.userAgent.match(/bot|crawler|spider|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      setTimeout(() => {
        window.location.replace('/catalog/${encodedCountry}');
      }, 100);
    }
  </script>
</body>
</html>`;
}
function generateBlogPostHTML(post, comments = []) {
  const imageUrl = post.featured_image || post.main_image_url || 'https://ottocollect.com/web-app-manifest-512x512.png';
  const title = `${post.title} - OttoCollect Blog`;
  const description = post.excerpt || (post.content ? post.content.substring(0, 160) + '...' : `Blog post: ${post.title}`);
  const authorName = post.author?.username || 'Anonymous';
  const authorAvatar = post.author?.avatar_url || '';
  const createdDate = new Date(post.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const commentCount = post.commentCount || 0;
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
  <meta property="og:url" content="https://ottocollect.com/blog/post/${post.id}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${post.title}">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://ottocollect.com/blog/post/${post.id}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:creator" content="@OttoCollect">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://ottocollect.com/blog/post/${post.id}">
  
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
              <img src="${post.main_image_url}" alt="Post image">
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
  </div>
  
  <div class="redirect-notice">
    <p>If you are not redirected automatically, <a href="/blog/post/${post.id}">click here to view the interactive version</a>.</p>
  </div>

  <!-- No redirects for crawlers -->
  <script>
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      setTimeout(() => {
        window.location.replace('/blog/post/${post.id}');
      }, 100);
    }
  </script>
</body>
</html>`;
}
function generateHomePageHTML(forumPosts, marketplaceItems1, countries) {
  const title = 'OttoCollect - Ottoman Empire Banknotes Catalog & Collectors Platform';
  const description = 'OttoCollect is a comprehensive catalog and management platform dedicated to collectors of Ottoman Empire banknotes and those from successor countries since 1840. Our mission is to document and preserve numismatic history while supporting a vibrant community of collectors across Turkey, Jordan, Egypt, Lebanon, Palestine, Syria, Israel, Bulgaria, Albania, and beyond. Collectors can track personal collections, share images, contribute to the catalog, and connect with enthusiasts worldwide.';
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
        <a href="/forum/post/${post.id}" itemprop="url" class="post-link">Read full discussion</a>
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
      const itemDescription = item.description || item.banknote_description || `${item.title} - Authentic Ottoman Empire banknote`;
      return `
      <div class="marketplace-item-card" itemscope itemtype="https://schema.org/Product">
        <div class="item-image">
          <img src="${item.image_url || item.banknote_image || 'https://ottocollect.com/OttoCollectIcon.PNG'}" alt="${item.title || 'Marketplace Item'}" itemprop="image">
        </div>
        <div class="item-info">
          <h3 class="item-title" itemprop="name">${item.title || 'Untitled Item'}</h3>
          <p class="item-description" itemprop="description">${itemDescription.length > 100 ? itemDescription.substring(0, 100) + '...' : itemDescription}</p>
          <p class="item-price" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
            <span itemprop="price">${item.price || 'Price on request'}</span>
            <span itemprop="priceCurrency">${item.currency || 'USD'}</span>
          </p>
          <p class="item-seller" itemprop="seller" itemscope itemtype="https://schema.org/Person">
            Seller: <span itemprop="name">${item.seller_name || item.seller?.username || 'Anonymous'}</span>
          </p>
          ${item.condition ? `<p class="item-condition" itemprop="itemCondition">Condition: ${item.condition}</p>` : ''}
          <a href="/marketplace-item/${item.id}" itemprop="url" class="item-link">View item details</a>
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
        "url": `https://ottocollect.com/forum/post/${post.id}`,
        "interactionStatistic": {
          "@type": "InteractionCounter",
          "interactionType": "https://schema.org/ReplyAction",
          "userInteractionCount": post.commentCount || post.reply_count || 0
        }
      }
    })) : [];

    // Marketplace items structured data
    const marketplaceItemsList = marketplaceItems1 && marketplaceItems1.length > 0 ? marketplaceItems1.slice(0, 6).map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "name": item.title || 'Marketplace Item',
        "description": item.description || item.banknote_description || `${item.title} - Authentic Ottoman Empire banknote`,
        "image": item.image_url || item.banknote_image || 'https://ottocollect.com/OttoCollectIcon.PNG',
        "offers": {
          "@type": "Offer",
          "price": item.price || '0',
          "priceCurrency": item.currency || 'USD',
          "availability": item.status === 'sold' ? "https://schema.org/SoldOut" : "https://schema.org/InStock"
        },
        "seller": {
          "@type": "Person",
          "name": item.seller_name || item.seller?.username || 'Anonymous'
        },
        "itemCondition": item.condition ? `https://schema.org/${item.condition}` : undefined,
        "url": `https://ottocollect.com/marketplace-item/${item.id}`
      }
    })) : [];

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
  <meta name="description" content="${description}">
  <link rel="canonical" href="https://ottocollect.com/">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ottocollect.com/">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="https://ottocollect.com/OttoCollectIconHome.PNG">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="OttoCollect - Ottoman Empire Banknote Collectors Hub">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="https://ottocollect.com/">
  <meta property="twitter:title" content="${title}">
  <meta property="twitter:description" content="${description}">
  <meta property="twitter:image" content="https://ottocollect.com/OttoCollectIconHome.PNG">
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
      <h2 class="hero-subtitle">Discover the Legacy of Ottoman empire and it's successor countries Banknotes</h2>
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
  const description = 'Learn about OttoCollect, the premier platform for Ottoman Empire banknote collectors.';
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
        <p style="font-size: 1.125rem; color: #666;">Everything you need to manage, showcase, and grow your Ottoman and it's successor countries banknotes collection.</p>
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
function generateMarketplaceHTML(marketplaceItems) {
  const title = 'OttoCollect - Ottoman Empire Banknotes Catalog & Collectors Platform';
  const description = 'Buy and sell authentic Ottoman Empire banknotes, rare Turkish currency, and historical paper money. Secure marketplace for serious collectors.';
  const imageUrl = 'https://ottocollect.com/web-app-manifest-512x512.png';
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
        <div class="marketplace-item" onclick="window.location.href='/marketplace-item/${item.id}'">
          <div class="item-image-container">
            <img src="${displayImage}" alt="${banknote.country} ${banknote.denomination} (${banknote.year})" class="item-image">
            <div class="price-badge">$${salePrice}</div>
            <div class="status-badge status-${status.toLowerCase()}">${status}</div>
          </div>
          
          <div class="item-content">
            <div class="item-header">
              <div class="item-title-section">
                <h3 class="item-title">
                  ${banknote.denomination}
                  ${banknote.extendedPickNumber ? `(${banknote.extendedPickNumber})` : ''}
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
function generateMarketplaceItemHTML(marketplaceItem) {
  const { collectionItem, seller, status } = marketplaceItem;
  if (!collectionItem || !collectionItem.banknote) return '';
  const { banknote, condition, salePrice, publicNote, grade, grade_by, grade_condition_description, obverseImage, reverseImage } = collectionItem;
  const sellerName = seller?.username || 'Unknown';
  const sellerAvatar = seller?.avatar_url || '';
  const sellerRank = seller?.rank || 'Newbie Collector';
  const title = `${banknote.denomination} ${banknote.country} Banknote ${banknote.year} - $${salePrice} | OttoCollect Marketplace`;
  const description = `Buy ${banknote.denomination} ${banknote.country} banknote from ${banknote.year} (Pick #${banknote.extendedPickNumber}) for $${salePrice}. ${condition ? `Condition: ${condition}` : ''} ${grade ? `Grade: ${grade}` : ''}. Seller: ${sellerName}.`;
  const imageUrl = obverseImage || banknote.imageUrls?.[0] || 'https://ottocollect.com/web-app-manifest-512x512.png';
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
  <meta property="og:url" content="https://ottocollect.com/marketplace-item/${marketplaceItem.id}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${banknote.denomination} ${banknote.country} Banknote">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://ottocollect.com/marketplace-item/${marketplaceItem.id}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:creator" content="@OttoCollect">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://ottocollect.com/marketplace-item/${marketplaceItem.id}">
  
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
  </div>
  
  <div class="redirect-notice">
    <p>If you are not redirected automatically, <a href="/marketplace-item/${marketplaceItem.id}">click here to view the interactive version</a>.</p>
  </div>

  <!-- No redirects for crawlers -->
  <script>
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai/i)) {
      setTimeout(() => {
        window.location.replace('/marketplace-item/${marketplaceItem.id}');
      }, 100);
    }
  </script>
</body>
</html>`;
}

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

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Main Pages -->
  <url>
    <loc>${baseUrl}/catalog</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/marketplace</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/forum</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/community</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/guide</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/terms</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/cookie-policy</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
`;

    // Fetch countries dynamically
    const { data: countries } = await supabase
      .from('countries')
      .select('name, updated_at')
      .order('display_order');

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

    // Fetch banknotes dynamically
    const { data: banknotes } = await supabase
      .from('detailed_banknotes')
      .select('id, updated_at')
      .eq('is_approved', true)
      .order('extended_pick_number');

    if (banknotes) {
      sitemap += '\n  <!-- Banknote detail pages -->\n';
      banknotes.forEach(banknote => {
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

    // Fetch marketplace items (listed)
    const { data: marketplaceItems } = await supabase
      .from('collection_items')
      .select('id, updated_at')
      .eq('is_for_sale', true)
      .eq('is_unlisted_banknote', false)
      .order('created_at', { ascending: false });

    if (marketplaceItems) {
      sitemap += '\n  <!-- Marketplace listed items -->\n';
      marketplaceItems.forEach(item => {
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

    // Fetch marketplace items (unlisted)
    const { data: unlistedItems } = await supabase
      .from('collection_items')
      .select('id, updated_at')
      .eq('is_for_sale', true)
      .eq('is_unlisted_banknote', true)
      .order('created_at', { ascending: false });

    if (unlistedItems) {
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

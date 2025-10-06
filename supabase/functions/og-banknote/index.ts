import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Social media crawler user agents
const CRAWLER_USER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'TelegramBot',
  'Slackbot',
  'Pinterest',
  'Discordbot',
];

function isCrawler(userAgent: string): boolean {
  return CRAWLER_USER_AGENTS.some(bot => 
    userAgent.toLowerCase().includes(bot.toLowerCase())
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const banknoteId = url.searchParams.get('id');
    const userAgent = req.headers.get('user-agent') || '';

    // If not a crawler or no ID, return basic response
    if (!isCrawler(userAgent) || !banknoteId) {
      return new Response(
        JSON.stringify({ message: 'Not a crawler request or missing ID' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch banknote data
    const { data: banknote, error } = await supabase
      .from('enhanced_banknotes_with_translations')
      .select('*')
      .eq('id', banknoteId)
      .single();

    if (error || !banknote) {
      console.error('Error fetching banknote:', error);
      return new Response(
        generateHTML({
          title: 'OttoCollect - Ottoman Empire Banknotes',
          description: 'Banknote not found',
          image: 'https://ottocollect.com/OttoCollectIcon.PNG',
          url: `https://ottocollect.com/catalog-banknote/${banknoteId}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    // Prepare OG data
    const image = banknote.front_picture_watermarked || 
                  banknote.front_picture_thumbnail || 
                  banknote.front_picture ||
                  'https://ottocollect.com/OttoCollectIcon.PNG';
    
    const title = `${banknote.face_value || ''} ${banknote.country || ''} ${banknote.gregorian_year || ''} | OttoCollect`;
    const description = `Authentic ${banknote.face_value || ''} ${banknote.country || ''} banknote from ${banknote.gregorian_year || ''}. Pick number: ${banknote.pick_number || banknote.extended_pick_number || 'N/A'}. Rare historical currency for collectors.`;

    const html = generateHTML({
      title,
      description,
      image,
      url: `https://ottocollect.com/catalog-banknote/${banknoteId}`,
      banknote,
    });

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error) {
    console.error('Error in og-banknote function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateHTML(data: {
  title: string;
  description: string;
  image: string;
  url: string;
  banknote?: any;
}): string {
  const { title, description, image, url, banknote } = data;

  // Ensure image URL is absolute
  const absoluteImageUrl = image.startsWith('http') ? image : `https://ottocollect.com${image}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="product">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${absoluteImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="OttoCollect">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${url}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${absoluteImageUrl}">
  
  <!-- Redirect to actual page -->
  <meta http-equiv="refresh" content="0;url=${url}">
  <script>window.location.href = "${url}";</script>
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <img src="${absoluteImageUrl}" alt="${title}" style="max-width: 100%; height: auto;">
  <p>Redirecting to <a href="${url}">${url}</a>...</p>
</body>
</html>`;
}

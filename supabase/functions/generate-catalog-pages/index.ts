import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching all approved banknotes...');
    
    // Fetch all approved banknotes
    const { data: banknotes, error } = await supabase
      .from('detailed_banknotes')
      .select('*')
      .eq('is_approved', true)
      .eq('is_pending', false);

    if (error) {
      console.error('Error fetching banknotes:', error);
      throw error;
    }

    console.log(`Found ${banknotes?.length || 0} banknotes to process`);

    const generatedPages: string[] = [];
    const errors: any[] = [];

    // Generate HTML for each banknote
    for (const banknote of banknotes || []) {
      try {
        const html = generateCatalogItemHTML(banknote);
        const fileName = `catalog-banknote-${banknote.id}.html`;
        
        // Upload to storage bucket
        const { error: uploadError } = await supabase.storage
          .from('static-pages')
          .upload(fileName, html, {
            contentType: 'text/html',
            upsert: true,
            cacheControl: '3600'
          });

        if (uploadError) {
          console.error(`Error uploading ${fileName}:`, uploadError);
          errors.push({ id: banknote.id, error: uploadError.message });
        } else {
          generatedPages.push(banknote.id);
        }
      } catch (itemError) {
        console.error(`Error processing banknote ${banknote.id}:`, itemError);
        errors.push({ id: banknote.id, error: itemError.message });
      }
    }

    console.log(`Successfully generated ${generatedPages.length} pages`);
    if (errors.length > 0) {
      console.error(`Failed to generate ${errors.length} pages:`, errors);
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated: generatedPages.length,
        errors: errors.length,
        errorDetails: errors.slice(0, 10), // First 10 errors
        message: `Generated ${generatedPages.length} static HTML pages`,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Fatal error in generate-catalog-pages:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function generateCatalogItemHTML(banknote: any): string {
  const imageUrl = banknote.front_picture_watermarked || 
                   banknote.front_picture_thumbnail || 
                   'https://ottocollect.com/OttoCollectIcon.PNG';
  
  const title = `${banknote.face_value} ${banknote.country} Banknote ${banknote.gregorian_year || banknote.islamic_year || ''} - OttoCollect`;
  const description = `${banknote.face_value} ${banknote.country} banknote from ${banknote.gregorian_year || banknote.islamic_year || 'historic period'} (Pick #${banknote.extended_pick_number}).`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="product">
  <meta property="og:url" content="https://ottocollect.com/catalog-banknote/${banknote.id}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${banknote.country} ${banknote.face_value} Banknote">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://ottocollect.com/catalog-banknote/${banknote.id}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://ottocollect.com/catalog-banknote/${banknote.id}">
  
  <!-- Redirect to React app after meta tags are read -->
  <meta http-equiv="refresh" content="0;url=/catalog-banknote/${banknote.id}">
  <script>
    // Immediate redirect for users (not crawlers)
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling/i)) {
      window.location.replace('/catalog-banknote/${banknote.id}');
    }
  </script>
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <img src="${imageUrl}" alt="${banknote.country} ${banknote.face_value} Banknote">
  <p>If you are not redirected automatically, <a href="/catalog-banknote/${banknote.id}">click here</a>.</p>
</body>
</html>`;
}

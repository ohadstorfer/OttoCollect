const fs = require('fs');
const path = require('path');

// This script generates static HTML pages for each catalog item
// It will be called by the edge function to create/update pages

function generateCatalogItemHTML(banknote) {
  const imageUrl = banknote.front_picture_watermarked || 
                   banknote.front_picture_thumbnail || 
                   'https://ottocollect.com/OttoCollectIcon.PNG';
  
  const title = `${banknote.face_value} ${banknote.country} Banknote ${banknote.gregorian_year || banknote.islamic_year || ''} - OttoCollect`;
  const description = `Buy authentic ${banknote.face_value} ${banknote.country} banknote from ${banknote.gregorian_year || banknote.islamic_year || 'historic period'} (Pick #${banknote.extended_pick_number}). Rare historical currency for serious collectors.`;
  
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

module.exports = { generateCatalogItemHTML };

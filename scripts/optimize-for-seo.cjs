// Simple SEO optimization script
const fs = require('fs');
const path = require('path');

console.log('🔍 Optimizing for SEO...');

// Add structured data to index.html
const indexPath = path.join(__dirname, '../dist/index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Add JSON-LD structured data for better crawling
const structuredData = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "OttoCollect",
  "url": "https://ottocollect.com",
  "description": "Premier marketplace for Ottoman Empire banknotes and historical currency",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://ottocollect.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
</script>`;

// Insert structured data before closing head tag
indexContent = indexContent.replace('</head>', `${structuredData}\n</head>`);

// Write back to file
fs.writeFileSync(indexPath, indexContent);

console.log('✅ SEO optimization complete!');
console.log('📋 Next steps:');
console.log('1. Deploy your site');
console.log('2. Submit sitemap to Google Search Console');
console.log('3. Use URL Inspection tool to test pages');
console.log('4. Request indexing for important pages');

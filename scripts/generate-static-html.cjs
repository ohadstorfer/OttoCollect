// Custom static HTML generation with baked-in canonical URLs
const fs = require('fs');
const path = require('path');

console.log('🚀 Generating static HTML files with baked-in canonical URLs...');

// Define all routes that need static HTML files
const routes = [
  { path: '/', canonical: 'https://ottocollect.com/' },
  { path: '/catalog', canonical: 'https://ottocollect.com/catalog' },
  { path: '/marketplace', canonical: 'https://ottocollect.com/marketplace' },
  { path: '/forum', canonical: 'https://ottocollect.com/forum' },
  { path: '/blog', canonical: 'https://ottocollect.com/blog' },
  { path: '/community', canonical: 'https://ottocollect.com/community' },
  { path: '/about', canonical: 'https://ottocollect.com/about' },
  { path: '/contact', canonical: 'https://ottocollect.com/contact' },
  { path: '/collection', canonical: 'https://ottocollect.com/collection' },
  { path: '/catalog/Ottoman%20Empire', canonical: 'https://ottocollect.com/catalog/Ottoman%20Empire' },
  { path: '/catalog/Turkey', canonical: 'https://ottocollect.com/catalog/Turkey' },
  { path: '/catalog/Palestine', canonical: 'https://ottocollect.com/catalog/Palestine' },
  { path: '/catalog/Syria', canonical: 'https://ottocollect.com/catalog/Syria' },
  { path: '/catalog/Lebanon', canonical: 'https://ottocollect.com/catalog/Lebanon' },
  { path: '/catalog/Iraq', canonical: 'https://ottocollect.com/catalog/Iraq' },
  { path: '/catalog/Jordan', canonical: 'https://ottocollect.com/catalog/Jordan' },
  { path: '/catalog/Egypt', canonical: 'https://ottocollect.com/catalog/Egypt' },
  { path: '/catalog/Greece', canonical: 'https://ottocollect.com/catalog/Greece' },
  { path: '/catalog/Bulgaria', canonical: 'https://ottocollect.com/catalog/Bulgaria' },
  { path: '/catalog/Albania', canonical: 'https://ottocollect.com/catalog/Albania' },
  { path: '/catalog/Israel', canonical: 'https://ottocollect.com/catalog/Israel' },
];

// Read the base index.html
const indexPath = path.join(__dirname, '../dist/index.html');
if (!fs.existsSync(indexPath)) {
  console.error('❌ dist/index.html not found. Please run "npm run build" first.');
  process.exit(1);
}

let baseHtml = fs.readFileSync(indexPath, 'utf8');

// Generate HTML for each route
routes.forEach(route => {
  console.log(`📄 Generating: ${route.path} -> ${route.canonical}`);
  
  // Create directory if it doesn't exist
  const routeDir = path.join(__dirname, '../dist', route.path);
  if (!fs.existsSync(routeDir)) {
    fs.mkdirSync(routeDir, { recursive: true });
  }
  
  // Create a copy of the base HTML
  let routeHtml = baseHtml;
  
  // Remove any existing canonical tags
  routeHtml = routeHtml.replace(/<link[^>]*rel=["']canonical["'][^>]*>/gi, '');
  
  // Add the correct canonical tag directly in the HTML
  routeHtml = routeHtml.replace(
    /<head[^>]*>/i,
    `$&<link rel="canonical" href="${route.canonical}" />`
  );
  
  // Add proper meta robots tag
  routeHtml = routeHtml.replace(
    /<head[^>]*>/i,
    `$&<meta name="robots" content="index, follow" />`
  );
  
  // Add page-specific meta description for catalog pages
  if (route.path.includes('/catalog/') && route.path !== '/catalog') {
    const country = route.path.split('/catalog/')[1]?.replace(/%20/g, ' ');
    const description = `Browse authentic ${country} banknotes and historical currency. Rare collectible paper money from ${country} for serious numismatic collectors.`;
    
    routeHtml = routeHtml.replace(
      /<head[^>]*>/i,
      `$&<meta name="description" content="${description}" />`
    );
  }
  
  // Add page-specific title for catalog pages
  if (route.path.includes('/catalog/') && route.path !== '/catalog') {
    const country = route.path.split('/catalog/')[1]?.replace(/%20/g, ' ');
    const title = `${country} Banknotes - Historical Currency Collection | OttoCollect`;
    
    routeHtml = routeHtml.replace(
      /<title>.*?<\/title>/i,
      `<title>${title}</title>`
    );
  }
  
  // Write the HTML file
  const htmlPath = path.join(routeDir, 'index.html');
  fs.writeFileSync(htmlPath, routeHtml);
  
  console.log(`✅ Created: ${htmlPath}`);
});

console.log('🎉 Static HTML generation complete!');
console.log('📁 Generated files:');
routes.forEach(route => {
  console.log(`   - ${route.path}/index.html (canonical: ${route.canonical})`);
});

console.log('\n📋 Next steps:');
console.log('1. Deploy the dist/ folder to your hosting service');
console.log('2. Test by viewing page source of any route');
console.log('3. Submit sitemap to Google Search Console');
console.log('4. Request indexing for each page');

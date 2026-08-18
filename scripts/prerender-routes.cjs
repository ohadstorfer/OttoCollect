// Generate all routes for pre-rendering
const fs = require('fs');
const path = require('path');

// Define all routes that need pre-rendering
const routes = [
  // Main pages
  '/',
  '/catalog',
  '/marketplace',
  '/forum',
  '/blog',
  '/community',
  '/about',
  '/contact',
  '/collection',
  
  // Country-specific catalog pages. Only VISIBLE DB countries (is_visible=true),
  // matching the sitemap + crawler gate. Non-existent/hidden countries (e.g.
  // Lebanon, Syria) would be dead SEO pages that the server now 404s for crawlers.
  '/catalog/Ottoman%20Empire',
  '/catalog/Jordan',
  '/catalog/Libya',
  '/catalog/Palestine',
];

// Save routes to JSON file
fs.writeFileSync(
  path.join(__dirname, '../prerender-routes.json'),
  JSON.stringify(routes, null, 2)
);

console.log(`✅ Generated ${routes.length} routes for pre-rendering`);
console.log('Routes:', routes);

module.exports = routes;

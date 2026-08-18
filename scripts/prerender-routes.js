// Script to generate all possible routes for pre-rendering
const fs = require('fs');
const path = require('path');

// Define all possible routes for pre-rendering
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

  // Blog post routes (if you have specific blog posts)
  // '/blog/how-to-authenticate-1908-ottoman-banknotes',
  // '/blog/top-5-most-valuable-ottoman-empire-currencies-2024',
  
  // Banknote detail pages (if you want to pre-render specific ones)
  // '/banknote-details/123',
  // '/banknote-details/456',
];

// Export routes for use in vite config
module.exports = routes;

// Also save to a JSON file for reference
fs.writeFileSync(
  path.join(__dirname, '../prerender-routes.json'),
  JSON.stringify(routes, null, 2)
);

console.log(`Generated ${routes.length} routes for pre-rendering`);

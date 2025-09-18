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
  
  // Country-specific catalog pages
  '/catalog/Ottoman%20Empire',
  '/catalog/Turkish%20Republic',
  '/catalog/Palestine%20Mandate',
  '/catalog/Syria',
  '/catalog/Lebanon',
  '/catalog/Iraq',
  '/catalog/Jordan',
  '/catalog/Egypt',
  '/catalog/Greece',
  '/catalog/Bulgaria',
  '/catalog/Albania',
  '/catalog/Israel',
  
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

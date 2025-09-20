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
  
  // Additional pages you might want to pre-render
  '/catalog/Turkey',
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

// Advanced pre-rendering configuration
const fs = require('fs');
const path = require('path');

// Function to generate all possible routes
function generateRoutes() {
  const baseRoutes = [
    '/',
    '/catalog',
    '/marketplace',
    '/forum',
    '/blog',
    '/community',
    '/about',
    '/contact',
    '/collection'
  ];

  // Country-specific routes
  const countries = [
    'Ottoman%20Empire',
    'Turkish%20Republic',
    'Palestine%20Mandate',
    'Syria',
    'Lebanon',
    'Iraq',
    'Jordan',
    'Egypt',
    'Greece',
    'Bulgaria',
    'Albania',
    'Israel'
  ];

  const countryRoutes = countries.map(country => `/catalog/${country}`);
  
  return [...baseRoutes, ...countryRoutes];
}

// Function to create pre-rendering configuration
function createPrerenderConfig() {
  const routes = generateRoutes();
  
  const config = {
    routes,
    postProcess(renderedRoute) {
      const { html, route } = renderedRoute;
      
      // Create proper canonical URL
      const baseUrl = 'https://ottocollect.com';
      const canonicalUrl = `${baseUrl}${route}`;
      
      // Ensure the canonical URL is properly injected
      let updatedHtml = html;
      
      // Remove any existing canonical tags first
      updatedHtml = updatedHtml.replace(/<link[^>]*rel=["']canonical["'][^>]*>/gi, '');
      
      // Add the correct canonical tag
      updatedHtml = updatedHtml.replace(
        /<head[^>]*>/i,
        `$&<link rel="canonical" href="${canonicalUrl}" />`
      );
      
      // Also ensure proper meta tags for SEO
      updatedHtml = updatedHtml.replace(
        /<head[^>]*>/i,
        `$&<meta name="robots" content="index, follow" />`
      );
      
      return {
        ...renderedRoute,
        html: updatedHtml
      };
    }
  };
  
  return config;
}

// Generate the configuration
const prerenderConfig = createPrerenderConfig();

// Save routes to JSON file
fs.writeFileSync(
  path.join(__dirname, '../prerender-routes.json'),
  JSON.stringify(prerenderConfig.routes, null, 2)
);

// Save full config to JSON file
fs.writeFileSync(
  path.join(__dirname, '../prerender-config.json'),
  JSON.stringify(prerenderConfig, null, 2)
);

console.log(`Generated pre-rendering configuration with ${prerenderConfig.routes.length} routes`);
console.log('Routes:', prerenderConfig.routes);

module.exports = prerenderConfig;

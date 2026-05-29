import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://psnzolounfwgvkupepxb.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
);

// Get port from environment variable (Cloud Run sets this)
const PORT = process.env.PORT || 8080;

// Single source of truth for crawler detection across all handlers.
const CRAWLER_REGEX = /bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|chatgptbot|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai|gpt/i;

// Returns true if a row with column=value exists in `table`. Fails open
// (returns true) on errors so a transient DB blip doesn't 404 valid URLs.
async function dbHas(table, column, value) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select(column, { count: 'exact', head: true })
      .eq(column, value);
    if (error) {
      console.error(`dbHas ${table}.${column} error:`, error);
      return true;
    }
    return (count || 0) > 0;
  } catch (e) {
    console.error(`dbHas ${table}.${column} threw:`, e);
    return true;
  }
}

// Serve an entity-bound page: try the pre-rendered static HTML for crawlers,
// fall through to a real 404 when the entity is gone, otherwise serve the
// React shell. Centralises the same flow used by all our dynamic routes.
async function serveEntityPage(req, res, opts) {
  // opts: { staticFileName?, dbTable, dbColumn, dbValue, missingMessage }
  const isCrawler = CRAWLER_REGEX.test(req.get('User-Agent') || '');

  if (isCrawler && opts.staticFileName) {
    try {
      const { data, error } = await supabase.storage
        .from('static-pages')
        .download(opts.staticFileName);
      if (!error && data) {
        const htmlContent = await data.text();
        res.set('Content-Type', 'text/html');
        return res.send(htmlContent);
      }
      console.log(`Static HTML missing for ${opts.staticFileName}, checking DB`);
    } catch (e) {
      console.error(`Error fetching ${opts.staticFileName}:`, e);
    }
  }

  if (!(await dbHas(opts.dbTable, opts.dbColumn, opts.dbValue))) {
    return send404Html(res, opts.missingMessage);
  }

  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
}

// 404 response with a meta noindex so Google removes the URL from the index
// instead of treating it as soft 404.
function send404Html(res, message) {
  res.status(404)
    .set('Content-Type', 'text/html; charset=utf-8')
    .send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>404 — Not Found | OttoCollect</title>
  <meta name="robots" content="noindex,follow">
  <style>body{font-family:system-ui,sans-serif;max-width:640px;margin:60px auto;padding:0 20px;color:#1f2937;line-height:1.6}h1{margin-bottom:.5em}a{color:#1d4ed8}</style>
</head>
<body>
  <h1>404 — Page not found</h1>
  <p>${message}</p>
  <p><a href="https://ottocollect.com/">Return to homepage</a> &middot; <a href="https://ottocollect.com/catalog">Browse the catalog</a></p>
</body>
</html>`);
}

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint (must be before the catch-all route)
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).send('healthy');
});

// Proxy sitemap.xml to dynamic Supabase sitemap
app.get('/sitemap.xml', async (req, res) => {
  console.log('Sitemap requested, proxying to Supabase function');
  try {
    const response = await fetch('https://psnzolounfwgvkupepxb.supabase.co/functions/v1/generate-sitemap', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/xml',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzbnpvbG91bmZ3Z3ZrdXBlcHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4NTk0NTksImV4cCI6MjA1OTQzNTQ1OX0.iIE3DilRwCum5BZiVa-W3nLCAV2EEwzd2h8XDvNdhF8'}`,
        'User-Agent': 'OttoCollect-Sitemap-Generator/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Supabase function returned ${response.status}: ${response.statusText}`);
    }
    
    const sitemapContent = await response.text();
    
    // Check if the response is actually XML
    if (!sitemapContent.startsWith('<?xml')) {
      console.error('Invalid sitemap response:', sitemapContent);
      throw new Error('Invalid sitemap response from Supabase function');
    }
    
    res.set({
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });
    res.send(sitemapContent);
  } catch (error) {
    console.error('Error fetching sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Banknote detail pages
app.get('/catalog-banknote/:id', (req, res) => serveEntityPage(req, res, {
  staticFileName: `catalog-banknote-${req.params.id}.html`,
  dbTable: 'detailed_banknotes',
  dbColumn: 'id',
  dbValue: req.params.id,
  missingMessage: 'The banknote you are looking for does not exist or has been removed.',
}));

// Handle forum page - serve static HTML for crawlers
app.get('/forum', async (req, res) => {
  const userAgent = req.get('User-Agent') || '';
  const isCrawler = /bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|chatgptbot|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai|gpt/i.test(userAgent);
  
  if (isCrawler) {
    console.log('Crawler detected for forum, serving static HTML');
    try {
      const { data, error } = await supabase.storage
        .from('static-pages')
        .download('forum.html');
      
      if (error) {
        console.error('Error fetching forum.html:', error);
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        return;
      }
      
      const htmlContent = await data.text();
      res.set('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error('Error serving forum.html:', error);
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// Handle blog page - serve static HTML for crawlers
app.get('/blog', async (req, res) => {
  const userAgent = req.get('User-Agent') || '';
  const isCrawler = /bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|chatgptbot|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai|gpt/i.test(userAgent);
  
  if (isCrawler) {
    console.log('Crawler detected for blog, serving static HTML');
    try {
      const { data, error } = await supabase.storage
        .from('static-pages')
        .download('blog.html');
      
      if (error) {
        console.error('Error fetching blog.html:', error);
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        return;
      }
      
      const htmlContent = await data.text();
      res.set('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error('Error serving blog.html:', error);
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// Forum post pages
app.get('/forum-post/:id', (req, res) => serveEntityPage(req, res, {
  staticFileName: `forum-post-${req.params.id}.html`,
  dbTable: 'forum_posts',
  dbColumn: 'id',
  dbValue: req.params.id,
  missingMessage: 'The forum post you are looking for does not exist or has been removed.',
}));

// Blog post pages
app.get('/blog-post/:id', (req, res) => serveEntityPage(req, res, {
  staticFileName: `blog-post-${req.params.id}.html`,
  dbTable: 'blog_posts',
  dbColumn: 'id',
  dbValue: req.params.id,
  missingMessage: 'The blog post you are looking for does not exist or has been removed.',
}));

// Handle homepage - serve static HTML for crawlers (MUST be before static middleware and catch-all)
app.get('/', async (req, res) => {
  const userAgent = req.get('User-Agent') || '';
  // Enhanced crawler detection including ChatGPTBot explicitly
  const isCrawler = /bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|chatgptbot|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai|gpt/i.test(userAgent);
  
  console.log(`Homepage request - User-Agent: ${userAgent}, IsCrawler: ${isCrawler}`);
  
  if (isCrawler) {
    console.log('Crawler detected for homepage, serving static HTML');
    try {
      const { data, error } = await supabase.storage
        .from('static-pages')
        .download('index.html');
      
      if (error) {
        console.error('Error fetching index.html:', error);
        console.error('Error details:', JSON.stringify(error));
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        return;
      }
      
      const htmlContent = await data.text();
      res.set('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error('Error serving index.html:', error);
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// Serve static files from the dist directory (placed after homepage route to avoid intercepting it)
app.use(express.static(path.join(__dirname, 'dist'), {
  index: false // Don't serve index.html automatically - routes handle it
}));

// Handle about page - serve static HTML for crawlers
app.get('/about', async (req, res) => {
  const userAgent = req.get('User-Agent') || '';
  const isCrawler = /bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|chatgptbot|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai|gpt/i.test(userAgent);
  
  if (isCrawler) {
    console.log('Crawler detected for about page, serving static HTML');
    try {
      const { data, error } = await supabase.storage
        .from('static-pages')
        .download('about.html');
      
      if (error) {
        console.error('Error fetching about.html:', error);
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        return;
      }
      
      const htmlContent = await data.text();
      res.set('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error('Error serving about.html:', error);
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// Handle guide page - serve static HTML for crawlers
app.get('/guide', async (req, res) => {
  const userAgent = req.get('User-Agent') || '';
  const isCrawler = /bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|chatgptbot|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai|gpt/i.test(userAgent);
  
  if (isCrawler) {
    console.log('Crawler detected for guide page, serving static HTML');
    try {
      const { data, error } = await supabase.storage
        .from('static-pages')
        .download('guide.html');
      
      if (error) {
        console.error('Error fetching guide.html:', error);
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        return;
      }
      
      const htmlContent = await data.text();
      res.set('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error('Error serving guide.html:', error);
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// Handle catalog page - serve static HTML for crawlers
app.get('/catalog', async (req, res) => {
  const userAgent = req.get('User-Agent') || '';
  const isCrawler = /bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|chatgptbot|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai|gpt/i.test(userAgent);
  
  if (isCrawler) {
    console.log('Crawler detected for catalog page, serving static HTML');
    try {
      const { data, error } = await supabase.storage
        .from('static-pages')
        .download('catalog.html');
      
      if (error) {
        console.error('Error fetching catalog.html:', error);
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        return;
      }
      
      const htmlContent = await data.text();
      res.set('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error('Error serving catalog.html:', error);
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// (removed earlier catch-all; single catch-all kept at bottom to avoid intercepting dynamic routes)

// Country catalog pages
app.get('/catalog/:country', (req, res) => {
  const country = decodeURIComponent(req.params.country);
  return serveEntityPage(req, res, {
    staticFileName: `catalog-${encodeURIComponent(country)}.html`,
    dbTable: 'countries',
    dbColumn: 'name',
    dbValue: country,
    missingMessage: `The catalog for "${country}" does not exist.`,
  });
});

// Handle contact page - serve static HTML for crawlers
app.get('/contact', async (req, res) => {
  const userAgent = req.get('User-Agent') || '';
  const isCrawler = /bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|chatgptbot|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai|gpt/i.test(userAgent);
  
  if (isCrawler) {
    console.log('Crawler detected for contact page, serving static HTML');
    try {
      const { data, error } = await supabase.storage
        .from('static-pages')
        .download('contact.html');
      
      if (error) {
        console.error('Error fetching contact.html:', error);
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        return;
      }
      
      const htmlContent = await data.text();
      res.set('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error('Error serving contact.html:', error);
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// Helper for static info/legal pages — same crawler-vs-human pattern as
// /about, /guide, /contact. Cached static HTML for bots; React shell for humans.
async function serveStaticPage(req, res, file) {
  const isCrawler = CRAWLER_REGEX.test(req.get('User-Agent') || '');
  if (isCrawler) {
    try {
      const { data, error } = await supabase.storage.from('static-pages').download(file);
      if (!error && data) {
        const htmlContent = await data.text();
        res.set('Content-Type', 'text/html');
        return res.send(htmlContent);
      }
      console.error(`Error fetching ${file}:`, error);
    } catch (e) {
      console.error(`Error serving ${file}:`, e);
    }
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
}

// Legal/info static pages — own SSR HTML so they're not duplicates of the home shell.
app.get('/cookie-policy',    (req, res) => serveStaticPage(req, res, 'cookie-policy.html'));
app.get('/privacy',          (req, res) => serveStaticPage(req, res, 'privacy.html'));
app.get('/privacy-policy',   (req, res) => serveStaticPage(req, res, 'privacy.html'));
app.get('/terms',            (req, res) => serveStaticPage(req, res, 'terms.html'));
app.get('/terms-of-service', (req, res) => serveStaticPage(req, res, 'terms.html'));

// Handle marketplace page - serve static HTML for crawlers
app.get('/marketplace', async (req, res) => {
  const userAgent = req.get('User-Agent') || '';
  const isCrawler = /bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|chatgptbot|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai|gpt/i.test(userAgent);
  
  if (isCrawler) {
    console.log('Crawler detected for marketplace, serving static HTML');
    try {
      const { data, error } = await supabase.storage
        .from('static-pages')
        .download('marketplace.html');
      
      if (error) {
        console.error('Error fetching marketplace.html:', error);
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        return;
      }
      
      const htmlContent = await data.text();
      res.set('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error('Error serving marketplace.html:', error);
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// Marketplace item detail pages (listed)
app.get('/marketplace-item/:id', (req, res) => serveEntityPage(req, res, {
  staticFileName: `marketplace-item-${req.params.id}.html`,
  dbTable: 'marketplace_items',
  dbColumn: 'id',
  dbValue: req.params.id,
  missingMessage: 'The marketplace listing you are looking for does not exist or has been removed.',
}));

// Marketplace item detail pages (unlisted banknotes — own static file)
app.get('/marketplace-item-unlisted/:id', (req, res) => serveEntityPage(req, res, {
  staticFileName: `marketplace-item-unlisted-${req.params.id}.html`,
  dbTable: 'marketplace_items',
  dbColumn: 'id',
  dbValue: req.params.id,
  missingMessage: 'The marketplace listing you are looking for does not exist or has been removed.',
}));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).send('Internal Server Error');
});

// Handle client-side routing - send all requests to index.html (MUST be last - after all specific routes!)
app.get('*', (req, res) => {
  console.log(`Serving index.html for route: ${req.path}`);
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Static files served from: ${path.join(__dirname, 'dist')}`);
});

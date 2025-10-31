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

// Handle banknote detail pages - serve static HTML for crawlers
app.get('/catalog-banknote/:id', async (req, res) => {
  const banknoteId = req.params.id;
  const userAgent = req.get('User-Agent') || '';
  
  // Check if this is a crawler/bot
  const isCrawler = /bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|chatgptbot|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai|gpt/i.test(userAgent);
  
  if (isCrawler) {
    console.log(`Crawler detected for banknote ${banknoteId}, serving static HTML`);
    try {
      // Fetch static HTML from Supabase Storage
      const { data, error } = await supabase.storage
        .from('static-pages')
        .download(`catalog-banknote-${banknoteId}.html`);
      
      if (error) {
        console.error(`Error fetching static HTML for ${banknoteId}:`, error);
        // Fallback to React app
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        return;
      }
      
      // Convert blob to text
      const htmlContent = await data.text();
      res.set('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error(`Error serving static HTML for ${banknoteId}:`, error);
      // Fallback to React app
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  } else {
    // Regular users get the React app
    console.log(`Regular user for banknote ${banknoteId}, serving React app`);
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

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

// Handle forum posts - serve static HTML for crawlers
app.get('/forum/post/:id', async (req, res) => {
  const postId = req.params.id;
  const userAgent = req.get('User-Agent') || '';
  const isCrawler = /bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|chatgptbot|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai|gpt/i.test(userAgent);
  
  if (isCrawler) {
    console.log(`Crawler detected for forum post ${postId}, serving static HTML`);
    try {
      const { data, error } = await supabase.storage
        .from('static-pages')
        .download(`forum-post-${postId}.html`);
      
      if (error) {
        console.error(`Error fetching forum-post-${postId}.html:`, error);
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        return;
      }
      
      const htmlContent = await data.text();
      res.set('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error(`Error serving forum-post-${postId}.html:`, error);
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// Handle blog posts - serve static HTML for crawlers
app.get('/blog/post/:id', async (req, res) => {
  const postId = req.params.id;
  const userAgent = req.get('User-Agent') || '';
  const isCrawler = /bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|chatgptbot|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai|gpt/i.test(userAgent);
  
  if (isCrawler) {
    console.log(`Crawler detected for blog post ${postId}, serving static HTML`);
    try {
      const { data, error } = await supabase.storage
        .from('static-pages')
        .download(`blog-post-${postId}.html`);
      
      if (error) {
        console.error(`Error fetching blog-post-${postId}.html:`, error);
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        return;
      }
      
      const htmlContent = await data.text();
      res.set('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error(`Error serving blog-post-${postId}.html:`, error);
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

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

// Handle country catalog pages - serve static HTML for crawlers
app.get('/catalog/:country', async (req, res) => {
  const country = decodeURIComponent(req.params.country);
  const userAgent = req.get('User-Agent') || '';
  const isCrawler = /bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|chatgptbot|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai|gpt/i.test(userAgent);
  
  if (isCrawler) {
    console.log(`Crawler detected for country ${country}, serving static HTML`);
    try {
      const { data, error } = await supabase.storage
        .from('static-pages')
        .download(`catalog-${country}.html`);
      
      if (error) {
        console.error(`Error fetching catalog-${country}.html:`, error);
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        return;
      }
      
      const htmlContent = await data.text();
      res.set('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error(`Error serving catalog-${country}.html:`, error);
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
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

// Handle marketplace item detail pages - serve static HTML for crawlers
app.get('/marketplace-item/:id', async (req, res) => {
  const itemId = req.params.id;
  const userAgent = req.get('User-Agent') || '';
  const isCrawler = /bot|crawler|spider|crawling|facebook|twitter|linkedin|whatsapp|telegram|discord|pinterest|chatgpt|chatgptbot|openai|claude|anthropic|gemini|google-ai|bing-ai|perplexity|ai|gpt/i.test(userAgent);
  
  if (isCrawler) {
    console.log(`Crawler detected for marketplace item ${itemId}, serving static HTML`);
    try {
      const { data, error } = await supabase.storage
        .from('static-pages')
        .download(`marketplace-item-${itemId}.html`);
      
      if (error) {
        console.error(`Error fetching marketplace-item-${itemId}.html:`, error);
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        return;
      }
      
      const htmlContent = await data.text();
      res.set('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error(`Error serving marketplace-item-${itemId}.html:`, error);
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

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
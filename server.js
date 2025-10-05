import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Get port from environment variable (Cloud Run sets this)
const PORT = process.env.PORT || 8080;

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint (must be before the catch-all route)
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).send('healthy');
});

// Proxy sitemap.xml to dynamic Supabase sitemap with fallback
app.get('/sitemap.xml', async (req, res) => {
  console.log('Sitemap requested, proxying to Supabase function');
  
  // Set timeout for the request (5 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch('https://psnzolounfwgvkupepxb.supabase.co/functions/v1/generate-sitemap', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/xml',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzbnpvbG91bmZ3Z3ZrdXBlcHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4NTk0NTksImV4cCI6MjA1OTQzNTQ1OX0.iIE3DilRwCum5BZiVa-W3nLCAV2EEwzd2h8XDvNdhF8'}`,
        'User-Agent': 'OttoCollect-Sitemap-Generator/1.0'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Supabase function returned ${response.status}: ${response.statusText}`);
    }
    
    const sitemapContent = await response.text();
    
    // Check if the response is actually XML
    if (!sitemapContent.startsWith('<?xml')) {
      console.error('Invalid sitemap response:', sitemapContent);
      throw new Error('Invalid sitemap response from Supabase function');
    }
    
    console.log('Dynamic sitemap generated successfully');
    res.set({
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });
    res.send(sitemapContent);
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Error fetching dynamic sitemap, serving fallback:', error.message);
    
    // Serve fallback static sitemap
    try {
      const fallbackSitemap = await import('fs').then(fs => 
        fs.readFileSync(path.join(__dirname, 'public', 'sitemap-fallback.xml'), 'utf8')
      );
      
      res.set({
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300' // Cache fallback for 5 minutes
      });
      res.send(fallbackSitemap);
      console.log('Fallback sitemap served successfully');
    } catch (fallbackError) {
      console.error('Error serving fallback sitemap:', fallbackError);
      res.status(500).send('Error generating sitemap');
    }
  }
});

// Handle client-side routing - send all requests to index.html
app.get('*', (req, res) => {
  console.log(`Serving index.html for route: ${req.path}`);
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).send('Internal Server Error');
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Static files served from: ${path.join(__dirname, 'dist')}`);
});

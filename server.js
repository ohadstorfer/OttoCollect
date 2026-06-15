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

// Returns true if a row with column=value exists in `table`.
//
// History: we tried two supabase-js patterns ({ count: 'exact', head: true }
// and .select().limit(1)) and both fail uniformly in production. Diagnosis:
// the SUPABASE_SERVICE_ROLE_KEY env var is unset on Cloud Run, so the global
// supabase client falls back to a literal placeholder and every DB request
// gets a 401. Storage download still works because static-pages is a public
// bucket. So we sidestep the global client entirely and hit PostgREST with
// the public anon key — "anon can see this row" is also the correct SEO
// semantic for existence checks: visible to the world = indexable.
// Fail-CLOSED on errors: a 404 with `noindex,follow` is safer for SEO than
// serving a homepage-shell duplicate.
const SUPABASE_REST_URL = (process.env.SUPABASE_URL || 'https://psnzolounfwgvkupepxb.supabase.co') + '/rest/v1';
const SUPABASE_PUBLIC_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzbnpvbG91bmZ3Z3ZrdXBlcHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4NTk0NTksImV4cCI6MjA1OTQzNTQ1OX0.iIE3DilRwCum5BZiVa-W3nLCAV2EEwzd2h8XDvNdhF8';
async function dbHas(table, column, value) {
  try {
    const url = `${SUPABASE_REST_URL}/${encodeURIComponent(table)}?select=${encodeURIComponent(column)}&${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}&limit=1`;
    const r = await fetch(url, {
      headers: { apikey: SUPABASE_PUBLIC_KEY, Authorization: `Bearer ${SUPABASE_PUBLIC_KEY}` },
    });
    if (!r.ok) {
      console.error(`dbHas ${table}.${column} HTTP ${r.status}`);
      return false;
    }
    const rows = await r.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch (e) {
    console.error(`dbHas ${table}.${column} threw:`, e);
    return false;
  }
}

// Returns true if a banknote is INDEXABLE — approved. This mirrors the exact
// inclusion criteria of both the sitemap and the static-page generator, so it
// identifies banknotes that *should* have a static file but may not yet (the
// static bucket is regenerated on a cron, while the sitemap is real-time — so a
// freshly-approved banknote can be advertised in the sitemap before its static
// HTML exists). For those we serve the React shell (200, JS-rendered into the
// real page) instead of a hard 404, which would otherwise surface as "Submitted
// URL not found (404)" in Search Console. The imageless "thin" filter was
// intentionally removed, so all approved banknotes are indexable regardless of
// whether they have a front image; only unapproved/deleted banknotes get the 404.
async function banknoteIsIndexable(id) {
  try {
    const url = `${SUPABASE_REST_URL}/detailed_banknotes?id=eq.${encodeURIComponent(id)}&select=is_approved&limit=1`;
    const r = await fetch(url, {
      headers: { apikey: SUPABASE_PUBLIC_KEY, Authorization: `Bearer ${SUPABASE_PUBLIC_KEY}` },
    });
    if (!r.ok) {
      console.error(`banknoteIsIndexable HTTP ${r.status}`);
      return false;
    }
    const rows = await r.json();
    const row = Array.isArray(rows) && rows[0];
    return !!(row && row.is_approved);
  } catch (e) {
    console.error('banknoteIsIndexable threw:', e);
    return false;
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

  // Only crawlers get a hard 404 for a missing entity (so Google removes the URL
  // with noindex). Humans always fall through to the React shell, which renders
  // its own client-side not-found — we never strand a real user on a dead page.
  if (isCrawler && !(await dbHas(opts.dbTable, opts.dbColumn, opts.dbValue))) {
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

// Canonicalise host + trailing slash in a SINGLE 301 hop:
//   - www.ottocollect.com -> ottocollect.com (no www/non-www duplicate content)
//   - /foo/ -> /foo (no trailing-slash duplicate showing as "Alternative page
//     with proper canonical tag" in Search Console)
// Both are handled together so e.g. www.ottocollect.com/forum/ redirects straight
// to https://ottocollect.com/forum without a redirect chain. Cloud Run sits behind
// a proxy, so the real host is in x-forwarded-host. Query string is preserved.
app.use((req, res, next) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const isWww = host.startsWith('www.');
  const hasTrailingSlash = req.path.length > 1 && req.path.endsWith('/');
  if (isWww || hasTrailingSlash) {
    const path = hasTrailingSlash ? req.path.slice(0, -1) : req.path;
    const query = req.url.slice(req.path.length); // preserves ?query
    const target = (isWww ? 'https://ottocollect.com' : '') + path + query;
    return res.redirect(301, target);
  }
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
// Banknote pages: the pre-rendered SSR file is the primary source of truth. The
// regen function generates files for every approved banknote (with or without an
// image — the imageless "thin" filter was intentionally removed), matching the
// sitemap. So for crawlers, "no static file" usually means "not indexable". BUT
// the sitemap is real-time while the static bucket is regenerated on a cron, so a
// freshly approved banknote can be in the sitemap before its static HTML exists.
// To avoid surfacing "Submitted URL not found (404)" for those, we fall back to
// the React shell (200, JS-rendered) ONLY when the banknote genuinely qualifies
// for indexing (approved). Unapproved/deleted banknotes still 404 (noindex,follow).
// Humans always get the app.
app.get('/catalog-banknote/:id', async (req, res) => {
  const isCrawler = CRAWLER_REGEX.test(req.get('User-Agent') || '');
  if (!isCrawler) {
    return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }

  const file = `catalog-banknote-${req.params.id}.html`;
  // Indexability is the gate, NOT "does a static file exist". A static file can
  // be STALE: a banknote can lose its approval (or be deleted) after its HTML was
  // generated, but the orphaned file lingers in the bucket until the next purge.
  // Serving that orphan with HTTP 200 makes an unapproved banknote look indexable
  // to Google. So we re-verify indexability live and only serve the static file
  // when the banknote still qualifies. Fetch both in parallel to keep latency
  // ~equal to the download alone.
  const [download, indexable] = await Promise.all([
    supabase.storage.from('static-pages').download(file).catch((e) => {
      console.error(`Error fetching ${file}:`, e);
      return { data: null, error: e };
    }),
    banknoteIsIndexable(req.params.id),
  ]);

  // Not indexable (unapproved / deleted) → hard 404 noindex, even if a stale
  // static file still exists in the bucket.
  if (!indexable) {
    return send404Html(res, 'The banknote you are looking for does not exist or has been removed.');
  }

  // Indexable + static file present → serve the pre-rendered HTML.
  const { data, error } = download;
  if (!error && data) {
    res.set('Content-Type', 'text/html');
    return res.send(await data.text());
  }

  // Indexable but no static file yet (sitemap is real-time, the static bucket is
  // regenerated on a cron) → serve the React shell so Googlebot renders the real
  // page instead of seeing a 404.
  console.log(`No static file for ${file} but banknote is indexable — serving React shell (regen lag).`);
  return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
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

// Guide / FAQ entry pages
app.get('/guide-post/:id', (req, res) => serveEntityPage(req, res, {
  staticFileName: `guide-post-${req.params.id}.html`,
  dbTable: 'qa_entries',
  dbColumn: 'id',
  dbValue: req.params.id,
  missingMessage: 'The FAQ entry you are looking for does not exist or has been removed.',
}));

// Profile pages: validate the username exists in `profiles` so bogus profiles
// (and the literal "/profile/:username" string that leaks from the React Router
// config inside the JS bundle — Google has been discovering it from rendered
// JS) 404 cleanly instead of serving the home shell as a duplicate.
// No pre-rendered SSR for profiles — humans get the React app, bots get 404
// for unknown usernames and the React shell for real ones.
// The :username param can be either a UUID (many in-app links use the user's id —
// messages, footer, marketplace seller, forum/blog avatars) or a real username, so
// validate against the matching column. Mirrors getUserProfile() on the client.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const profileEntityOpts = (param) => {
  const value = decodeURIComponent(param);
  return {
    dbTable: 'profiles',
    dbColumn: UUID_RE.test(value) ? 'id' : 'username',
    dbValue: value,
    missingMessage: `The profile "${value}" does not exist.`,
  };
};
app.get('/profile/:username', (req, res) => serveEntityPage(req, res, profileEntityOpts(req.params.username)));
app.get('/profile/:username/:country', (req, res) => serveEntityPage(req, res, profileEntityOpts(req.params.username)));

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
app.get('/community',        (req, res) => serveStaticPage(req, res, 'community.html'));
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

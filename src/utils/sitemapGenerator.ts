// Sitemap Generator for OttoCollect SEO

export interface SitemapUrl {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export interface SitemapConfig {
  baseUrl: string;
  urls: SitemapUrl[];
}

// Generate sitemap XML
export const generateSitemapXML = (config: SitemapConfig): string => {
  const { baseUrl, urls } = config;
  
  const xmlUrls = urls.map(url => {
    const lastmod = url.lastmod ? `    <lastmod>${url.lastmod}</lastmod>` : '';
    const changefreq = url.changefreq ? `    <changefreq>${url.changefreq}</changefreq>` : '';
    const priority = url.priority ? `    <priority>${url.priority}</priority>` : '';
    
    return `  <url>
    <loc>${baseUrl}${url.url}</loc>${lastmod}${changefreq}${priority}
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls}
</urlset>`;
};

// Default sitemap configuration for OttoCollect
export const getDefaultSitemapConfig = (): SitemapConfig => {
  const baseUrl = 'https://ottocollect.com';
  const currentDate = new Date().toISOString().split('T')[0];
  
  return {
    baseUrl,
    urls: [
      // Main pages
      {
        url: '/',
        lastmod: currentDate,
        changefreq: 'daily',
        priority: 1.0
      },
      {
        url: '/home',
        lastmod: currentDate,
        changefreq: 'daily',
        priority: 0.9
      },
      {
        url: '/catalog',
        lastmod: currentDate,
        changefreq: 'weekly',
        priority: 0.9
      },
      {
        url: '/marketplace',
        lastmod: currentDate,
        changefreq: 'daily',
        priority: 0.8
      },
      {
        url: '/collection',
        lastmod: currentDate,
        changefreq: 'weekly',
        priority: 0.8
      },
      {
        url: '/community',
        lastmod: currentDate,
        changefreq: 'daily',
        priority: 0.7
      },
      {
        url: '/forum',
        lastmod: currentDate,
        changefreq: 'daily',
        priority: 0.7
      },
      {
        url: '/blog',
        lastmod: currentDate,
        changefreq: 'weekly',
        priority: 0.7
      },
      {
        url: '/members',
        lastmod: currentDate,
        changefreq: 'weekly',
        priority: 0.6
      },
      {
        url: '/about',
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.5
      },
      {
        url: '/contact',
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.5
      },
      {
        url: '/privacy',
        lastmod: currentDate,
        changefreq: 'yearly',
        priority: 0.3
      },
      {
        url: '/terms',
        lastmod: currentDate,
        changefreq: 'yearly',
        priority: 0.3
      },
      {
        url: '/cookie-policy',
        lastmod: currentDate,
        changefreq: 'yearly',
        priority: 0.3
      }
    ]
  };
};

// Generate sitemap for banknotes
export const generateBanknoteSitemap = (banknotes: any[]): SitemapUrl[] => {
  const currentDate = new Date().toISOString().split('T')[0];
  
  return banknotes.map(banknote => ({
    url: `/banknote-details/${banknote.id}`,
    lastmod: currentDate,
    changefreq: 'monthly',
    priority: 0.8
  }));
};

// Generate sitemap for countries
export const generateCountrySitemap = (countries: string[]): SitemapUrl[] => {
  const currentDate = new Date().toISOString().split('T')[0];
  
  return countries.map(country => ({
    url: `/catalog/${encodeURIComponent(country)}`,
    lastmod: currentDate,
    changefreq: 'weekly',
    priority: 0.7
  }));
};

// Generate sitemap for blog posts
export const generateBlogSitemap = (blogPosts: any[]): SitemapUrl[] => {
  const currentDate = new Date().toISOString().split('T')[0];
  
  return blogPosts.map(post => ({
    url: `/blog-post/${post.id}`,
    lastmod: post.updatedAt ? new Date(post.updatedAt).toISOString().split('T')[0] : currentDate,
    changefreq: 'monthly',
    priority: 0.6
  }));
};

// Generate robots.txt content
export const generateRobotsTxt = (baseUrl: string = 'https://ottocollect.com'): string => {
  return `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin and private areas
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /static/

# Allow important pages
Allow: /catalog/
Allow: /marketplace/
Allow: /collection/
Allow: /blog/
Allow: /community/

# Crawl delay (optional)
Crawl-delay: 1`;
};

// SEO utility functions
export const generateCanonicalUrl = (path: string, baseUrl: string = 'https://ottocollect.com'): string => {
  return `${baseUrl}${path}`;
};

export const generateMetaDescription = (content: string, maxLength: number = 160): string => {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength - 3) + '...';
};

export const generatePageTitle = (title: string, siteName: string = 'OttoCollect'): string => {
  return `${title} | ${siteName}`;
};

// Keyword density checker
export const checkKeywordDensity = (text: string, keyword: string): number => {
  const words = text.toLowerCase().split(/\s+/);
  const keywordCount = words.filter(word => word.includes(keyword.toLowerCase())).length;
  return (keywordCount / words.length) * 100;
};

// SEO score calculator
export const calculateSEOScore = (pageData: {
  title: string;
  description: string;
  keywords: string[];
  content: string;
  hasStructuredData: boolean;
  hasImages: boolean;
  imageAltTags: boolean;
}): number => {
  let score = 0;
  
  // Title optimization (0-20 points)
  if (pageData.title.length >= 30 && pageData.title.length <= 60) score += 20;
  else if (pageData.title.length > 0) score += 10;
  
  // Description optimization (0-20 points)
  if (pageData.description.length >= 120 && pageData.description.length <= 160) score += 20;
  else if (pageData.description.length > 0) score += 10;
  
  // Keywords presence (0-20 points)
  if (pageData.keywords.length >= 5) score += 20;
  else if (pageData.keywords.length > 0) score += 10;
  
  // Content length (0-20 points)
  if (pageData.content.length >= 300) score += 20;
  else if (pageData.content.length > 0) score += 10;
  
  // Structured data (0-10 points)
  if (pageData.hasStructuredData) score += 10;
  
  // Images with alt tags (0-10 points)
  if (pageData.hasImages && pageData.imageAltTags) score += 10;
  
  return score;
}; 
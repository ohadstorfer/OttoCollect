import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  banknoteData?: {
    id?: string;
    country?: string;
    denomination?: string;
    year?: string;
    extendedPickNumber?: string;
    condition?: string;
    price?: number;
    currency?: string;
  };
  structuredData?: object;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  keywords = [],
  image = '/images/ottoman-empire.jpg',
  url,
  type = 'website',
  banknoteData,
  structuredData
}) => {
  // Default SEO for Ottoman Empire banknotes
  const defaultTitle = 'OttoCollect - Ottoman Empire Banknotes Catalog & Collectors Platform';
  const defaultDescription = 'OttoCollect is a comprehensive catalog and management platform dedicated to collectors of Ottoman Empire banknotes and those from successor countries since 1840. Our mission is to document and preserve numismatic history while supporting a vibrant community of collectors of Ottoman Empire banknotes and those from successor countries since 1840. Collectors can track personal collections, share images, contribute to the catalog, and connect with enthusiasts worldwide.';
  const defaultKeywords = [
    'Ottoman Empire banknotes',
    'Turkish lira paper money',
    'historical currency',
    'rare banknotes',
    'collector banknotes',
    '1800s currency',
    'Ottoman currency',
    'Turkish banknotes',
    'vintage paper money',
    'numismatic collection'
  ];

  // Generate dynamic title and description for banknote pages
  const generateBanknoteSEO = () => {
    if (!banknoteData) return { title: defaultTitle, description: defaultDescription };

    const { country, denomination, year, extendedPickNumber, condition, price, currency } = banknoteData;
    
    const banknoteTitle = `${denomination} ${country} Banknote ${year} - Authentic Historical Currency | OttoCollect`;
    const banknoteDescription = `Buy authentic ${denomination} ${country} banknote from ${year} (Pick #${extendedPickNumber}). ${condition ? `${condition} condition.` : ''} ${price ? `Price: ${price} ${currency}.` : ''} Rare historical currency for serious collectors.`;

    return {
      title: banknoteTitle,
      description: banknoteDescription,
      keywords: [
        `${country} banknote`,
        `${denomination} ${country}`,
        `${year} ${country} currency`,
        `Pick ${extendedPickNumber}`,
        'authentic Ottoman banknote',
        'historical Turkish currency',
        'rare paper money',
        'collector banknote',
        ...defaultKeywords
      ]
    };
  };

  const seoData = banknoteData ? generateBanknoteSEO() : {
    title: title || defaultTitle,
    description: description || defaultDescription,
    keywords: [...keywords, ...defaultKeywords]
  };

  // Generate structured data for banknotes
  const generateStructuredData = () => {
    if (!banknoteData) return structuredData;

    const { country, denomination, year, extendedPickNumber, condition, price, currency } = banknoteData;
    
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": `${denomination} ${country} Banknote ${year}`,
      "description": seoData.description,
      "image": image,
      "url": url || window.location.href,
      "brand": {
        "@type": "Brand",
        "name": country
      },
      "category": "Collectible Currency",
      "condition": condition || "Used",
      "offers": price ? {
        "@type": "Offer",
        "price": price,
        "priceCurrency": currency || "USD",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": "OttoCollect"
        }
      } : undefined,
      "additionalProperty": [
        {
          "@type": "PropertyValue",
          "name": "Year",
          "value": year
        },
        {
          "@type": "PropertyValue", 
          "name": "Pick Number",
          "value": extendedPickNumber
        },
        {
          "@type": "PropertyValue",
          "name": "Country",
          "value": country
        }
      ]
    };
  };

  const finalStructuredData = generateStructuredData();

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{seoData.title}</title>
      <meta name="description" content={seoData.description} />
      <meta name="keywords" content={seoData.keywords.join(', ')} />
      <meta name="robots" content="index, follow" />
      <meta name="author" content="OttoCollect" />
      
      {/* Canonical URL */}
      {url && <link rel="canonical" href={url} />}
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={seoData.title} />
      <meta property="og:description" content={seoData.description} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url || window.location.href} />
      <meta property="og:site_name" content="OttoCollect" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoData.title} />
      <meta name="twitter:description" content={seoData.description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@ottocollect" />
      
      {/* Favicon configuration for Google Search Results */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
      <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
      <link rel="icon" type="image/png" sizes="192x192" href="/web-app-manifest-192x192.png" />
      <link rel="icon" type="image/png" sizes="512x512" href="/web-app-manifest-512x512.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />
      
      {/* Microsoft Tiles */}
      <meta name="msapplication-TileImage" content="/web-app-manifest-192x192.png" />
      <meta name="msapplication-TileColor" content="#1f2937" />
      
      {/* Google-specific favicon meta tags */}
      <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <meta itemProp="image" content="https://ottocollect.com/web-app-manifest-192x192.png" />
      
      {/* Additional SEO Meta Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#1f2937" />
      
      {/* Structured Data */}
      {finalStructuredData && (
        <script type="application/ld+json">
          {JSON.stringify(finalStructuredData)}
        </script>
      )}
      
      {/* Additional structured data for organization */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "OttoCollect",
          "url": "https://ottocollect.com",
          "logo": "https://ottocollect.com/logo.png",
          "description": "Premier marketplace for Ottoman Empire banknotes and historical currency",
          "sameAs": [
            "https://twitter.com/ottocollect",
            "https://facebook.com/ottocollect"
          ],
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer service",
            "email": "support@ottocollect.com"
          }
        })}
      </script>
      
      {/* Breadcrumb structured data */}
      {banknoteData && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://ottocollect.com"
              },
              {
                "@type": "ListItem", 
                "position": 2,
                "name": "Catalog",
                "item": "https://ottocollect.com/catalog"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": banknoteData.country || "Banknotes",
                "item": `https://ottocollect.com/catalog/${encodeURIComponent(banknoteData.country || '')}`
              },
              {
                "@type": "ListItem",
                "position": 4,
                "name": `${banknoteData.denomination} ${banknoteData.year}`,
                "item": url || window.location.href
              }
            ]
          })}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead; 
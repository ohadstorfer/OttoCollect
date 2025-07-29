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
  const defaultTitle = 'OttoCollect - Authentic Ottoman Empire Banknotes for Collectors';
  const defaultDescription = 'Discover rare and authentic Ottoman Empire banknotes, Turkish lira paper money, and historical currency from the 1800s. Buy, sell, and trade with collectors worldwide.';
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
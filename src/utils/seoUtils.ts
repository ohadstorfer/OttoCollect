// SEO utility functions for OttoCollect

export interface PageSEO {
  title: string;
  description: string;
  keywords: string[];
  canonical?: string;
  noindex?: boolean;
  image?: string;
  type?: 'website' | 'article' | 'product' | 'collection' | 'profile';
}

// Generate SEO data for different page types
export const generatePageSEO = (pageType: string, data?: any): PageSEO => {
  const baseUrl = 'https://ottocollect.com';
  
  switch (pageType) {
    case 'home':
      return {
        title: 'OttoCollect - Ottoman Empire Banknotes Catalog & Collectors Platform',
        description: 'Discover authentic Ottoman Empire banknotes, rare Turkish lira paper money, and historical currency from the 1800s. Join thousands of collectors buying, selling, and trading vintage Turkish banknotes worldwide.',
        keywords: [
          'authentic Ottoman Empire banknotes for collectors',
          'buy rare Ottoman currency from 1800s',
          'historical Turkish lira paper money for sale',
          'Ottoman Empire numismatic collection',
          'vintage Turkish banknotes for sale',
          'rare Ottoman paper money collectors'
        ],
        canonical: baseUrl,
        image: '/OttoCollectIcon.PNG',
        type: 'website'
      };

    case 'catalog':
      return {
        title: 'Ottoman Empire Banknote Catalog - Complete Historical Currency Collection',
        description: 'Browse our comprehensive catalog of Ottoman Empire banknotes, Turkish Republic currency, and historical paper money. Find rare collectible banknotes from Turkey, Palestine, Syria, and more.',
        keywords: [
          'Ottoman Empire banknote catalog',
          'complete Turkish currency collection',
          'historical banknotes by country',
          'rare Ottoman paper money catalog',
          'authentic Turkish banknotes list'
        ],
        canonical: `${baseUrl}/catalog`,
        image: '/OttoCollectIcon.PNG',
        type: 'collection'
      };

    case 'marketplace':
      return {
        title: 'Buy & Sell Ottoman Empire Banknotes - Historical Currency Marketplace',
        description: 'Buy and sell authentic Ottoman Empire banknotes, rare Turkish currency, and historical paper money. Secure marketplace for serious collectors and numismatic enthusiasts.',
        keywords: [
          'buy Ottoman Empire banknotes online',
          'sell rare Turkish currency',
          'Ottoman banknote marketplace',
          'historical currency trading',
          'rare paper money for sale'
        ],
        canonical: `${baseUrl}/marketplace`,
        image: '/OttoCollectIcon.PNG',
        type: 'website'
      };

    case 'collection':
      return {
        title: 'Manage Your Ottoman Banknote Collection - Personal Currency Portfolio',
        description: 'Organize and track your Ottoman Empire banknote collection. Catalog your rare Turkish currency, monitor values, and showcase your historical paper money portfolio.',
        keywords: [
          'personal Ottoman banknote collection',
          'Turkish currency collection management',
          'historical banknote portfolio',
          'rare currency collection tracking',
          'Ottoman Empire numismatic inventory'
        ],
        canonical: `${baseUrl}/collection`,
        image: '/OttoCollectIcon.PNG',
        type: 'collection'
      };

    case 'community':
      return {
        title: 'OttoCollect Community - Connect with Ottoman Banknote Collectors',
        description: 'Join the OttoCollect community of Ottoman Empire banknote collectors. Connect with fellow enthusiasts, share knowledge, and grow your collection through community engagement.',
        keywords: [
          'Ottoman banknote collectors community',
          'numismatic community',
          'collector networking',
          'banknote discussion forum',
          'collector messaging'
        ],
        canonical: `${baseUrl}/community`,
        image: '/OttoCollectIcon.PNG',
        type: 'website'
      };

    case 'about':
      return {
        title: 'About OttoCollect - Ottoman Empire Banknote Collectors Platform',
        description: 'Learn about OttoCollect, the premier platform for Ottoman Empire banknote collectors. Discover our mission to preserve numismatic history and connect collectors worldwide.',
        keywords: [
          'about OttoCollect',
          'Ottoman banknote platform',
          'numismatic history preservation',
          'collector community platform',
          'Ottoman Empire currency collectors'
        ],
        canonical: `${baseUrl}/about`,
        image: '/OttoCollectIcon.PNG',
        type: 'website'
      };

    case 'banknote-detail':
      if (!data) return generatePageSEO('catalog');
      const { country, denomination, year, extendedPickNumber } = data;
      return {
        title: `${denomination} ${country} Banknote ${year} - Authentic Historical Currency | OttoCollect`,
        description: `Buy authentic ${denomination} ${country} banknote from ${year} (Pick #${extendedPickNumber}). Rare historical currency for serious collectors.`,
        keywords: [
          `${country} banknote`,
          `${denomination} ${country}`,
          `${year} ${country} currency`,
          `Pick ${extendedPickNumber}`,
          'authentic Ottoman banknote',
          'historical Turkish currency',
          'rare paper money',
          'collector banknote'
        ],
        canonical: `${baseUrl}/banknote-details/${data.id}`,
        image: data.image || '/OttoCollectIcon.PNG',
        type: 'product'
      };

    case 'country-detail':
      if (!data) return generatePageSEO('catalog');
      const { countryName } = data;
      return {
        title: `${countryName} Banknotes - Historical Currency Collection | OttoCollect`,
        description: `Browse authentic ${countryName} banknotes and historical currency. Rare collectible paper money from ${countryName} for serious numismatic collectors.`,
        keywords: [
          `${countryName} banknotes`,
          `${countryName} currency`,
          `${countryName} paper money`,
          `historical ${countryName} banknotes`,
          `rare ${countryName} currency`,
          'Ottoman Empire banknotes',
          'collectible currency'
        ],
        canonical: `${baseUrl}/catalog/${encodeURIComponent(countryName)}`,
        image: '/OttoCollectIcon.PNG',
        type: 'collection'
      };

    case 'profile':
      if (!data) return generatePageSEO('community');
      const { username } = data;
      return {
        title: `${username}'s Ottoman Banknote Collection | OttoCollect`,
        description: `View ${username}'s Ottoman Empire banknote collection. Discover rare Turkish currency and historical paper money from fellow collectors.`,
        keywords: [
          `${username} banknote collection`,
          'Ottoman banknote collector profile',
          'Turkish currency collection',
          'numismatic collector profile',
          'banknote collection showcase'
        ],
        canonical: `${baseUrl}/profile/${username}`,
        image: '/OttoCollectIcon.PNG',
        type: 'profile'
      };

    case 'blog':
      return {
        title: 'Ottoman Banknote Blog - Numismatic Education & History',
        description: 'Expert articles on Ottoman Empire banknotes, Turkish currency history, authentication guides, and numismatic education. Learn about rare paper money and historical currency.',
        keywords: [
          'Ottoman banknote blog',
          'Turkish currency history',
          'numismatic education',
          'banknote authentication guides',
          'historical currency articles'
        ],
        canonical: `${baseUrl}/blog`,
        image: '/OttoCollectIcon.PNG',
        type: 'website'
      };

    case 'guide':
      return {
        title: 'Ottoman Banknote Collecting Guide - Expert Tips & Authentication',
        description: 'Complete guide to collecting Ottoman Empire banknotes. Learn authentication techniques, grading standards, and preservation methods from numismatic experts.',
        keywords: [
          'Ottoman banknote collecting guide',
          'Turkish currency authentication',
          'banknote grading guide',
          'numismatic education',
          'collector tips and tricks'
        ],
        canonical: `${baseUrl}/guide`,
        image: '/OttoCollectIcon.PNG',
        type: 'website'
      };

    default:
      return {
        title: 'OttoCollect - Ottoman Empire Banknotes Catalog & Collectors Platform',
        description: 'OttoCollect is a comprehensive catalog and management platform dedicated to collectors of Ottoman Empire banknotes and those from successor countries since 1840.',
        keywords: [
          'Ottoman Empire banknotes',
          'Turkish lira paper money',
          'historical currency',
          'rare banknotes',
          'collector banknotes'
        ],
        canonical: baseUrl,
        image: '/OttoCollectIcon.PNG',
        type: 'website'
      };
  }
};

// Generate structured data for different page types
export const generateStructuredData = (pageType: string, data?: any) => {
  const baseUrl = 'https://ottocollect.com';
  
  switch (pageType) {
    case 'banknote-detail':
      if (!data) return null;
      const { country, denomination, year, extendedPickNumber, condition, price, currency } = data;
      return {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": `${denomination} ${country} Banknote ${year}`,
        "description": `Authentic ${denomination} ${country} banknote from ${year}`,
        "image": data.image || `${baseUrl}/OttoCollectIcon.PNG`,
        "url": `${baseUrl}/banknote-details/${data.id}`,
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
        } : undefined
      };

    case 'collection':
      return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Ottoman Empire Banknotes Collection",
        "description": "Browse and discover authentic Ottoman Empire banknotes and historical currency",
        "url": `${baseUrl}/catalog`,
        "mainEntity": {
          "@type": "ItemList",
          "name": "Ottoman Empire Banknotes",
          "description": "Comprehensive collection of Ottoman Empire banknotes and successor country currencies"
        }
      };

    case 'profile':
      if (!data) return null;
      return {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "name": `${data.username}'s Collection`,
        "description": `View ${data.username}'s Ottoman Empire banknote collection`,
        "url": `${baseUrl}/profile/${data.username}`,
        "mainEntity": {
          "@type": "Person",
          "name": data.username,
          "description": "Ottoman Empire banknote collector"
        }
      };

    default:
      return null;
  }
};

// Generate breadcrumb structured data
export const generateBreadcrumbData = (items: Array<{name: string, url: string}>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url
  }))
});

// Validate SEO data
export const validateSEO = (seo: PageSEO): string[] => {
  const errors: string[] = [];
  
  if (!seo.title || seo.title.length < 30) {
    errors.push('Title should be at least 30 characters long');
  }
  
  if (seo.title && seo.title.length > 60) {
    errors.push('Title should be less than 60 characters long');
  }
  
  if (!seo.description || seo.description.length < 120) {
    errors.push('Description should be at least 120 characters long');
  }
  
  if (seo.description && seo.description.length > 160) {
    errors.push('Description should be less than 160 characters long');
  }
  
  if (!seo.keywords || seo.keywords.length === 0) {
    errors.push('Keywords should not be empty');
  }
  
  return errors;
};


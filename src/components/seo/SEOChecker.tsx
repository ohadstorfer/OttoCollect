import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { validateSEO, generatePageSEO } from '@/utils/seoUtils';

interface SEOCheckerProps {
  enabled?: boolean;
}

const SEOChecker: React.FC<SEOCheckerProps> = ({ enabled = process.env.NODE_ENV === 'development' }) => {
  const location = useLocation();
  const [seoIssues, setSeoIssues] = useState<string[]>([]);
  const [seoData, setSeoData] = useState<{
    title?: string;
    description?: string;
    keywords?: string;
    canonical?: string;
    h1?: string;
    imagesWithoutAlt?: number;
    structuredDataCount?: number;
  }>({});

  useEffect(() => {
    if (!enabled) return;

    const checkSEO = () => {
      const issues: string[] = [];
      
      // Check for required meta tags
      const title = document.querySelector('title')?.textContent;
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content');
      const keywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content');
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
      const h1 = document.querySelector('h1')?.textContent;
      const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
      const structuredData = document.querySelectorAll('script[type="application/ld+json"]');
      
      // Store SEO data for detailed logging
      const currentSeoData = {
        title,
        description,
        keywords,
        canonical,
        h1,
        imagesWithoutAlt: imagesWithoutAlt.length,
        structuredDataCount: structuredData.length
      };
      setSeoData(currentSeoData);
      
      // Check title
      if (!title) {
        issues.push('Missing <title> tag');
      } else if (title.length < 30) {
        issues.push(`Title too short (should be at least 30 characters): "${title}" (${title.length} chars)`);
      } else if (title.length > 60) {
        issues.push(`Title too long (should be less than 60 characters): "${title}" (${title.length} chars)`);
      }
      
      // Check description
      if (!description) {
        issues.push('Missing meta description');
      } else if (description.length < 120) {
        issues.push(`Description too short (should be at least 120 characters): "${description}" (${description.length} chars)`);
      } else if (description.length > 160) {
        issues.push(`Description too long (should be less than 160 characters): "${description}" (${description.length} chars)`);
      }
      
      // Check keywords
      if (!keywords) {
        issues.push('Missing meta keywords');
      } else {
        const keywordCount = keywords.split(',').length;
        if (keywordCount < 5) {
          issues.push(`Keywords too few (should be at least 5): "${keywords}" (${keywordCount} keywords)`);
        }
      }
      
      // Check canonical
      if (!canonical) {
        issues.push('Missing canonical URL');
      } else if (!canonical.startsWith('http')) {
        issues.push(`Invalid canonical URL (should be absolute): "${canonical}"`);
      }
      
      // Check for h1 tag
      if (!h1) {
        issues.push('Missing <h1> tag');
      } else if (h1.length < 10) {
        issues.push(`H1 too short (should be at least 10 characters): "${h1}" (${h1.length} chars)`);
      }
      
      // Check for images without alt text
      if (imagesWithoutAlt.length > 0) {
        const imageSources = Array.from(imagesWithoutAlt).map(img => img.getAttribute('src') || 'unknown').slice(0, 3);
        const imageList = imageSources.length > 3 ? `${imageSources.join(', ')}...` : imageSources.join(', ');
        issues.push(`${imagesWithoutAlt.length} image(s) missing alt text: ${imageList}`);
      }
      
      // Check for structured data
      if (structuredData.length === 0) {
        issues.push('No structured data found');
      } else if (structuredData.length < 2) {
        issues.push(`Limited structured data (only ${structuredData.length} script(s) found, recommend at least 2)`);
      }
      
      setSeoIssues(issues);
    };

    // Run check after a delay to allow React Helmet to update the DOM
    // Also check multiple times to catch React Helmet updates
    const timeoutId = setTimeout(() => {
      checkSEO();
      // Check again after another delay to catch React Helmet updates
      setTimeout(checkSEO, 1000);
    }, 1500);
    
    return () => clearTimeout(timeoutId);
  }, [location.pathname, enabled]);

  // Log SEO issues to console instead of rendering UI
  useEffect(() => {
    if (enabled) {
      if (seoIssues.length > 0) {
        console.group(`🔍 SEO Issues Found on page "${location.pathname}":`);
        seoIssues.forEach((issue, index) => {
          console.warn(`${index + 1}. ${issue}`);
        });
        console.groupEnd();
      } else {
        console.log(`✅ No SEO issues found on page "${location.pathname}"`);
      }
      
      // Log current SEO data for debugging
      if (seoData.title || seoData.description || seoData.h1) {
        console.group(`📊 Current SEO Data on page "${location.pathname}":`);
        if (seoData.title) console.log(`Title: "${seoData.title}" (${seoData.title.length} chars)`);
        if (seoData.description) console.log(`Description: "${seoData.description}" (${seoData.description.length} chars)`);
        if (seoData.keywords) console.log(`Keywords: "${seoData.keywords}"`);
        if (seoData.canonical) console.log(`Canonical: "${seoData.canonical}"`);
        if (seoData.h1) console.log(`H1: "${seoData.h1}" (${seoData.h1.length} chars)`);
        if (seoData.imagesWithoutAlt !== undefined) console.log(`Images without alt: ${seoData.imagesWithoutAlt}`);
        if (seoData.structuredDataCount !== undefined) console.log(`Structured data scripts: ${seoData.structuredDataCount}`);
        console.groupEnd();
      }
    }
  }, [seoIssues, seoData, location.pathname, enabled]);

  // Never render anything visible to users
  return null;
};

export default SEOChecker;

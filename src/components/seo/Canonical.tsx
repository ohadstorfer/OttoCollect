import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

interface CanonicalProps {
  baseUrl?: string;
  customPath?: string;
  countryName?: string;
  isCountryPage?: boolean;
}

export default function Canonical({ 
  baseUrl = "https://ottocollect.com", 
  customPath,
  countryName,
  isCountryPage = false
}: CanonicalProps) {
  const location = useLocation();
  
  // Use custom path if provided, otherwise use current pathname
  let path = customPath || location.pathname;
  
  // For country pages, ensure we have a proper canonical structure
  if (isCountryPage && countryName) {
    // Normalize country name for URL (handle spaces, special characters)
    const normalizedCountry = encodeURIComponent(countryName);
    path = `/catalog/${normalizedCountry}`;
  }
  
  // Ensure path starts with /
  const canonicalPath = path.startsWith('/') ? path : `/${path}`;
  
  // Construct canonical URL
  const canonicalUrl = `${baseUrl}${canonicalPath}`;

  return (
    <Helmet>
      <link rel="canonical" href={canonicalUrl} />
      {/* Additional SEO meta tags for country pages */}
      {isCountryPage && (
        <>
          <meta name="robots" content="index, follow" />
          <meta name="googlebot" content="index, follow" />
        </>
      )}
    </Helmet>
  );
}

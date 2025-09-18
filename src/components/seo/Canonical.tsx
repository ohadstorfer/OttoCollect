import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

interface CanonicalProps {
  baseUrl?: string;
  customPath?: string;
}

export default function Canonical({ 
  baseUrl = "https://ottocollect.com", 
  customPath 
}: CanonicalProps) {
  const location = useLocation();
  
  // Use custom path if provided, otherwise use current pathname
  const path = customPath || location.pathname;
  
  // Ensure path starts with /
  const canonicalPath = path.startsWith('/') ? path : `/${path}`;
  
  // Construct canonical URL
  const canonicalUrl = `${baseUrl}${canonicalPath}`;


  return (
    <Helmet>
      <link rel="canonical" href={canonicalUrl} />
    </Helmet>
  );
}

import { NavigateFunction } from 'react-router-dom';

/**
 * Detects if the current browser is Chrome
 */
const isChrome = (): boolean => {
  return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
};

/**
 * Safely navigates back to the previous page, but only if it's within the same website.
 * If the previous page was external (like Google search), navigates to home instead.
 * Special handling for Chrome browser to prevent external redirects.
 */
export const safeNavigateBack = (navigate: NavigateFunction, fallbackPath: string = '/') => {
  const currentOrigin = window.location.origin;
  const currentPath = window.location.pathname;
  
  // Chrome-specific handling - be more conservative
  if (isChrome()) {
    console.log('Chrome detected - using conservative redirect approach');
    
    // For Chrome, we'll be more conservative and avoid navigate(-1) in most cases
    // Only use navigate(-1) if we're absolutely certain it's safe
    
    // Check if we have a valid internal referrer
    const referrer = document.referrer;
    const hasValidInternalReferrer = referrer && 
      referrer.startsWith(currentOrigin) && 
      !referrer.includes('google.com') && 
      !referrer.includes('bing.com') && 
      !referrer.includes('yahoo.com') &&
      !referrer.includes('duckduckgo.com');
    
    // Check if we're coming from a known internal path
    const isFromAuthPage = currentPath === '/auth' || currentPath.startsWith('/auth/');
    const isFromInternalPath = currentPath !== '/' && currentPath !== '/auth';
    
    // For Chrome, only go back if we have a clear internal referrer AND we're not on auth page
    if (hasValidInternalReferrer && !isFromAuthPage) {
      console.log('Chrome: Safe to navigate back - internal referrer detected');
      navigate(-1);
      return;
    }
    
    // For Chrome, always use fallback for auth pages or when referrer is unclear
    console.log('Chrome: Using fallback navigation to prevent external redirect');
    console.log('Chrome debug info:', {
      referrer,
      hasValidInternalReferrer,
      isFromAuthPage,
      isFromInternalPath,
      currentPath,
      userAgent: navigator.userAgent
    });
    navigate(fallbackPath);
    return;
  }
  
  // Non-Chrome browsers - use the original logic but with additional safety checks
  const referrer = document.referrer;
  const hasInternalReferrer = referrer && referrer.startsWith(currentOrigin);
  
  // Additional safety check - ensure referrer is not from search engines
  const isFromSearchEngine = referrer && (
    referrer.includes('google.com') || 
    referrer.includes('bing.com') || 
    referrer.includes('yahoo.com') ||
    referrer.includes('duckduckgo.com')
  );
  
  const hasHistory = window.history.length > 1;
  const isDeepPath = currentPath !== '/' && currentPath !== '/auth';
  
  // Determine if it's safe to go back
  const canGoBack = hasInternalReferrer && !isFromSearchEngine && (hasHistory || isDeepPath);
  
  if (!canGoBack) {
    console.log('Previous page was external or no safe history, navigating to:', fallbackPath);
    console.log('Debug info:', {
      referrer,
      hasInternalReferrer,
      isFromSearchEngine,
      hasHistory,
      isDeepPath,
      currentPath: window.location.pathname,
      historyLength: window.history.length
    });
    navigate(fallbackPath);
    return;
  }
  
  // If we can safely go back, use navigate(-1)
  console.log('Previous page was internal, navigating back with navigate(-1)');
  navigate(-1);
};

/**
 * Safely navigates to a specific path, with fallback to home if the path is invalid
 * Enhanced security to prevent external redirects, especially on Chrome
 */
export const safeNavigate = (navigate: NavigateFunction, path: string, fallbackPath: string = '/') => {
  // Comprehensive validation to ensure the path is safe
  if (!path) {
    console.warn('Empty navigation path, using fallback');
    navigate(fallbackPath);
    return;
  }
  
  // Check for external URLs
  if (path.startsWith('http://') || path.startsWith('https://') || path.includes('//')) {
    console.warn('External URL detected, using fallback:', path);
    navigate(fallbackPath);
    return;
  }
  
  // Check for suspicious patterns that might indicate external redirects
  if (path.includes('google.com') || 
      path.includes('bing.com') || 
      path.includes('yahoo.com') ||
      path.includes('duckduckgo.com') ||
      path.includes('facebook.com') ||
      path.includes('twitter.com') ||
      path.includes('linkedin.com')) {
    console.warn('Suspicious external domain detected, using fallback:', path);
    navigate(fallbackPath);
    return;
  }
  
  // Chrome-specific additional validation
  if (isChrome()) {
    // For Chrome, be extra cautious with any path that might be manipulated
    if (path.includes('?') && (path.includes('redirect=') || path.includes('url=') || path.includes('return='))) {
      console.warn('Chrome: Suspicious redirect parameters detected, using fallback:', path);
      navigate(fallbackPath);
      return;
    }
  }
  
  // Ensure path starts with / for internal navigation
  const safePath = path.startsWith('/') ? path : `/${path}`;
  
  console.log('Safe navigation to:', safePath);
  navigate(safePath);
};

/**
 * Gets the safe fallback path based on user authentication status
 */
export const getSafeFallbackPath = (isAuthenticated: boolean): string => {
  if (isAuthenticated) {
    return '/'; // Home page for authenticated users
  }
  return '/'; // Home page for unauthenticated users (they can still browse)
};

/**
 * Chrome-specific redirect protection for authentication flows
 * Prevents external redirects that commonly occur in Chrome after login
 */
export const chromeSafeAuthRedirect = (navigate: NavigateFunction, fallbackPath: string = '/') => {
  if (!isChrome()) {
    // For non-Chrome browsers, use standard safe navigation
    safeNavigate(navigate, fallbackPath);
    return;
  }
  
  console.log('Chrome: Using Chrome-specific auth redirect protection');
  
  // For Chrome, always use direct navigation to prevent external redirects
  // Never use navigate(-1) after authentication
  const safePath = fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`;
  
  console.log('Chrome: Safe auth redirect to:', safePath);
  navigate(safePath);
};

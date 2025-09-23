/**
 * Authentication redirect utilities for OttoCollect
 * Handles safe redirects after authentication
 */

/**
 * Gets the appropriate redirect URL based on the current environment
 */
export const getAuthRedirectUrl = (): string => {
  const currentOrigin = window.location.origin;
  
  // Always use the current origin to ensure we stay within the same domain
  return currentOrigin;
};

/**
 * Gets the deployment environment based on the current URL
 */
export const getDeploymentEnvironment = (): 'localhost' | 'preview' | 'production' => {
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'localhost';
  }
  
  if (hostname.includes('preview') || hostname.includes('staging')) {
    return 'preview';
  }
  
  return 'production';
};

/**
 * Logs redirect information for debugging
 */
export const logRedirectInfo = (context: string) => {
  console.log(`🔐 ${context} Redirect Info:`, {
    currentOrigin: window.location.origin,
    currentPath: window.location.pathname,
    referrer: document.referrer,
    environment: getDeploymentEnvironment(),
    redirectUrl: getAuthRedirectUrl()
  });
};

/**
 * Validates if a redirect URL is safe (same origin)
 */
export const isSafeRedirectUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const currentOrigin = window.location.origin;
    return urlObj.origin === currentOrigin;
  } catch {
    return false;
  }
};

/**
 * Gets a safe redirect URL, falling back to home if the provided URL is unsafe
 */
export const getSafeRedirectUrl = (preferredPath: string = '/'): string => {
  const currentOrigin = window.location.origin;
  const fullUrl = `${currentOrigin}${preferredPath.startsWith('/') ? preferredPath : `/${preferredPath}`}`;
  
  if (isSafeRedirectUrl(fullUrl)) {
    return fullUrl;
  }
  
  // Fallback to home page if the URL is unsafe
  return `${currentOrigin}/`;
};




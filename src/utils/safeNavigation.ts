import { NavigateFunction } from 'react-router-dom';

/**
 * Safely navigates back to the previous page, but only if it's within the same website.
 * If the previous page was external (like Google search), navigates to home instead.
 */
export const safeNavigateBack = (navigate: NavigateFunction, fallbackPath: string = '/') => {
  const currentOrigin = window.location.origin;
  
  // Method 1: Check referrer
  const referrer = document.referrer;
  const hasInternalReferrer = referrer && referrer.startsWith(currentOrigin);
  
  // Method 2: Check if we have history entries (more reliable for SPA)
  const hasHistory = window.history.length > 1;
  
  // Method 3: Check if we came from a different origin by looking at the current path
  // If we're on a deep path and have no referrer, we likely came from within the app
  const isDeepPath = window.location.pathname !== '/' && window.location.pathname !== '/auth';
  
  // Determine if it's safe to go back
  const canGoBack = hasInternalReferrer || (hasHistory && (isDeepPath || referrer === ''));
  
  if (!canGoBack) {
    console.log('Previous page was external or no safe history, navigating to:', fallbackPath);
    console.log('Debug info:', {
      referrer,
      hasInternalReferrer,
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
  console.log('Debug info:', {
    referrer,
    hasInternalReferrer,
    hasHistory,
    isDeepPath,
    currentPath: window.location.pathname
  });
  navigate(-1);
};

/**
 * Safely navigates to a specific path, with fallback to home if the path is invalid
 */
export const safeNavigate = (navigate: NavigateFunction, path: string, fallbackPath: string = '/') => {
  // Basic validation to ensure the path is safe
  if (!path || path.startsWith('http') || path.includes('//')) {
    console.warn('Unsafe navigation path detected, using fallback:', path);
    navigate(fallbackPath);
    return;
  }
  
  navigate(path);
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

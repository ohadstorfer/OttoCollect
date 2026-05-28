import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isKeepAlivePath } from '@/config/keepAlive';

/**
 * Custom hook that automatically scrolls to the top of the page
 * whenever the route changes. This ensures users always start at the top
 * when navigating to a new page.
 *
 * Runs in a layout effect with an instant jump (no smooth animation): the
 * reset happens synchronously, before the browser paints the new route, so
 * the outgoing page is never seen animating/scrolling upward during the
 * transition. A smooth scroll here would visibly animate the previous page.
 *
 * Kept-alive pages (catalog / collection) are skipped: CachedRoutes restores
 * their saved scroll position on return, so scrolling to top here would fight it.
 */
export function useScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if (isKeepAlivePath(pathname)) return;
    window.scrollTo(0, 0);
  }, [pathname]);
} 
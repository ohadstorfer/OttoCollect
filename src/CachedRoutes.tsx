import { useLayoutEffect, useMemo, useRef } from "react";
import { useLocation, useRoutes, type RouteObject } from "react-router-dom";
import { KeepAlive } from "keepalive-for-react";
import { KEEP_ALIVE_PATTERNS, isKeepAlivePath, resolveCacheKey } from "@/config/keepAlive";

/**
 * Renders the app routes through a single <KeepAlive> boundary so that the
 * heavy list pages (catalog / collection — see KEEP_ALIVE_PATTERNS) stay
 * mounted in memory when the user opens a detail page and navigates back.
 * Returning is instant: no refetch, no re-render, DOM intact.
 *
 * Also owns window-scroll save/restore for cached pages, since the library
 * only preserves the DOM (it hides inactive nodes with `hidden`) and this app
 * scrolls the window, not an inner container.
 */
export function CachedRoutes({ routes }: { routes: RouteObject[] }) {
  const location = useLocation();
  const element = useRoutes(routes);

  // Cache key per page (see resolveCacheKey): each catalog/collection country
  // gets its own cached instance, while Profile shares one instance across its
  // overview and country-collection views to avoid a remount flicker.
  const activeCacheKey = resolveCacheKey(location.pathname);

  // In-memory scroll positions per cached path. In-memory (not sessionStorage)
  // because it mirrors the keep-alive cache lifetime: both reset on full reload.
  const scrollPositions = useRef<Map<string, number>>(new Map());
  const cached = isKeepAlivePath(location.pathname);

  // Save the current scroll position for the active cached page so we can
  // restore it on return.
  useLayoutEffect(() => {
    if (!cached) return;
    const path = location.pathname;
    const onScroll = () => scrollPositions.current.set(path, window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [cached, location.pathname]);

  // On entering a cached page, restore its saved scroll. The page is kept
  // alive so its DOM (full height) already exists — restoring synchronously in
  // a layout effect avoids a visible jump. useScrollToTop skips these paths.
  useLayoutEffect(() => {
    if (!cached) return;
    const saved = scrollPositions.current.get(location.pathname);
    // Restore the saved position on return, or go to top on first visit (since
    // useScrollToTop skips kept-alive paths, otherwise the page would open at
    // the previous page's scroll position). `behavior: 'instant'` overrides the
    // global `scroll-behavior: smooth` (index.css) so there is no scroll motion.
    window.scrollTo({ top: saved ?? 0, left: 0, behavior: "instant" });
  }, [cached, location.pathname]);

  return (
    <KeepAlive
      activeCacheKey={activeCacheKey}
      include={KEEP_ALIVE_PATTERNS}
      max={20}
    >
      {element}
    </KeepAlive>
  );
}

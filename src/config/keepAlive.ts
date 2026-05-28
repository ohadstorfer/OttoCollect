/**
 * Single source of truth for which routes are kept alive (cached in memory)
 * while the user navigates away and back.
 *
 * Used by:
 *  - CachedRoutes: `resolveCacheKey` feeds <KeepAlive activeCacheKey>, and
 *    KEEP_ALIVE_PATTERNS feeds <KeepAlive include>, so only these pages are
 *    retained mounted when navigating away (no refetch / no re-render on return).
 *  - useScrollToTop: skipped for these paths so it doesn't fight scroll restore.
 *  - CachedRoutes scroll restore: window scroll is saved/restored per cached path.
 *
 * Scope (per product decision): heavy list pages only — catalog and collection.
 */

/**
 * Maps a pathname to its KeepAlive cache key.
 *
 * Profile renders the SAME <Profile/> for both `/profile/:username` and
 * `/profile/:username/:country` (it switches between profile and collection
 * views internally). If each path got its own cache key, KeepAlive would
 * unmount/remount Profile on country selection — a visible flicker. Collapsing
 * the country segment keeps one instance that switches views in place.
 *
 * All other routes use the pathname directly (e.g. each catalog country gets
 * its own cached instance, bounded by `max`).
 */
export const resolveCacheKey = (pathname: string): string => {
  const profile = pathname.match(/^(\/profile\/[^/]+)(?:\/[^/]+)?$/);
  if (profile) return profile[1];
  return pathname;
};

/** Patterns matched against the resolved cache key (see resolveCacheKey). */
export const KEEP_ALIVE_PATTERNS: RegExp[] = [
  // Per-country list pages (one cached instance per country, bounded by `max`).
  /^\/catalog\/[^/]+$/, // CountryDetail (catalog by country)
  /^\/collectionNew\/[^/]+$/, // CountryDetailCollection (collection by country)
  /^\/profile\/[^/]+$/, // Profile (overview + its country collection view)

  // Top-level list / feed pages: navigate into a detail and back without reload.
  /^\/catalog$/, // Catalog (country list)
  /^\/collection$/, // CountrySelection (My Collection)
  /^\/marketplace$/, // Marketplace
  /^\/forum$/, // Forum
  /^\/blog$/, // Blog
  /^\/members$/, // Members
  /^\/community$/, // Community

  // Banknote / collection-item detail pages (keyed per :id). Keeping these
  // alive makes the collection/catalog flow instant in BOTH directions:
  // list -> item -> another screen -> back to the item, with no reload.
  /^\/collection-item\/[^/]+$/, // CollectionItem
  /^\/collection-item-unlisted\/[^/]+$/, // CollectionItemUnlisted
  /^\/banknote-collection\/[^/]+$/, // BanknoteCollectionDetail
  /^\/collection-banknote\/[^/]+$/, // BanknoteCollectionDetail (alias)
  /^\/banknote-details\/[^/]+$/, // BanknoteCatalogDetail
  /^\/catalog-banknote\/[^/]+$/, // BanknoteCatalogDetail (alias)
];

/** True when the given pathname corresponds to a kept-alive (cached) page. */
export const isKeepAlivePath = (pathname: string): boolean =>
  KEEP_ALIVE_PATTERNS.some((re) => re.test(resolveCacheKey(pathname)));

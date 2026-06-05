# Catalog ↔ Collection Filter Sync — Design

**Date:** 2026-06-05
**Status:** Approved (pending final spec review)

## Goal

Filters on the **catalog** and the **collection** must always match, stay live in-sync,
and never lose the user's selections — across navigation, page reload, re-login, other
devices, and for logged-out users. A change to a filter in one view is reflected
**instantly** in the other, even while both pages stay mounted via keep-alive.

## Problem — why filters drift / get lost today

The live pages are catalog = `src/pages/CountryDetail.tsx` + `src/components/filter/BanknoteFilterCatalog.tsx`,
collection = `src/pages/CountryDetailCollection.tsx` + `src/components/filter/BanknoteFilterCollection.tsx`.

1. **Keep-alive never re-reads.** Each filter component's load effect early-returns once
   `initialLoadComplete` is set. The pages stay mounted, so changing a filter in one and
   returning to the other shows stale in-memory state. The DB row is the only link and is
   read once per mount.
2. **Two different cache layers.** Catalog reads a full snapshot from
   `sessionStorage['catalog-filters-'+countryName]` *before* the DB; collection has no
   snapshot and reads category/type/sort from the DB only.
3. **Inconsistent storage keys.** Catalog snapshot keyed by `countryName`;
   `viewMode`/`groupMode` keyed by `countryId`.
4. **State lives in three places per side.** Parent page `useState<DynamicFilterState>`
   (seeded from sessionStorage) + the filter component's internal `useState` + storage.
5. **Partial DB writes clobber each other.** Catalog writes
   categories/types/sort/group_mode/view_mode/images_only; collection writes the same set
   minus `images_only`. They overwrite the one shared
   `user_filter_preferences[user,country]` row.
6. **`images_only`** is persisted by catalog only; collection ignores it.
7. **Anonymous users:** catalog persists a full snapshot; collection persists nothing for
   category/type/sort.
8. **Empty → all.** A validated selection that comes back empty (deselected everything, or
   admin recreated categories so saved UUIDs are orphaned) falls back to **all**.

## Approach (chosen: A)

A single **module-level external store** keyed by `countryId`, consumed through a
`useCountryFilters(countryId)` hook built on `useSyncExternalStore`. Both filter
components and both parent pages read/write the **same** store, so a change in one view is
instantly visible in the other and keep-alive stops mattering. A separate persistence
module hydrates from DB (logged-in) / localStorage (anonymous + fast cache) and writes
back. No DB schema change.

### Why an external store, not React Context

- The provider would sit **above `CachedRoutes`** (above the whole app). A Context whose
  value changes on every checkbox/sort toggle re-renders its whole subtree unless heavily
  split/memoized; filters are high-frequency, unlike the existing low-frequency contexts
  (Auth, Theme, Language, Wishlist).
- `useSyncExternalStore` gives **per-country selector subscriptions** — a consumer only
  re-renders when its own country slice changes, which matters because keep-alive keeps the
  sibling page (and others) mounted.
- Persistence lives in a plain module, independent of provider placement relative to the
  keep-alive boundary.
- Call sites still look idiomatic: components consume a normal `useCountryFilters()` hook.

## Section 1 — Architecture & data model

**New module `src/state/countryFilters.ts`** — pure in-memory state container, no I/O.

```ts
type FilterState = {
  categories: string[];   // canonical category IDs (includes "Unlisted")
  types: string[];        // canonical type IDs
  sort: string[];         // canonical sort FIELD NAMES (not option IDs)
  groupMode: boolean;
  viewMode: 'grid' | 'list';
  imagesOnly: boolean;
  search: string;         // catalog-only consumer, kept per-country
  _hydrated: boolean;     // false until DB/localStorage load finished
  _owner: string | null;  // userId the current slice was hydrated for
};

// store: Map<countryId, FilterState>
```

Public API:
- `useCountryFilters(countryId)` → `{ state, setCategories, setTypes, setSort,
  setGroupMode, setViewMode, setImagesOnly, setSearch, patch }`. Built on
  `useSyncExternalStore` with a per-country `getSnapshot`; a component only re-renders when
  its country slice changes.
- Non-React core: `subscribe(countryId, cb)`, `getState(countryId)`,
  `setState(countryId, partial)`.
- Mutations are **shared**: catalog and collection call the same setters → both mounted
  pages update instantly.

Sort is stored as **field names**; mapping to option IDs happens only at the DB boundary.

## Section 2 — Persistence & hydration

**New module `src/state/countryFiltersPersistence.ts`** — owns all DB/storage I/O. The
store never touches DB/storage.

**Hydration** `hydrateCountryFilters(countryId, user, authLoading)`, once per
`(countryId, userId)`:
- Guarded by a **monotonic generation token per country** (reusing the pattern already in
  both filter components) so a later `(country,user)` load always wins; stale loads discard
  their results. Waits for `authLoading` to resolve before applying anything.
- Resolution order (first hit wins):
  1. In-memory store already `_hydrated` for this `(country, owner)` → reuse, no fetch.
  2. localStorage snapshot `ocf:filters:${countryId}` (owner-stamped; discarded if owner ≠
     current viewer), validated against current definitions — fast paint for everyone.
  3. DB row `user_filter_preferences[user,country]` (logged-in) → authoritative; reconciled
     (§3′) and written into the store + localStorage.
  4. Admin defaults (§3′), then last-resort "all".
- localStorage = **fast cache**, DB = **source of truth**: paint from localStorage
  immediately, then DB resolves and, if different, updates the store (the kept-alive sibling
  updates live).

**Save** `persistCountryFilters(countryId, state, user)` on every change:
- Writes the localStorage snapshot synchronously (owner-stamped).
- Debounced (~400ms) upsert of the **full row every time** for logged-in users — no more
  partial-field clobbering; `images_only` always included.
- Anonymous users: localStorage only (now covers categories/types/sort, not just
  `imagesOnly`).

**Key consolidation:** single key `ocf:filters:${countryId}`. The old
`catalog-filters-${countryName}`, `viewMode-${countryId}`, `groupMode-${countryId}`, and
`imagesOnly` keys are read-migrated once, then abandoned.

## Section 3′ — Reconciliation (reduced scope)

The original §3 (explicit-empty tracking, partial-orphan keep, Unlisted-aware subset
rendering) is **not** implemented. Single rule instead:

- When a resolved selection would be empty — **no saved row, or saved IDs all
  orphaned/invalid** — fall back to the country's **admin defaults**
  (`country_default_preferences`, audience-aware: `new_user` for logged-in, `anonymous` for
  anonymous). Only if admin defaults are absent → last-resort "all".
- Store holds canonical category/type IDs and sort field-names. Each view keeps its
  **current** option-set handling (catalog still hides "Unlisted Banknotes" as a rendered
  option; the ID may remain in the stored selection). Each view toggles only the options it
  renders.

**Known caveat (accepted):** because there is no explicit-empty tracking, an intentional
"deselect everything" is treated as empty → admin defaults; it does not persist as empty.

## Section 4 — Integration & migration

- `BanknoteFilterCatalog` / `BanknoteFilterCollection`: remove internal `useState` +
  sessionStorage/DB load-save blocks; become **controlled by** `useCountryFilters(countryId)`.
  Their `onFilterChange`/`onViewModeChange`/`onGroupModeChange` callbacks call store setters.
- Parent pages `CountryDetail` / `CountryDetailCollection`: drop their own
  `useState<DynamicFilterState>` + sessionStorage seeding; read `state` from the same hook.
  Preserve the existing "reset search on catalog switch" rule (search is catalog-only).
- Hydration kicked off once per country (in the hook on first use); generation token
  prevents auth-race overwrites.
- **Delete** dead paths: catalog's `catalog-filters-*` snapshot logic, parent-page
  seed/reset duplication, collection's partial DB writes. One read-migration pass imports
  existing old keys, then abandons them.
- No DB schema change — same `user_filter_preferences` and `country_default_preferences`
  tables.

## Out of scope

- Marketplace filter (`BanknoteFilterMarketplace`) is untouched.
- Legacy/dead pages `OptimizedCollection.tsx`, `Collection.tsx` are untouched.
- No DB schema migration.

## Testing

- Change each facet (categories, types, sort, group, view, images-only) in catalog →
  switch to collection (kept-alive) → assert it matches instantly, and vice versa.
- Reload mid-session → selections restored from localStorage, then confirmed by DB.
- Log out / log in / second device → DB row drives the same state.
- Logged-out user → localStorage persists all facets across reload.
- Orphaned saved IDs (simulate admin recreating a category) → falls back to admin defaults,
  not "all", not empty.
- Auth race on hard refresh → no anonymous-defaults flash; the generation token keeps the
  authenticated load winning.

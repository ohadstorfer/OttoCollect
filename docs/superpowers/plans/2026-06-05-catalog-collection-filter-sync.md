# Catalog ↔ Collection Filter Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make catalog and collection filters share one live per-country state so a change in either view is reflected instantly in the other and selections never get lost across navigation, reload, re-login, devices, or logged-out sessions.

**Architecture:** A module-level external store keyed by `countryId` (`src/state/countryFilters.ts`), consumed via a `useCountryFilters(countryId)` hook built on `useSyncExternalStore`. A persistence module (`src/state/countryFiltersPersistence.ts`) hydrates from localStorage (fast cache, all users) and the `user_filter_preferences` DB row (source of truth, logged-in), and writes back debounced. Pure reconciliation helpers (`src/state/filterReconcile.ts`) handle sort id↔field-name mapping and the empty/orphaned → admin-defaults fallback. Both filter components and both parent pages become controlled by the store; their internal `useState`/sessionStorage/DB blocks are removed.

**Tech Stack:** React 18 (`useSyncExternalStore`), TypeScript, Vite, Supabase JS, Vitest (added in Task 0).

**Spec:** `docs/superpowers/specs/2026-06-05-catalog-collection-filter-sync-design.md`

**Key reference facts (verified in codebase):**
- Live pages: catalog = `src/pages/CountryDetail.tsx` → `src/components/country/CountryFilterSection.tsx` → `src/components/filter/BanknoteFilterCatalog.tsx`; collection = `src/pages/CountryDetailCollection.tsx` → `src/components/filter/BanknoteFilterCollection.tsx`.
- Service fns in `src/services/countryService.ts`: `fetchUserFilterPreferences(userId, countryId)`, `saveUserFilterPreferences(userId, countryId, prefs)`, `fetchCountryDefaultPreferences(countryId, audience)`, `fetchCategoriesByCountryId(countryId)`, `fetchTypesByCountryId(countryId)`, `fetchSortOptionsByCountryId(countryId)`.
- Types in `src/types/filter.ts`: `DynamicFilterState`, `UserFilterPreference`, `CountryDefaultPreference`, `CatalogDefaultAudience = 'anonymous' | 'new_user'`.
- DB stores sort as **option IDs** (`selected_sort_options`); the store holds sort as **field names**.
- Catalog excludes the "Unlisted Banknotes" category from rendered options; collection includes all. Per spec §3′ we do NOT special-case this — store holds canonical IDs, each view renders its own subset.

---

## File Structure

**Create:**
- `vitest.config.ts` — Vitest config (node env for pure logic).
- `src/state/countryFilters.ts` — pure in-memory store + subscribe/getState/setState.
- `src/state/countryFilters.test.ts` — store unit tests.
- `src/state/filterReconcile.ts` — pure reconciliation/mapping helpers.
- `src/state/filterReconcile.test.ts` — reconciliation unit tests.
- `src/state/countryFiltersPersistence.ts` — hydrate/save/migrate (DB + localStorage).
- `src/state/countryFiltersPersistence.test.ts` — persistence unit tests (mocked services + localStorage).
- `src/hooks/useCountryFilters.ts` — React hook over the store + triggers hydration.

**Modify:**
- `package.json` — add vitest devDeps + `test` script.
- `src/components/filter/BanknoteFilterCatalog.tsx` — remove load effect + DB/sessionStorage save logic; drive from store.
- `src/components/filter/BanknoteFilterCollection.tsx` — same.
- `src/pages/CountryDetail.tsx` — replace local `filters` useState + sessionStorage seed with store hook.
- `src/pages/CountryDetailCollection.tsx` — same.

---

## Task 0: Add Vitest test infrastructure

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install vitest**

Run:
```bash
npm install -D vitest@^2.1.0
```
Expected: adds `vitest` to devDependencies, no peer-dep errors that block install.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: true,
  },
});
```

- [ ] **Step 3: Add test script to `package.json`**

Add to the `"scripts"` object:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Add a smoke test to verify the runner works**

Create `src/state/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('vitest', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: PASS, 1 test passed.

- [ ] **Step 6: Delete the smoke test and commit**

```bash
rm src/state/smoke.test.ts
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(test): add vitest test runner"
```

---

## Task 1: Pure store (`countryFilters.ts`)

**Files:**
- Create: `src/state/countryFilters.ts`
- Test: `src/state/countryFilters.test.ts`

The store keeps one `CountryFilterState` per `countryId` in a `Map`. `getState` returns a **stable object reference** until `setState` replaces it (required by `useSyncExternalStore`'s `getSnapshot`). Unknown countries return a shared frozen default.

- [ ] **Step 1: Write failing tests**

Create `src/state/countryFilters.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getState, setState, subscribe, resetStore, DEFAULT_FILTER_STATE,
} from './countryFilters';

beforeEach(() => resetStore());

describe('countryFilters store', () => {
  it('returns the shared default for an unknown country', () => {
    expect(getState('TR')).toEqual(DEFAULT_FILTER_STATE);
  });

  it('returns a stable reference until setState changes it', () => {
    const a = getState('TR');
    const b = getState('TR');
    expect(a).toBe(b);
    setState('TR', { groupMode: true });
    expect(getState('TR')).not.toBe(a);
    expect(getState('TR').groupMode).toBe(true);
  });

  it('merges partial updates without dropping other fields', () => {
    setState('TR', { categories: ['c1'] });
    setState('TR', { types: ['t1'] });
    const s = getState('TR');
    expect(s.categories).toEqual(['c1']);
    expect(s.types).toEqual(['t1']);
  });

  it('keeps countries independent', () => {
    setState('TR', { groupMode: true });
    expect(getState('EG').groupMode).toBe(false);
  });

  it('notifies only subscribers of the changed country', () => {
    let tr = 0, eg = 0;
    subscribe('TR', () => tr++);
    subscribe('EG', () => eg++);
    setState('TR', { search: 'x' });
    expect(tr).toBe(1);
    expect(eg).toBe(0);
  });

  it('unsubscribe stops notifications', () => {
    let n = 0;
    const off = subscribe('TR', () => n++);
    setState('TR', { search: 'a' });
    off();
    setState('TR', { search: 'b' });
    expect(n).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- countryFilters`
Expected: FAIL — cannot find module `./countryFilters`.

- [ ] **Step 3: Implement the store**

Create `src/state/countryFilters.ts`:
```ts
export type CountryFilterState = {
  categories: string[];   // canonical category IDs (may include "Unlisted")
  types: string[];        // canonical type IDs
  sort: string[];         // canonical sort FIELD NAMES
  groupMode: boolean;
  viewMode: 'grid' | 'list';
  imagesOnly: boolean;
  search: string;         // consumed by catalog only; kept per country
  hydrated: boolean;      // false until persistence finishes a load
  owner: string | null;   // userId the slice was hydrated for (null = anonymous)
};

export const DEFAULT_FILTER_STATE: CountryFilterState = Object.freeze({
  categories: [],
  types: [],
  sort: [],
  groupMode: false,
  viewMode: 'grid',
  imagesOnly: true,
  search: '',
  hydrated: false,
  owner: null,
});

const store = new Map<string, CountryFilterState>();
const listeners = new Map<string, Set<() => void>>();

export function getState(countryId: string): CountryFilterState {
  return store.get(countryId) ?? DEFAULT_FILTER_STATE;
}

export function setState(countryId: string, partial: Partial<CountryFilterState>): void {
  const prev = store.get(countryId) ?? DEFAULT_FILTER_STATE;
  store.set(countryId, { ...prev, ...partial });
  const set = listeners.get(countryId);
  if (set) set.forEach((cb) => cb());
}

export function subscribe(countryId: string, cb: () => void): () => void {
  let set = listeners.get(countryId);
  if (!set) {
    set = new Set();
    listeners.set(countryId, set);
  }
  set.add(cb);
  return () => {
    set!.delete(cb);
  };
}

/** Test-only: clear all state and listeners. */
export function resetStore(): void {
  store.clear();
  listeners.clear();
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- countryFilters`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/state/countryFilters.ts src/state/countryFilters.test.ts
git commit -m "feat(filters): add per-country external store"
```

---

## Task 2: Reconciliation helpers (`filterReconcile.ts`)

**Files:**
- Create: `src/state/filterReconcile.ts`
- Test: `src/state/filterReconcile.test.ts`

Implements spec §3′: sort id↔field-name mapping and the empty/orphaned → admin-defaults → all fallback.

- [ ] **Step 1: Write failing tests**

Create `src/state/filterReconcile.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  sortIdsToFieldNames, sortFieldNamesToIds, reconcileSelection,
} from './filterReconcile';

const SORT_OPTS = [
  { id: 's1', field_name: 'extPick' },
  { id: 's2', field_name: 'faceValue' },
  { id: 's3', field_name: 'sultan' },
];

describe('sort mapping', () => {
  it('maps ids to field names, dropping unknown ids', () => {
    expect(sortIdsToFieldNames(['s2', 'sX', 's1'], SORT_OPTS)).toEqual(['faceValue', 'extPick']);
  });
  it('maps field names to ids, dropping unknown names', () => {
    expect(sortFieldNamesToIds(['faceValue', 'nope'], SORT_OPTS)).toEqual(['s2']);
  });
});

describe('reconcileSelection (spec §3prime)', () => {
  const valid = new Set(['a', 'b', 'c']);
  const all = ['a', 'b', 'c'];

  it('keeps the valid subset of a saved selection', () => {
    expect(reconcileSelection(['a', 'zzz', 'b'], valid, ['a'], all)).toEqual(['a', 'b']);
  });
  it('falls back to admin defaults (valid subset) when saved is fully orphaned', () => {
    expect(reconcileSelection(['x', 'y'], valid, ['b', 'q'], all)).toEqual(['b']);
  });
  it('falls back to admin defaults when saved is empty', () => {
    expect(reconcileSelection([], valid, ['c'], all)).toEqual(['c']);
  });
  it('falls back to ALL when saved orphaned and no admin defaults', () => {
    expect(reconcileSelection(['x'], valid, [], all)).toEqual(['a', 'b', 'c']);
  });
  it('falls back to ALL when admin defaults are also all-orphaned', () => {
    expect(reconcileSelection([], valid, ['zzz'], all)).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- filterReconcile`
Expected: FAIL — cannot find module `./filterReconcile`.

- [ ] **Step 3: Implement**

Create `src/state/filterReconcile.ts`:
```ts
type SortOption = { id: string; field_name: string | null };

export function sortIdsToFieldNames(ids: string[], options: SortOption[]): string[] {
  return ids
    .map((id) => options.find((o) => o.id === id)?.field_name ?? null)
    .filter((f): f is string => !!f);
}

export function sortFieldNamesToIds(fields: string[], options: SortOption[]): string[] {
  return fields
    .map((f) => options.find((o) => o.field_name === f)?.id ?? null)
    .filter((id): id is string => !!id);
}

/**
 * Spec §3prime. Keep the valid subset of `saved`. If that is empty, fall back to
 * the valid subset of `adminDefault`. If that is also empty, fall back to `all`.
 */
export function reconcileSelection(
  saved: string[],
  validIds: Set<string>,
  adminDefault: string[],
  all: string[],
): string[] {
  const validSaved = saved.filter((id) => validIds.has(id));
  if (validSaved.length > 0) return validSaved;
  const validDefault = adminDefault.filter((id) => validIds.has(id));
  if (validDefault.length > 0) return validDefault;
  return all;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- filterReconcile`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/state/filterReconcile.ts src/state/filterReconcile.test.ts
git commit -m "feat(filters): add sort mapping + admin-defaults reconciliation"
```

---

## Task 3: Persistence module (`countryFiltersPersistence.ts`)

**Files:**
- Create: `src/state/countryFiltersPersistence.ts`
- Test: `src/state/countryFiltersPersistence.test.ts`

Owns all I/O. Imports service fns (mockable) and the store. Provides:
- `loadSnapshot(countryId, currentUserId)` / `saveSnapshot(countryId, state)` — localStorage `ocf:filters:${countryId}`, owner-stamped.
- `migrateLegacyKeys(countryId, countryName, currentUserId)` — one-time import of old keys.
- `hydrateCountryFilters({ countryId, countryName, userId, audience })` — generation-guarded async load → `setState`.
- `persistCountryFilters({ countryId, userId })` — snapshot now + debounced DB upsert.

This task needs a DOM-ish `localStorage`. Add a jsdom-free shim in the test via a global mock (no extra deps).

- [ ] **Step 1: Write failing tests**

Create `src/state/countryFiltersPersistence.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory localStorage shim (node env has no DOM).
class MemStorage {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
vi.stubGlobal('localStorage', new MemStorage());

// Mock the service layer the persistence module depends on.
vi.mock('@/services/countryService', () => ({
  fetchUserFilterPreferences: vi.fn(),
  saveUserFilterPreferences: vi.fn().mockResolvedValue(undefined),
  fetchCountryDefaultPreferences: vi.fn().mockResolvedValue(null),
  fetchCategoriesByCountryId: vi.fn(),
  fetchTypesByCountryId: vi.fn(),
  fetchSortOptionsByCountryId: vi.fn(),
}));

import * as svc from '@/services/countryService';
import { resetStore, getState, setState } from './countryFilters';
import {
  loadSnapshot, saveSnapshot, hydrateCountryFilters, persistCountryFilters,
} from './countryFiltersPersistence';

const CATS = [{ id: 'c1', name: 'A' }, { id: 'c2', name: 'B' }];
const TYPES = [{ id: 't1', name: 'X' }];
const SORTS = [{ id: 's1', field_name: 'extPick', is_required: true }];

beforeEach(() => {
  resetStore();
  (localStorage as unknown as MemStorage).clear();
  vi.clearAllMocks();
  (svc.fetchCategoriesByCountryId as any).mockResolvedValue(CATS);
  (svc.fetchTypesByCountryId as any).mockResolvedValue(TYPES);
  (svc.fetchSortOptionsByCountryId as any).mockResolvedValue(SORTS);
});

describe('snapshot owner stamping', () => {
  it('round-trips for the same owner', () => {
    saveSnapshot('TR', { ...getState('TR'), categories: ['c1'], owner: 'u1' });
    expect(loadSnapshot('TR', 'u1')?.categories).toEqual(['c1']);
  });
  it('discards a snapshot owned by a different user', () => {
    saveSnapshot('TR', { ...getState('TR'), categories: ['c1'], owner: 'u1' });
    expect(loadSnapshot('TR', 'u2')).toBeNull();
  });
});

describe('hydrateCountryFilters', () => {
  it('applies the DB row (sort ids -> field names) for a logged-in user', async () => {
    (svc.fetchUserFilterPreferences as any).mockResolvedValue({
      selected_categories: ['c2'], selected_types: ['t1'],
      selected_sort_options: ['s1'], group_mode: true, view_mode: 'list', images_only: false,
    });
    await hydrateCountryFilters({ countryId: 'TR', countryName: 'Turkey', userId: 'u1' });
    const s = getState('TR');
    expect(s.categories).toEqual(['c2']);
    expect(s.sort).toEqual(['extPick']);
    expect(s.groupMode).toBe(true);
    expect(s.viewMode).toBe('list');
    expect(s.imagesOnly).toBe(false);
    expect(s.hydrated).toBe(true);
    expect(s.owner).toBe('u1');
  });

  it('falls back to admin new_user defaults when there is no saved row', async () => {
    (svc.fetchUserFilterPreferences as any).mockResolvedValue(null);
    (svc.fetchCountryDefaultPreferences as any).mockResolvedValue({
      selected_categories: ['c1'], selected_types: ['t1'], selected_sort_options: ['s1'],
      group_mode: false, view_mode: 'grid', images_only: true,
    });
    await hydrateCountryFilters({ countryId: 'TR', countryName: 'Turkey', userId: 'u1' });
    expect(svc.fetchCountryDefaultPreferences).toHaveBeenCalledWith('TR', 'new_user');
    expect(getState('TR').categories).toEqual(['c1']);
  });

  it('reconciles fully-orphaned saved IDs to admin defaults, not "all"', async () => {
    (svc.fetchUserFilterPreferences as any).mockResolvedValue({
      selected_categories: ['DEAD'], selected_types: ['DEAD'],
      selected_sort_options: [], group_mode: false, view_mode: 'grid', images_only: true,
    });
    (svc.fetchCountryDefaultPreferences as any).mockResolvedValue({
      selected_categories: ['c2'], selected_types: ['t1'], selected_sort_options: ['s1'],
      group_mode: false, view_mode: 'grid', images_only: true,
    });
    await hydrateCountryFilters({ countryId: 'TR', countryName: 'Turkey', userId: 'u1' });
    expect(getState('TR').categories).toEqual(['c2']);
  });

  it('the latest generation wins when two loads race', async () => {
    let resolveSlow: (v: any) => void;
    const slow = new Promise((r) => { resolveSlow = r; });
    (svc.fetchUserFilterPreferences as any)
      .mockReturnValueOnce(slow)                                   // first (stale) call
      .mockResolvedValueOnce({ selected_categories: ['c1'], selected_types: ['t1'],
        selected_sort_options: ['s1'], group_mode: false, view_mode: 'grid', images_only: true });
    const p1 = hydrateCountryFilters({ countryId: 'TR', countryName: 'Turkey', userId: 'u1' });
    const p2 = hydrateCountryFilters({ countryId: 'TR', countryName: 'Turkey', userId: 'u1' });
    await p2;
    resolveSlow!({ selected_categories: ['STALE'], selected_types: ['t1'],
      selected_sort_options: ['s1'], group_mode: false, view_mode: 'grid', images_only: true });
    await p1;
    expect(getState('TR').categories).toEqual(['c1']); // newer load wins
  });
});

describe('persistCountryFilters', () => {
  it('writes a localStorage snapshot synchronously', () => {
    setState('TR', { categories: ['c1'], owner: 'u1' });
    persistCountryFilters({ countryId: 'TR', userId: 'u1', sortOptions: SORTS });
    expect(loadSnapshot('TR', 'u1')?.categories).toEqual(['c1']);
  });

  it('debounces the DB upsert and sends the full row with images_only', async () => {
    vi.useFakeTimers();
    setState('TR', { categories: ['c1'], types: ['t1'], sort: ['extPick'],
      groupMode: true, viewMode: 'list', imagesOnly: false, owner: 'u1' });
    persistCountryFilters({ countryId: 'TR', userId: 'u1', sortOptions: SORTS });
    persistCountryFilters({ countryId: 'TR', userId: 'u1', sortOptions: SORTS });
    expect(svc.saveUserFilterPreferences).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    expect(svc.saveUserFilterPreferences).toHaveBeenCalledTimes(1);
    expect(svc.saveUserFilterPreferences).toHaveBeenCalledWith('u1', 'TR', expect.objectContaining({
      selected_categories: ['c1'], selected_types: ['t1'], selected_sort_options: ['s1'],
      group_mode: true, view_mode: 'list', images_only: false,
    }));
    vi.useRealTimers();
  });

  it('does not call the DB for anonymous users (snapshot only)', () => {
    vi.useFakeTimers();
    setState('TR', { categories: ['c1'], owner: null });
    persistCountryFilters({ countryId: 'TR', userId: null, sortOptions: SORTS });
    vi.advanceTimersByTime(1000);
    expect(svc.saveUserFilterPreferences).not.toHaveBeenCalled();
    expect(loadSnapshot('TR', null)?.categories).toEqual(['c1']);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- countryFiltersPersistence`
Expected: FAIL — cannot find module `./countryFiltersPersistence`.

- [ ] **Step 3: Implement**

Create `src/state/countryFiltersPersistence.ts`:
```ts
import {
  fetchUserFilterPreferences,
  saveUserFilterPreferences,
  fetchCountryDefaultPreferences,
  fetchCategoriesByCountryId,
  fetchTypesByCountryId,
  fetchSortOptionsByCountryId,
} from '@/services/countryService';
import type { CatalogDefaultAudience } from '@/types/filter';
import { CountryFilterState, getState, setState } from './countryFilters';
import { sortIdsToFieldNames, sortFieldNamesToIds, reconcileSelection } from './filterReconcile';

type SortOpt = { id: string; field_name: string | null; is_required?: boolean };

const snapshotKey = (countryId: string) => `ocf:filters:${countryId}`;

// ---- localStorage snapshot (fast cache, all users) ----

export function saveSnapshot(countryId: string, state: CountryFilterState): void {
  try {
    const payload = {
      categories: state.categories, types: state.types, sort: state.sort,
      groupMode: state.groupMode, viewMode: state.viewMode, imagesOnly: state.imagesOnly,
      search: state.search, owner: state.owner,
    };
    localStorage.setItem(snapshotKey(countryId), JSON.stringify(payload));
  } catch { /* storage unavailable/full */ }
}

export function loadSnapshot(countryId: string, currentUserId: string | null): Partial<CountryFilterState> | null {
  try {
    const raw = localStorage.getItem(snapshotKey(countryId));
    if (!raw) return null;
    const p = JSON.parse(raw);
    // Owner mismatch: never restore one account's view for another (or for anon).
    if ((p.owner ?? null) !== (currentUserId ?? null)) return null;
    return {
      categories: p.categories ?? [], types: p.types ?? [], sort: p.sort ?? [],
      groupMode: !!p.groupMode, viewMode: p.viewMode === 'list' ? 'list' : 'grid',
      imagesOnly: typeof p.imagesOnly === 'boolean' ? p.imagesOnly : true,
      search: p.search ?? '', owner: p.owner ?? null,
    };
  } catch { return null; }
}

/** One-time import of pre-store keys; safe to call repeatedly (no-op once migrated). */
export function migrateLegacyKeys(countryId: string, countryName: string, currentUserId: string | null): void {
  try {
    if (localStorage.getItem(snapshotKey(countryId))) return; // already on new key
    const legacy = sessionStorage.getItem(`catalog-filters-${countryName}`);
    if (!legacy) return;
    const p = JSON.parse(legacy);
    if ((p.userId ?? null) !== (currentUserId ?? null)) return;
    saveSnapshot(countryId, {
      ...getState(countryId),
      categories: p.categories ?? [], types: p.types ?? [], sort: p.sort ?? [],
      groupMode: !!p.groupMode, viewMode: p.viewMode === 'list' ? 'list' : 'grid',
      imagesOnly: typeof p.imagesOnly === 'boolean' ? p.imagesOnly : true,
      search: p.search ?? '', owner: currentUserId ?? null,
    });
  } catch { /* ignore */ }
}

// ---- Hydration (generation-guarded) ----

const generation = new Map<string, number>();

export async function hydrateCountryFilters(args: {
  countryId: string;
  countryName: string;
  userId: string | null;
  audience?: CatalogDefaultAudience; // defaults: logged-in -> new_user, anon -> anonymous
}): Promise<void> {
  const { countryId, countryName, userId } = args;
  const myGen = (generation.get(countryId) ?? 0) + 1;
  generation.set(countryId, myGen);
  const isCurrent = () => generation.get(countryId) === myGen;

  // Fast paint from snapshot first (does not block on network).
  migrateLegacyKeys(countryId, countryName, userId);
  const snap = loadSnapshot(countryId, userId);
  if (snap && isCurrent()) {
    setState(countryId, { ...snap, owner: userId ?? null });
  }

  const [cats, types, sorts] = await Promise.all([
    fetchCategoriesByCountryId(countryId),
    fetchTypesByCountryId(countryId),
    fetchSortOptionsByCountryId(countryId),
  ]);
  if (!isCurrent()) return;

  const validCats = new Set(cats.map((c: any) => c.id));
  const validTypes = new Set(types.map((t: any) => t.id));
  const allCatIds = cats.map((c: any) => c.id);
  const allTypeIds = types.map((t: any) => t.id);
  const sortOpts: SortOpt[] = sorts.map((s: any) => ({ id: s.id, field_name: s.field_name, is_required: s.is_required }));
  const requiredSort = sortOpts.filter((s) => s.is_required && s.field_name).map((s) => s.field_name!);
  if (!requiredSort.includes('extPick')) requiredSort.push('extPick');

  // Resolve preference source.
  let prefRow: any = null;
  let adminDefaults: any = null;
  const audience: CatalogDefaultAudience = args.audience ?? (userId ? 'new_user' : 'anonymous');

  if (userId) {
    prefRow = await fetchUserFilterPreferences(userId, countryId);
    if (!isCurrent()) return;
  }
  if (!prefRow) {
    adminDefaults = await fetchCountryDefaultPreferences(countryId, audience);
    if (!isCurrent()) return;
  }

  const savedCats = prefRow?.selected_categories ?? [];
  const savedTypes = prefRow?.selected_types ?? [];
  const defCats = adminDefaults?.selected_categories ?? [];
  const defTypes = adminDefaults?.selected_types ?? [];

  const categories = reconcileSelection(savedCats, validCats, defCats, allCatIds);
  const typesSel = reconcileSelection(savedTypes, validTypes, defTypes, allTypeIds);

  const savedSortFields = sortIdsToFieldNames(prefRow?.selected_sort_options ?? [], sortOpts);
  const defSortFields = sortIdsToFieldNames(adminDefaults?.selected_sort_options ?? [], sortOpts);
  const baseSort = savedSortFields.length ? savedSortFields : defSortFields;
  const sort = Array.from(new Set([...baseSort, ...requiredSort]));

  const groupMode = typeof prefRow?.group_mode === 'boolean' ? prefRow.group_mode
    : (typeof adminDefaults?.group_mode === 'boolean' ? adminDefaults.group_mode : getState(countryId).groupMode);
  const viewMode = (prefRow?.view_mode ?? adminDefaults?.view_mode ?? getState(countryId).viewMode) as 'grid' | 'list';
  const imagesOnly = typeof prefRow?.images_only === 'boolean' ? prefRow.images_only
    : (typeof adminDefaults?.images_only === 'boolean' ? adminDefaults.images_only : getState(countryId).imagesOnly);

  if (!isCurrent()) return;
  setState(countryId, {
    categories, types: typesSel, sort, groupMode, viewMode, imagesOnly,
    hydrated: true, owner: userId ?? null,
  });
  saveSnapshot(countryId, getState(countryId));
}

// ---- Save (snapshot now + debounced DB upsert) ----

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const SAVE_DEBOUNCE_MS = 500;

export function persistCountryFilters(args: {
  countryId: string;
  userId: string | null;
  sortOptions: SortOpt[];
}): void {
  const { countryId, userId, sortOptions } = args;
  const state = getState(countryId);
  saveSnapshot(countryId, state);
  if (!userId) return; // anonymous: snapshot only

  const existing = saveTimers.get(countryId);
  if (existing) clearTimeout(existing);
  saveTimers.set(countryId, setTimeout(() => {
    const s = getState(countryId);
    saveUserFilterPreferences(userId, countryId, {
      selected_categories: s.categories,
      selected_types: s.types,
      selected_sort_options: sortFieldNamesToIds(s.sort, sortOptions),
      group_mode: s.groupMode,
      view_mode: s.viewMode,
      images_only: s.imagesOnly,
    }).catch((e) => console.error('persistCountryFilters: DB save failed', e));
  }, SAVE_DEBOUNCE_MS));
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- countryFiltersPersistence`
Expected: PASS, all describe blocks green. If the fake-timer DB test flakes, ensure `await vi.advanceTimersByTimeAsync(500)` is used (already in the test).

- [ ] **Step 5: Commit**

```bash
git add src/state/countryFiltersPersistence.ts src/state/countryFiltersPersistence.test.ts
git commit -m "feat(filters): add hydrate + debounced persistence layer"
```

---

## Task 4: React hook (`useCountryFilters.ts`)

**Files:**
- Create: `src/hooks/useCountryFilters.ts`

Wraps the store with `useSyncExternalStore`, triggers hydration once per `(countryId, userId)`, and exposes setters that also persist. No unit test (React/auth integration is verified manually in Tasks 5–7); keep it thin.

- [ ] **Step 1: Implement the hook**

Create `src/hooks/useCountryFilters.ts`:
```ts
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchSortOptionsByCountryId } from '@/services/countryService';
import {
  CountryFilterState, getState, setState, subscribe, DEFAULT_FILTER_STATE,
} from '@/state/countryFilters';
import { hydrateCountryFilters, persistCountryFilters } from '@/state/countryFiltersPersistence';

type SortOpt = { id: string; field_name: string | null; is_required?: boolean };

export function useCountryFilters(countryId: string, countryName = '') {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const state = useSyncExternalStore(
    (cb) => (countryId ? subscribe(countryId, cb) : () => {}),
    () => (countryId ? getState(countryId) : DEFAULT_FILTER_STATE),
    () => DEFAULT_FILTER_STATE,
  );

  // Cache sort options so saves can map field-names -> ids without refetching each keystroke.
  const sortOptsRef = useRef<SortOpt[]>([]);
  useEffect(() => {
    if (!countryId) return;
    let alive = true;
    fetchSortOptionsByCountryId(countryId)
      .then((opts) => { if (alive) sortOptsRef.current = (opts as any[]).map((o) => ({ id: o.id, field_name: o.field_name, is_required: o.is_required })); })
      .catch(() => { /* keep prior */ });
    return () => { alive = false; };
  }, [countryId]);

  // Hydrate once per (country, user) once auth has resolved.
  const hydratedFor = useRef<string>('');
  useEffect(() => {
    if (!countryId || authLoading) return;
    const key = `${countryId}::${userId ?? 'anon'}`;
    if (hydratedFor.current === key) return;
    hydratedFor.current = key;
    void hydrateCountryFilters({ countryId, countryName, userId });
  }, [countryId, countryName, userId, authLoading]);

  const update = useCallback((partial: Partial<CountryFilterState>) => {
    if (!countryId) return;
    setState(countryId, { ...partial, owner: userId ?? null });
    persistCountryFilters({ countryId, userId, sortOptions: sortOptsRef.current });
  }, [countryId, userId]);

  const setters = useMemo(() => ({
    setCategories: (categories: string[]) => update({ categories }),
    setTypes: (types: string[]) => update({ types }),
    setSort: (sort: string[]) => update({ sort }),
    setGroupMode: (groupMode: boolean) => update({ groupMode }),
    setViewMode: (viewMode: 'grid' | 'list') => update({ viewMode }),
    setImagesOnly: (imagesOnly: boolean) => update({ imagesOnly }),
    setSearch: (search: string) => update({ search }),
    patch: update,
  }), [update]);

  return { state, ...setters };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from `useCountryFilters.ts`. (Pre-existing repo errors unrelated to these files are acceptable; verify none reference `src/state/*` or `useCountryFilters.ts`.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCountryFilters.ts
git commit -m "feat(filters): add useCountryFilters hook"
```

---

## Task 5: Integrate catalog (parent + filter component)

**Files:**
- Modify: `src/pages/CountryDetail.tsx`
- Modify: `src/components/filter/BanknoteFilterCatalog.tsx`

Goal: catalog reads/writes the store. The store becomes the single source of truth; remove the parent's local filter `useState`+sessionStorage seed and the component's load effect + DB/sessionStorage save logic.

**Strategy:** the parent stays the integration point — it derives `filters`, `viewMode`, `groupMode` from `useCountryFilters` and passes them down through the existing `CountryFilterSection` → `BanknoteFilterCatalog` props unchanged. The component's handlers call the store via parent callbacks. This keeps `BaseBanknoteFilter`/`CountryFilterSection` prop contracts intact.

- [ ] **Step 1: Wire the parent to the store (`src/pages/CountryDetail.tsx`)**

Add import near the other hook imports:
```ts
import { useCountryFilters } from '@/hooks/useCountryFilters';
```

Replace the `const [filters, setFilters] = useState<DynamicFilterState>(() => { ... })` block (the sessionStorage-seeded initializer, ~lines 41–63) and the separate `viewMode`/`groupMode` state with store-derived values. Immediately after `countryId` is available, add:
```ts
const { state: cf, setViewMode: cfSetViewMode, setGroupMode: cfSetGroupMode, patch: cfPatch } =
  useCountryFilters(countryId, country ? decodeURIComponent(country) : '');

const filters: DynamicFilterState = useMemo(() => ({
  search: cf.search,
  categories: cf.categories,
  types: cf.types,
  sort: cf.sort,
  imagesOnly: cf.imagesOnly,
}), [cf.search, cf.categories, cf.types, cf.sort, cf.imagesOnly]);

const viewMode = cf.viewMode;
const groupMode = cf.groupMode;
const preferencesLoaded = cf.hydrated;
```
Remove the now-dead `const [viewMode, setViewMode] = useState(...)`, `const [groupMode, ...]`, `const [preferencesLoaded, ...]`, the `last-catalog-country` seed/reset `useEffect` for search (replace with the rule in Step 2), and the `filtersCacheKey` usage tied to the removed state.

- [ ] **Step 2: Replace the parent handlers (`src/pages/CountryDetail.tsx`)**

Replace `handleFilterChange`, `handleViewModeChange`, `handleGroupModeChange`, `handlePreferencesLoaded`:
```ts
const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
  const { search, categories, types, sort, imagesOnly } = newFilters;
  const partial: Record<string, unknown> = {};
  if (search !== undefined) partial.search = search;
  if (categories !== undefined) partial.categories = categories;
  if (types !== undefined) partial.types = types;
  if (sort !== undefined) partial.sort = sort;
  if (imagesOnly !== undefined) partial.imagesOnly = imagesOnly;
  cfPatch(partial);
}, [cfPatch]);

const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
  flushSync(() => { cfSetViewMode(mode); });
}, [cfSetViewMode]);

const handleGroupModeChange = useCallback((mode: boolean) => {
  cfSetGroupMode(mode);
}, [cfSetGroupMode]);

const handlePreferencesLoaded = useCallback(() => { /* hydration owns this now */ }, []);
```
Keep the existing "reset search on catalog switch" behavior by clearing search when `country` changes:
```ts
const lastCountryRef = useRef('');
useEffect(() => {
  if (!country) return;
  if (lastCountryRef.current && lastCountryRef.current !== country && cf.search) {
    cfPatch({ search: '' });
  }
  lastCountryRef.current = country;
}, [country, cf.search, cfPatch]);
```

- [ ] **Step 3: Strip the component load + save logic (`src/components/filter/BanknoteFilterCatalog.tsx`)**

Delete:
- The entire load `useEffect` (`loadFilterOptionsAndPreferences`, ~lines 109–460) — replace with a definitions-only fetch (still needed to render the checkboxes) and a hydration trigger. The component still needs `categories`, `types`, `sortOptions` state for rendering:
```ts
useEffect(() => {
  if (!countryId) return;
  let alive = true;
  (async () => {
    const [cats, types, sorts] = await Promise.all([
      fetchCategoriesByCountryId(countryId),
      fetchTypesByCountryId(countryId),
      fetchSortOptionsByCountryId(countryId),
    ]);
    if (!alive) return;
    setCategories(cats
      .filter((c: any) => c.name !== tWithFallback('categories.unlistedBanknotes', 'Unlisted Banknotes'))
      .map((c: any) => ({ id: c.id, name: c.name, name_ar: c.name_ar, name_tr: c.name_tr })));
    setTypes(types.map((t: any) => ({ id: t.id, name: t.name, name_ar: t.name_ar, name_tr: t.name_tr })));
    setSortOptions(sorts.map((s: any) => ({ id: s.id, name: s.name, name_ar: s.name_ar, name_tr: s.name_tr, fieldName: s.field_name, isRequired: s.is_required })));
    setLoading(false);
  })();
  return () => { alive = false; };
}, [countryId]);
```
- The DB/sessionStorage bodies inside `handleFilterChange`, `handleViewModeChange`, `handleGroupModeChange`, `handleImagesOnlyChange` (the `saveUserFilterPreferences(...)`, `sessionStorage.setItem(...)`, `localStorage.setItem('imagesOnly', ...)` calls, ~lines 600–800). These handlers now only forward to the parent (which writes the store):
```ts
const handleFilterChange = React.useCallback((newFilters: Partial<DynamicFilterState>) => {
  onFilterChange(newFilters);
}, [onFilterChange]);

const handleViewModeChange = React.useCallback((mode: 'grid' | 'list') => {
  setViewMode(mode);
  onViewModeChange?.(mode);
}, [onViewModeChange]);

const handleGroupModeChange = React.useCallback((mode: boolean) => {
  onGroupModeChange?.(mode);
}, [onGroupModeChange]);

const handleImagesOnlyChange = React.useCallback((value: boolean) => {
  setImagesOnlyState(value);
  onFilterChange({ imagesOnly: value });
}, [onFilterChange]);
```
- Remove now-unused imports (`saveUserFilterPreferences`, `fetchUserFilterPreferences`, `fetchCountryDefaultPreferences`) and the `filtersCacheKey`, `loadGeneration`, `lastUserState`, `lastCountryId`, `initialLoadComplete`, `ignoreNext*` refs if no longer referenced. Keep `viewMode`/`imagesOnly` local state seeded from `currentFilters.imagesOnly` so the toggle UI reflects the store: change `const [imagesOnly, setImagesOnlyState] = useState(true)` to initialize from `currentFilters.imagesOnly ?? true`, and add an effect to sync when the prop changes:
```ts
useEffect(() => {
  if (typeof currentFilters.imagesOnly === 'boolean') setImagesOnlyState(currentFilters.imagesOnly);
}, [currentFilters.imagesOnly]);
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors in `CountryDetail.tsx` or `BanknoteFilterCatalog.tsx`. Resolve any "unused variable" errors by deleting the dead declarations they point to.

- [ ] **Step 5: Manual verification (catalog in isolation)**

Run: `npm run dev`. Then:
1. Open a country catalog. Toggle categories/types, change sort, group, view, images-only.
2. Navigate to a banknote detail and back (keep-alive) → selections intact.
3. Reload the page → selections restored (from `ocf:filters:<id>` localStorage, then confirmed by DB for logged-in users).
4. In devtools Application → Local Storage, confirm a single `ocf:filters:<countryId>` key updates; the old `catalog-filters-<name>` key is no longer written.

- [ ] **Step 6: Commit**

```bash
git add src/pages/CountryDetail.tsx src/components/filter/BanknoteFilterCatalog.tsx
git commit -m "feat(filters): drive catalog from shared store"
```

---

## Task 6: Integrate collection (parent + filter component)

**Files:**
- Modify: `src/pages/CountryDetailCollection.tsx`
- Modify: `src/components/filter/BanknoteFilterCollection.tsx`

Mirror Task 5. The collection component currently has no images-only toggle and no sessionStorage filter snapshot — it only needs the load-effect + DB-save removal.

- [ ] **Step 1: Wire the parent to the store (`src/pages/CountryDetailCollection.tsx`)**

Add import:
```ts
import { useCountryFilters } from '@/hooks/useCountryFilters';
```
Replace `const [filters, setFilters] = useState<DynamicFilterState>({ ... })` (~line 134) and the local `viewMode` (`~line 51`) / `groupMode` source with store-derived values:
```ts
const { state: cf, setViewMode: cfSetViewMode, setGroupMode: cfSetGroupMode, patch: cfPatch } =
  useCountryFilters(countryId, countryData?.name ?? '');

const filters: DynamicFilterState = useMemo(() => ({
  search: cf.search, categories: cf.categories, types: cf.types, sort: cf.sort,
}), [cf.search, cf.categories, cf.types, cf.sort]);
const viewMode = cf.viewMode;
const groupMode = cf.groupMode;
```
(If `groupMode`/`viewMode` currently come from a shared `useGroupMode`-style hook, keep that hook for its other consumers but feed it from `cf`, or replace its reads here with `cf.groupMode`/`cf.viewMode`. Do not write to both sources — the store is authoritative.)

- [ ] **Step 2: Replace the parent handlers (`src/pages/CountryDetailCollection.tsx`)**

```ts
const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
  const { search, categories, types, sort } = newFilters;
  const partial: Record<string, unknown> = {};
  if (search !== undefined) partial.search = search;
  if (categories !== undefined) partial.categories = categories;
  if (types !== undefined) partial.types = types;
  if (sort !== undefined) partial.sort = sort;
  cfPatch(partial);
}, [cfPatch]);

const handleViewModeChange = useCallback((mode: 'grid' | 'list') => { cfSetViewMode(mode); }, [cfSetViewMode]);
const handleGroupModeChange = useCallback((mode: boolean) => { cfSetGroupMode(mode); }, [cfSetGroupMode]);
```
Pass `preferencesLoaded={cf.hydrated}` to `<BanknoteFilterCollection>` if it currently receives a `preferencesLoaded` prop.

- [ ] **Step 3: Strip the component load + save logic (`src/components/filter/BanknoteFilterCollection.tsx`)**

Delete the load `useEffect` (`loadFilterOptionsAndPreferences`, ~lines 134–440) and replace with the definitions-only fetch (collection includes ALL categories — no Unlisted filter):
```ts
useEffect(() => {
  if (!countryId) return;
  let alive = true;
  (async () => {
    const [cats, types, sorts] = await Promise.all([
      fetchCategoriesByCountryId(countryId),
      fetchTypesByCountryId(countryId),
      fetchSortOptionsByCountryId(countryId),
    ]);
    if (!alive) return;
    setCategories(cats.map((c: any) => ({ id: c.id, name: c.name, name_ar: c.name_ar, name_tr: c.name_tr })));
    setTypes(types.map((t: any) => ({ id: t.id, name: t.name, name_ar: t.name_ar, name_tr: t.name_tr })));
    setSortOptions(sorts.map((s: any) => ({ id: s.id, name: s.name, name_ar: s.name_ar, name_tr: s.name_tr, fieldName: s.field_name, isRequired: s.is_required })));
    setLoading(false);
  })();
  return () => { alive = false; };
}, [countryId]);
```
Strip the DB/sessionStorage save bodies (~lines 455–590) so handlers only forward:
```ts
const handleFilterChange = React.useCallback((newFilters: Partial<DynamicFilterState>) => {
  onFilterChange(newFilters);
}, [onFilterChange]);
const handleViewModeChange = React.useCallback((mode: 'grid' | 'list') => {
  setViewMode(mode);
  onViewModeChange?.(mode);
}, [onViewModeChange]);
const handleGroupModeChange = React.useCallback((mode: boolean) => {
  onGroupModeChange?.(mode);
}, [onGroupModeChange]);
```
Remove now-unused imports (`saveUserFilterPreferences`, `fetchUserFilterPreferences`, `fetchCountryDefaultPreferences`) and the `loadGeneration`/`lastUserState`/`lastCountryId`/`initialLoadComplete`/`ignoreNext*` refs once unreferenced.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors in the two collection files.

- [ ] **Step 5: Manual verification (collection in isolation)**

Run: `npm run dev`. Open your own profile collection for a country, change every facet, navigate to a collection item and back (keep-alive) → intact; reload → restored; confirm `ocf:filters:<countryId>` updates.

- [ ] **Step 6: Commit**

```bash
git add src/pages/CountryDetailCollection.tsx src/components/filter/BanknoteFilterCollection.tsx
git commit -m "feat(filters): drive collection from shared store"
```

---

## Task 7: Cross-view verification + legacy cleanup

**Files:**
- Modify (if any stragglers found): `src/components/filter/BanknoteFilterCatalog.tsx`, `src/components/filter/BanknoteFilterCollection.tsx`, `src/pages/CountryDetail.tsx`, `src/pages/CountryDetailCollection.tsx`

- [ ] **Step 1: Grep for leftover legacy filter persistence**

Run:
```bash
rg -n "catalog-filters-|viewMode-\$\{countryId\}|groupMode-\$\{countryId\}|'imagesOnly'|filtersCacheKey" src/components/filter src/pages
```
Expected: no remaining writes to the legacy keys in the four touched files. `migrateLegacyKeys` in the persistence module is the only place still *reading* `catalog-filters-*` (intended). Remove any stragglers found.

- [ ] **Step 2: Full unit test run**

Run: `npm test`
Expected: all suites PASS (store, reconcile, persistence).

- [ ] **Step 3: Live cross-view sync matrix (the core requirement)**

Run `npm run dev`, log in, pick a country. For each facet (categories, types, sort, group mode, view mode, images-only) verify BOTH directions while both pages are kept alive:
1. Set the facet on the **catalog**, switch to the **collection** → it matches instantly (no reload).
2. Change it on the **collection**, switch back to the **catalog** → it matches instantly.
3. Reload mid-session → both views restore the same selection.
4. Log out and back in (or open a second browser) → DB row drives the same selection.
5. Logged-out: change facets on the catalog, reload → restored from localStorage.
6. Orphan test (optional, needs admin): change a category's UUID server-side → on next hydrate the view falls back to the country's admin defaults, not "all", not empty.

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 5: Commit any cleanup**

```bash
git add -A
git commit -m "chore(filters): remove legacy per-page filter persistence"
```

---

## Self-Review notes (addressed)

- **Spec §1 (store, canonical IDs, sort field-names):** Tasks 1–2.
- **Spec §2 (localStorage cache + DB truth, generation guard, debounced full-row save, key consolidation):** Task 3.
- **Spec §3′ (empty/orphaned → admin defaults → all):** `reconcileSelection` (Task 2), wired in Task 3.
- **Spec §4 (components/parents become controlled; delete dead paths; one read-migration):** Tasks 5–7; `migrateLegacyKeys` (Task 3).
- **Live cross-view sync (the headline requirement):** both parents consume the same store via `useCountryFilters`; verified in Task 7 Step 3.
- **No DB schema change:** confirmed — reuses `user_filter_preferences` / `country_default_preferences`.
- **Naming consistency:** store fns `getState`/`setState`/`subscribe`/`resetStore`; persistence fns `hydrateCountryFilters`/`persistCountryFilters`/`loadSnapshot`/`saveSnapshot`/`migrateLegacyKeys`; reconcile fns `sortIdsToFieldNames`/`sortFieldNamesToIds`/`reconcileSelection`; hook `useCountryFilters`. Used identically across all tasks.

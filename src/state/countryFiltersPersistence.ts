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

  const audience: CatalogDefaultAudience = args.audience ?? (userId ? 'new_user' : 'anonymous');

  try {
    // Fetch all async data concurrently so generation guards are checked after all
    // in-flight work completes (prevents mock-ordering issues and is more efficient).
    const [cats, types, sorts, prefRow, adminDefaultsMaybe] = await Promise.all([
      fetchCategoriesByCountryId(countryId),
      fetchTypesByCountryId(countryId),
      fetchSortOptionsByCountryId(countryId),
      userId ? fetchUserFilterPreferences(userId, countryId) : Promise.resolve(null),
      fetchCountryDefaultPreferences(countryId, audience),
    ]);
    if (!isCurrent()) return;

    const validCats = new Set(cats.map((c: any) => c.id));
    const validTypes = new Set(types.map((t: any) => t.id));
    const allCatIds = cats.map((c: any) => c.id);
    const allTypeIds = types.map((t: any) => t.id);
    const sortOpts: SortOpt[] = sorts.map((s: any) => ({ id: s.id, field_name: s.field_name, is_required: s.is_required }));
    const requiredSort = sortOpts.filter((s) => s.is_required && s.field_name).map((s) => s.field_name!);
    if (!requiredSort.includes('extPick')) requiredSort.push('extPick');

    // adminDefaults: use the fetched value only if there is no prefRow.
    // But always pass it to reconcileSelection as the fallback for orphaned IDs.
    const adminDefaults = adminDefaultsMaybe;

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
  } catch (e) {
    // Fail open: never leave the page's `cf.hydrated` gate stuck false on a fetch
    // error (infinite spinner). Honor the generation guard — a stale load must not
    // write over a newer one.
    if (generation.get(countryId) === myGen) {
      console.error('hydrateCountryFilters failed', e);
      setState(countryId, { hydrated: true, owner: userId ?? null });
    }
  }
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

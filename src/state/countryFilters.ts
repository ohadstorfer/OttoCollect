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

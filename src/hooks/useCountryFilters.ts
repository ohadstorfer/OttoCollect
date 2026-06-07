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

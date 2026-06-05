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

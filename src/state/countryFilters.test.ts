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

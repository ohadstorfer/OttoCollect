/* eslint-disable @typescript-eslint/no-explicit-any -- supabase query-builder mock needs flexible typing */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const calls: { insert: any[]; update: any[]; deletedEq: any[]; ordered: string[] } = {
    insert: [], update: [], deletedEq: [], ordered: [],
  };
  const ctrl = { result: { data: [] as any, error: null as any } };
  const makeBuilder = () => {
    const b: any = {
      insert: (rows: any) => { calls.insert.push(rows); return b; },
      update: (payload: any) => { calls.update.push(payload); return b; },
      delete: () => b,
      eq: (_col: string, val: any) => { calls.deletedEq.push(val); return b; },
      select: () => b,
      single: () => b,
      order: (col: string) => { calls.ordered.push(col); return b; },
      limit: () => b,
      then: (resolve: any) => resolve(ctrl.result),
    };
    return b;
  };
  return { calls, ctrl, fromMock: () => makeBuilder() };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.fromMock },
}));

import {
  fetchCreditLinks, createCreditLink, updateCreditLink, deleteCreditLink, normalizeCreditLink,
} from './creditLinksService';

beforeEach(() => {
  mocks.calls.insert.length = 0;
  mocks.calls.update.length = 0;
  mocks.calls.deletedEq.length = 0;
  mocks.calls.ordered.length = 0;
  mocks.ctrl.result = { data: [], error: null };
});

describe('creditLinksService', () => {
  it('normalizeCreditLink maps snake_case to camelCase', () => {
    const r = normalizeCreditLink({ id: '1', name: 'PMG', url: 'https://pmg', display_order: 3 });
    expect(r).toEqual(expect.objectContaining({ id: '1', name: 'PMG', url: 'https://pmg', displayOrder: 3 }));
  });

  it('fetchCreditLinks orders by display_order', async () => {
    mocks.ctrl.result = { data: [{ id: '1', name: 'A', url: 'u', display_order: 0 }], error: null };
    const rows = await fetchCreditLinks();
    expect(mocks.calls.ordered).toContain('display_order');
    expect(rows[0].name).toBe('A');
  });

  it('createCreditLink inserts name and url', async () => {
    mocks.ctrl.result = { data: { id: '9', name: 'X', url: 'https://x', display_order: 1 }, error: null };
    await createCreditLink('X', 'https://x');
    const payload = mocks.calls.insert[0][0];
    expect(payload).toEqual(expect.objectContaining({ name: 'X', url: 'https://x' }));
    expect(typeof payload.display_order).toBe('number');
  });

  it('updateCreditLink updates name and url for the id', async () => {
    mocks.ctrl.result = { data: { id: '9', name: 'Y', url: 'https://y', display_order: 0 }, error: null };
    await updateCreditLink('9', { name: 'Y', url: 'https://y' });
    expect(mocks.calls.update[0]).toEqual(expect.objectContaining({ name: 'Y', url: 'https://y' }));
    expect(mocks.calls.deletedEq).toContain('9');
  });

  it('deleteCreditLink deletes by id', async () => {
    mocks.ctrl.result = { data: null, error: null };
    const ok = await deleteCreditLink('9');
    expect(ok).toBe(true);
    expect(mocks.calls.deletedEq).toContain('9');
  });
});

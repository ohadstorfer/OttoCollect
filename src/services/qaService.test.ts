/* eslint-disable @typescript-eslint/no-explicit-any -- the supabase query-builder mock needs flexible typing */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mock state, hoisted so the vi.mock factories below can read it.
const mocks = vi.hoisted(() => {
  const updateCalls: any[] = [];
  const insertCalls: any[] = [];
  const ctrl = { result: { data: { id: 'e1' }, error: null } as { data: any; error: any } };
  const makeBuilder = () => {
    const b: any = {
      insert: (rows: any) => { insertCalls.push(rows); return b; },
      update: (payload: any) => { updateCalls.push(payload); return b; },
      eq: () => b,
      select: () => b,
      single: () => b,
      order: () => b,
      // Awaiting any terminal in the chain resolves to ctrl.result.
      then: (resolve: any) => resolve(ctrl.result),
    };
    return b;
  };
  return {
    updateCalls,
    insertCalls,
    ctrl,
    fromMock: () => makeBuilder(),
    detectLanguage: vi.fn(async () => 'en' as 'en' | 'ar' | 'tr'),
    translateText: vi.fn(async (text: string) => text),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.fromMock, functions: { invoke: vi.fn() } },
}));

vi.mock('./translationService', () => ({
  translationService: {
    detectLanguage: mocks.detectLanguage,
    translateText: mocks.translateText,
  },
}));

vi.mock('./databaseTranslationService', () => ({
  databaseTranslationService: { getLocalizedRecords: vi.fn(), getLocalizedRecord: vi.fn() },
  createNameTranslationConfig: vi.fn(() => ({})),
}));

import { updateQaEntry, createQaEntry } from './qaService';

beforeEach(() => {
  mocks.updateCalls.length = 0;
  mocks.insertCalls.length = 0;
  mocks.ctrl.result = { data: { id: 'e1' }, error: null };
  mocks.detectLanguage.mockClear();
  mocks.detectLanguage.mockResolvedValue('en');
  mocks.translateText.mockClear();
  mocks.translateText.mockImplementation(async (t: string) => t);
});

const richInput = {
  categoryId: 'c1', headline: 'new H', shortDescription: 'new S', content: 'new C',
  contentIsRaw: false,
};

describe('createQaEntry — Bug 2: raw-HTML save must not block on translation', () => {
  it('returns before the background translation settles', async () => {
    let release: (v: string) => void = () => {};
    const gate = new Promise<string>((r) => { release = r; });
    mocks.translateText.mockReturnValue(gate); // stays pending

    const result = await createQaEntry(
      { categoryId: 'c1', headline: 'H', shortDescription: 'S', content: '<html>raw</html>', contentIsRaw: true },
      'author-1'
    );

    // Save resolved even though translation is still pending in the background.
    expect(result).not.toBeNull();
    // ...and the translation hasn't been persisted yet: the background task is
    // blocked on the gated translateText, so its results-write update never ran.
    // (If the save were still awaiting translation, this point is unreachable.)
    expect(mocks.updateCalls.length).toBe(0);
    release('done'); // settle the pending promise so no work dangles
  });
});

describe('updateQaEntry — Bug 1: stale translation columns', () => {
  it('nulls all six _en/_ar/_tr columns so the render falls back to fresh base text', async () => {
    await updateQaEntry('e1', richInput);
    const main = mocks.updateCalls[0];
    expect(main.headline_en).toBeNull();
    expect(main.short_description_en).toBeNull();
    expect(main.content_en).toBeNull();
    expect(main.headline_ar).toBeNull();
    expect(main.short_description_tr).toBeNull();
    expect(main.content_tr).toBeNull();
  });

  it('repopulates the original-language column for a rich entry after update', async () => {
    mocks.detectLanguage.mockResolvedValue('en');
    await updateQaEntry('e1', richInput);
    // updateCalls[0] = main update (nulls); updateCalls[1] = original-language rebuild.
    const repopulate = mocks.updateCalls[1];
    expect(repopulate).toBeDefined();
    expect(repopulate.original_language).toBe('en');
    expect(repopulate.headline_en).toBe('new H');
    expect(repopulate.short_description_en).toBe('new S');
    expect(repopulate.content_en).toBe('new C');
  });
});

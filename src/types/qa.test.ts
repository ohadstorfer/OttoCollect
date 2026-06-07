import { describe, it, expect } from 'vitest';
import {
  normalizeQaEntry,
  groupEntriesByCategory,
  getLocalizedEntry,
  getLocalizedCategoryName,
  type QaCategory,
  type QaEntry,
} from './qa';

describe('normalizeQaEntry', () => {
  it('maps snake_case row to QaEntry with aliases', () => {
    const row = {
      id: '1', author_id: 'a1', category_id: 'c1',
      headline: 'Q', short_description: 'short', content: '<p>x</p>',
      display_order: 2, is_draft: false,
      created_at: 't1', updated_at: 't2',
    };
    const e = normalizeQaEntry(row);
    expect(e.id).toBe('1');
    expect(e.categoryId).toBe('c1');
    expect(e.headline).toBe('Q');
    expect(e.shortDescription).toBe('short');
    expect(e.displayOrder).toBe(2);
  });
});

describe('groupEntriesByCategory', () => {
  it('groups entries under their category, ordered by display_order', () => {
    const cats: QaCategory[] = [
      { id: 'c2', name: 'B', displayOrder: 1 },
      { id: 'c1', name: 'A', displayOrder: 0 },
    ];
    const entries: QaEntry[] = [
      { id: 'e2', categoryId: 'c1', headline: 'h2', shortDescription: '', content: '', displayOrder: 1, isDraft: false },
      { id: 'e1', categoryId: 'c1', headline: 'h1', shortDescription: '', content: '', displayOrder: 0, isDraft: false },
      { id: 'e3', categoryId: 'c2', headline: 'h3', shortDescription: '', content: '', displayOrder: 0, isDraft: false },
    ];
    const groups = groupEntriesByCategory(cats, entries);
    expect(groups.map(g => g.category.name)).toEqual(['A', 'B']);
    expect(groups[0].entries.map(e => e.id)).toEqual(['e1', 'e2']);
    expect(groups[1].entries.map(e => e.id)).toEqual(['e3']);
  });

  it('omits categories with no entries', () => {
    const cats: QaCategory[] = [{ id: 'c1', name: 'A', displayOrder: 0 }];
    const groups = groupEntriesByCategory(cats, []);
    expect(groups).toEqual([]);
  });
});

describe('getLocalizedEntry', () => {
  it('prefers the language-specific field, falls back to base', () => {
    const e: QaEntry = {
      id: 'e1', categoryId: 'c1', headline: 'EN head', headline_ar: 'AR head',
      shortDescription: 'EN short', content: 'EN body', displayOrder: 0, isDraft: false,
    };
    const ar = getLocalizedEntry(e, 'ar');
    expect(ar.headline).toBe('AR head');
    expect(ar.shortDescription).toBe('EN short'); // no AR -> fallback
    const en = getLocalizedEntry(e, 'en');
    expect(en.headline).toBe('EN head');
  });
});

describe('getLocalizedCategoryName', () => {
  it('prefers language field, falls back to name', () => {
    const c: QaCategory = { id: 'c1', name: 'Base', name_tr: 'TR', displayOrder: 0 };
    expect(getLocalizedCategoryName(c, 'tr')).toBe('TR');
    expect(getLocalizedCategoryName(c, 'ar')).toBe('Base');
  });
});

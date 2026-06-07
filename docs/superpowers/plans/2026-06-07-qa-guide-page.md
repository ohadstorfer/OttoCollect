# Q&A / FAQ Page (replaces `/guide`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `/guide` page with an admin-managed Q&A/FAQ system (categories → questions in accordions → "Learn more" full HTML article), modeled on the existing blog feature, and seed it with the 3 existing guides.

**Architecture:** New Supabase tables `qa_categories` + `qa_entries` (multilingual, admin-write RLS). A service layer (`qaService`) and translation service (`qaTranslationService`) mirror `blogService`/`blogTranslationService`. The `/guide` page is rewritten to list categories with accordion questions; `/guide-post/:id` renders the full article via the existing `RichTextContent`; `/create-guide-post[/:id]` reuses the Tiptap `RichTextEditor`. Admin gating mirrors the blog (`user.role?.includes('Admin')`) on the client and `is_super_or_country_admin()` in RLS.

**Tech Stack:** React + TypeScript, react-router-dom v6, Supabase (Postgres + RLS), Tiptap (`RichTextEditor`), shadcn/ui (`Accordion`, `Card`, `Select`, `Button`, `Input`, `Label`), react-i18next, Vitest.

**Testing note (codebase reality):** The repo has Vitest configured but currently **no test files**. This plan applies TDD to the *pure logic* (type normalizers, category-grouping, localized-content selection) where unit tests add real value, and uses explicit **manual verification** steps for Supabase/UI integration (matching how the blog feature is built — it has no automated tests). Do not skip the manual verification steps.

**Naming:** Tables/services/types use the `qa_*` prefix; public URLs stay `/guide`, `/guide-post/:id`, `/create-guide-post`.

---

## File Structure

**Create:**
- `supabase/migrations/20260607000000_qa_tables.sql` — tables, RLS, seed
- `src/types/qa.ts` — `QaCategory`, `QaEntry`, normalizers, grouping + localized helpers
- `src/types/qa.test.ts` — unit tests for the pure helpers
- `src/services/qaService.ts` — CRUD for categories + entries
- `src/services/qaTranslationService.ts` — translation/localization (mirror blog)
- `src/components/qa/CreateGuideForm.tsx` — admin editor form
- `src/pages/GuidePost.tsx` — full article page
- `src/pages/CreateGuidePost.tsx` — admin auth gate wrapper
- `public/locales/en/qa.json`, `public/locales/ar/qa.json`, `public/locales/tr/qa.json` — UI strings

**Modify:**
- `src/pages/Guide.tsx` — rewrite to render the Q&A list (accordion per category)
- `src/App.tsx` — add imports + routes for `GuidePost` and `CreateGuidePost`
- `src/i18n/config.ts` — add `'qa'` to the `ns` array

**Untouched (do NOT edit):** `public/locales/*/guide.json` (used by the onboarding/tutorial system), all `src/components/tutorial/*`.

---

## Task 1: Database migration (tables + RLS + seed)

**Files:**
- Create: `supabase/migrations/20260607000000_qa_tables.sql`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260607000000_qa_tables.sql` with this exact content:

```sql
-- Q&A / FAQ feature: categories + entries, multilingual, admin-write.
-- Public URL is /guide; tables use the qa_ prefix.

-- 1. Categories (sections such as "Getting Started", "PMG Grading")
CREATE TABLE IF NOT EXISTS public.qa_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  name_ar text,
  name_tr text,
  display_order integer NOT NULL DEFAULT 0,
  original_language text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Entries (each question / article)
CREATE TABLE IF NOT EXISTS public.qa_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  category_id uuid NOT NULL REFERENCES public.qa_categories(id) ON DELETE CASCADE,
  headline text NOT NULL,
  headline_en text,
  headline_ar text,
  headline_tr text,
  short_description text NOT NULL DEFAULT '',
  short_description_en text,
  short_description_ar text,
  short_description_tr text,
  content text NOT NULL DEFAULT '',
  content_en text,
  content_ar text,
  content_tr text,
  main_image_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_draft boolean NOT NULL DEFAULT false,
  original_language text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qa_entries_category_id_idx ON public.qa_entries(category_id);

-- 3. RLS
ALTER TABLE public.qa_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_entries ENABLE ROW LEVEL SECURITY;

-- Public read of categories.
DROP POLICY IF EXISTS "qa_categories public read" ON public.qa_categories;
CREATE POLICY "qa_categories public read"
  ON public.qa_categories FOR SELECT USING (true);

-- Admins manage categories.
DROP POLICY IF EXISTS "qa_categories admin write" ON public.qa_categories;
CREATE POLICY "qa_categories admin write"
  ON public.qa_categories FOR ALL
  USING (is_super_or_country_admin())
  WITH CHECK (is_super_or_country_admin());

-- Public read of published entries; admins read everything.
DROP POLICY IF EXISTS "qa_entries public read" ON public.qa_entries;
CREATE POLICY "qa_entries public read"
  ON public.qa_entries FOR SELECT
  USING (is_draft = false OR is_super_or_country_admin());

-- Admins manage entries.
DROP POLICY IF EXISTS "qa_entries admin write" ON public.qa_entries;
CREATE POLICY "qa_entries admin write"
  ON public.qa_entries FOR ALL
  USING (is_super_or_country_admin())
  WITH CHECK (is_super_or_country_admin());

-- 4. Seed: migrate the 3 existing guides into a "Getting Started" category.
DO $$
DECLARE
  cat_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.qa_categories WHERE name = 'Getting Started') THEN
    INSERT INTO public.qa_categories (name, name_en, display_order, original_language)
    VALUES ('Getting Started', 'Getting Started', 0, 'en')
    RETURNING id INTO cat_id;

    INSERT INTO public.qa_entries
      (category_id, headline, headline_en, short_description, short_description_en, content, content_en, display_order, original_language)
    VALUES
      (cat_id,
       'How to Add a Banknote to Your Collection',
       'How to Add a Banknote to Your Collection',
       'Browse the catalogues and add banknotes to your personal collection in a few clicks.',
       'Browse the catalogues and add banknotes to your personal collection in a few clicks.',
       '<ol><li><strong>Go to the Catalogues</strong> — From the top menu, click on "Catalogues".</li><li><strong>Choose a Country</strong> — Click on the country whose banknotes you want to view.</li><li><strong>Browse and Add Banknotes</strong> — Scroll through the list of banknotes. To add one to your collection, click the "+" icon on the top-right of the banknote card.</li><li><strong>Add More Banknotes</strong> — Repeat the process for every banknote you own. You can quickly add multiple this way.</li><li><strong>View Your Collection</strong> — Once you''re done, go to the "My Collection" section from the menu to see all the banknotes you''ve added.</li><li><strong>Remove a Mistaken Entry</strong> — If you added a banknote by mistake: click on that banknote in your collection, then click the trash icon to remove it.</li></ol>',
       '<ol><li><strong>Go to the Catalogues</strong> — From the top menu, click on "Catalogues".</li><li><strong>Choose a Country</strong> — Click on the country whose banknotes you want to view.</li><li><strong>Browse and Add Banknotes</strong> — Scroll through the list of banknotes. To add one to your collection, click the "+" icon on the top-right of the banknote card.</li><li><strong>Add More Banknotes</strong> — Repeat the process for every banknote you own. You can quickly add multiple this way.</li><li><strong>View Your Collection</strong> — Once you''re done, go to the "My Collection" section from the menu to see all the banknotes you''ve added.</li><li><strong>Remove a Mistaken Entry</strong> — If you added a banknote by mistake: click on that banknote in your collection, then click the trash icon to remove it.</li></ol>',
       0, 'en'),
      (cat_id,
       'How to Add Information or a Picture to a Banknote in Your Collection',
       'How to Add Information or a Picture to a Banknote in Your Collection',
       'Edit a banknote in your collection to add details, grade, or upload your own photos.',
       'Edit a banknote in your collection to add details, grade, or upload your own photos.',
       '<ol><li><strong>Open "My Collection"</strong> — From the top menu, click on "My Collection" to access your personal banknotes.</li><li><strong>Select a Country</strong> — Choose the country of the banknote you''d like to edit.</li><li><strong>Choose the Banknote</strong> — Scroll down and click on the banknote you want to update.</li><li><strong>Click the Edit Icon</strong> — In the banknote details page, click on the Edit icon (typically a pencil).</li><li><strong>Fill in the Details</strong> — A form will appear. You can add or update quantity, notes, grade, purchase source, or any other personal details.</li><li><strong>Click "Change Picture"</strong> — To upload or replace a photo, click the "Change Picture" button.</li><li><strong>Select Your Image</strong> — Choose a front or back image of the banknote from your device.</li><li><strong>Edit Image (Optional)</strong> — Adjust or crop the picture to fit the required display area, then click "Save".</li><li><strong>Click "Update Item"</strong> — Scroll to the bottom and click "Update Item" to apply the edits to your collection.</li></ol>',
       '<ol><li><strong>Open "My Collection"</strong> — From the top menu, click on "My Collection" to access your personal banknotes.</li><li><strong>Select a Country</strong> — Choose the country of the banknote you''d like to edit.</li><li><strong>Choose the Banknote</strong> — Scroll down and click on the banknote you want to update.</li><li><strong>Click the Edit Icon</strong> — In the banknote details page, click on the Edit icon (typically a pencil).</li><li><strong>Fill in the Details</strong> — A form will appear. You can add or update quantity, notes, grade, purchase source, or any other personal details.</li><li><strong>Click "Change Picture"</strong> — To upload or replace a photo, click the "Change Picture" button.</li><li><strong>Select Your Image</strong> — Choose a front or back image of the banknote from your device.</li><li><strong>Edit Image (Optional)</strong> — Adjust or crop the picture to fit the required display area, then click "Save".</li><li><strong>Click "Update Item"</strong> — Scroll to the bottom and click "Update Item" to apply the edits to your collection.</li></ol>',
       1, 'en'),
      (cat_id,
       'How to Suggest a Banknote Image to the Main Catalogues',
       'How to Suggest a Banknote Image to the Main Catalogues',
       'Submit your best banknote images to be featured in the main catalogues.',
       'Submit your best banknote images to be featured in the main catalogues.',
       '<ol><li><strong>Go to the Banknote Page</strong> — Navigate to the banknote page in your collection that contains the image you want to suggest.</li><li><strong>Click "Suggest to Catalogues"</strong> — Above your uploaded banknote image, click the "Suggest to Catalogues" button. This submits your image for review by an administrator.</li><li><strong>Wait for Review</strong> — Your suggestion will be reviewed by the site''s admin team. They may approve or reject your submission based on quality and clarity.</li><li><strong>Edit and Re-Suggest if Needed</strong> — If you edit or change the banknote image later, the system will allow you to suggest it again for catalogue inclusion.</li></ol><p><em>Note: Only the best-quality images are selected for the main catalogues. Admins may choose another user''s image if it''s better suited.</em></p>',
       '<ol><li><strong>Go to the Banknote Page</strong> — Navigate to the banknote page in your collection that contains the image you want to suggest.</li><li><strong>Click "Suggest to Catalogues"</strong> — Above your uploaded banknote image, click the "Suggest to Catalogues" button. This submits your image for review by an administrator.</li><li><strong>Wait for Review</strong> — Your suggestion will be reviewed by the site''s admin team. They may approve or reject your submission based on quality and clarity.</li><li><strong>Edit and Re-Suggest if Needed</strong> — If you edit or change the banknote image later, the system will allow you to suggest it again for catalogue inclusion.</li></ol><p><em>Note: Only the best-quality images are selected for the main catalogues. Admins may choose another user''s image if it''s better suited.</em></p>',
       2, 'en');
  END IF;
END $$;
```

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP tool `apply_migration` with name `qa_tables` and the SQL above (or run via the project's normal migration flow). 

Expected: success, no errors.

- [ ] **Step 3: Verify tables + seed via SQL**

Run via Supabase MCP `execute_sql`:

```sql
SELECT c.name, count(e.id) AS entries
FROM public.qa_categories c
LEFT JOIN public.qa_entries e ON e.category_id = c.id
GROUP BY c.name;
```

Expected: one row `Getting Started | 3`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260607000000_qa_tables.sql
git commit -m "feat(qa): add qa_categories + qa_entries tables, RLS, and guide seed"
```

---

## Task 2: Types + pure helpers (TDD)

**Files:**
- Create: `src/types/qa.ts`
- Test: `src/types/qa.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/types/qa.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/types/qa.test.ts`
Expected: FAIL — `./qa` cannot be resolved / exports missing.

- [ ] **Step 3: Implement `src/types/qa.ts`**

```ts
export interface QaCategory {
  id: string;
  name: string;
  name_en?: string | null;
  name_ar?: string | null;
  name_tr?: string | null;
  displayOrder: number;
  originalLanguage?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface QaEntry {
  id: string;
  authorId?: string | null;
  categoryId: string;
  headline: string;
  headline_en?: string | null;
  headline_ar?: string | null;
  headline_tr?: string | null;
  shortDescription: string;
  shortDescription_en?: string | null;
  shortDescription_ar?: string | null;
  shortDescription_tr?: string | null;
  content: string;
  content_en?: string | null;
  content_ar?: string | null;
  content_tr?: string | null;
  mainImageUrl?: string | null;
  displayOrder: number;
  isDraft: boolean;
  originalLanguage?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface QaCategoryGroup {
  category: QaCategory;
  entries: QaEntry[];
}

export const normalizeQaCategory = (row: any): QaCategory => ({
  id: row.id,
  name: row.name,
  name_en: row.name_en ?? null,
  name_ar: row.name_ar ?? null,
  name_tr: row.name_tr ?? null,
  displayOrder: row.display_order ?? 0,
  originalLanguage: row.original_language ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const normalizeQaEntry = (row: any): QaEntry => ({
  id: row.id,
  authorId: row.author_id ?? null,
  categoryId: row.category_id,
  headline: row.headline,
  headline_en: row.headline_en ?? null,
  headline_ar: row.headline_ar ?? null,
  headline_tr: row.headline_tr ?? null,
  shortDescription: row.short_description ?? '',
  shortDescription_en: row.short_description_en ?? null,
  shortDescription_ar: row.short_description_ar ?? null,
  shortDescription_tr: row.short_description_tr ?? null,
  content: row.content ?? '',
  content_en: row.content_en ?? null,
  content_ar: row.content_ar ?? null,
  content_tr: row.content_tr ?? null,
  mainImageUrl: row.main_image_url ?? null,
  displayOrder: row.display_order ?? 0,
  isDraft: row.is_draft ?? false,
  originalLanguage: row.original_language ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const langSuffix = (lang: string): '' | '_en' | '_ar' | '_tr' => {
  if (lang === 'en') return '_en';
  if (lang === 'ar') return '_ar';
  if (lang === 'tr') return '_tr';
  return '';
};

export const getLocalizedEntry = (
  entry: QaEntry,
  lang: string
): { headline: string; shortDescription: string; content: string } => {
  const s = langSuffix(lang);
  const pick = (base: 'headline' | 'shortDescription' | 'content') => {
    const key = (base + s) as keyof QaEntry;
    const val = s ? (entry[key] as string | null | undefined) : undefined;
    return (val && val.length > 0 ? val : (entry[base] as string)) ?? '';
  };
  return {
    headline: pick('headline'),
    shortDescription: pick('shortDescription'),
    content: pick('content'),
  };
};

export const getLocalizedCategoryName = (category: QaCategory, lang: string): string => {
  const s = langSuffix(lang);
  if (!s) return category.name;
  const key = ('name' + s) as keyof QaCategory;
  const val = category[key] as string | null | undefined;
  return val && val.length > 0 ? val : category.name;
};

export const groupEntriesByCategory = (
  categories: QaCategory[],
  entries: QaEntry[]
): QaCategoryGroup[] => {
  const sortedCats = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
  return sortedCats
    .map((category) => ({
      category,
      entries: entries
        .filter((e) => e.categoryId === category.id)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    }))
    .filter((g) => g.entries.length > 0);
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/types/qa.test.ts`
Expected: PASS (4 suites).

- [ ] **Step 5: Commit**

```bash
git add src/types/qa.ts src/types/qa.test.ts
git commit -m "feat(qa): QaCategory/QaEntry types + grouping/localization helpers"
```

---

## Task 3: Service layer (`qaService`)

**Files:**
- Create: `src/services/qaService.ts`

This mirrors `src/services/blogService.ts`. No automated tests (Supabase integration); verified manually in later tasks.

- [ ] **Step 1: Implement `src/services/qaService.ts`**

```ts
import { supabase } from '@/integrations/supabase/client';
import {
  QaCategory,
  QaEntry,
  normalizeQaCategory,
  normalizeQaEntry,
} from '@/types/qa';
import { translationService } from './translationService';

// Re-export the blog image uploader so the QA form has a single import source.
export { uploadBlogImage as uploadQaImage } from './blogService';

/** Fetch all categories, ordered. */
export const fetchQaCategories = async (): Promise<QaCategory[]> => {
  const { data, error } = await supabase
    .from('qa_categories')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) {
    console.error('Error fetching qa categories:', error);
    return [];
  }
  return (data || []).map(normalizeQaCategory);
};

/** Fetch all published entries (admins also get drafts via RLS). */
export const fetchQaEntries = async (): Promise<QaEntry[]> => {
  const { data, error } = await supabase
    .from('qa_entries')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) {
    console.error('Error fetching qa entries:', error);
    return [];
  }
  return (data || []).map(normalizeQaEntry);
};

/** Fetch a single entry by id. */
export const fetchQaEntryById = async (id: string): Promise<QaEntry | null> => {
  const { data, error } = await supabase
    .from('qa_entries')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('Error fetching qa entry:', error);
    return null;
  }
  return data ? normalizeQaEntry(data) : null;
};

/** Create a category. */
export const createQaCategory = async (
  name: string,
  displayOrder = 0
): Promise<QaCategory | null> => {
  const { data, error } = await supabase
    .from('qa_categories')
    .insert([{ name, name_en: name, display_order: displayOrder, original_language: 'en' }])
    .select('*')
    .single();
  if (error) {
    console.error('Error creating qa category:', error);
    return null;
  }
  return data ? normalizeQaCategory(data) : null;
};

/** Update a category's name and/or order. */
export const updateQaCategory = async (
  id: string,
  fields: { name?: string; displayOrder?: number }
): Promise<QaCategory | null> => {
  const payload: Record<string, unknown> = {};
  if (typeof fields.name === 'string') payload.name = fields.name;
  if (typeof fields.displayOrder === 'number') payload.display_order = fields.displayOrder;
  const { data, error } = await supabase
    .from('qa_categories')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    console.error('Error updating qa category:', error);
    return null;
  }
  return data ? normalizeQaCategory(data) : null;
};

export interface QaEntryInput {
  categoryId: string;
  headline: string;
  shortDescription: string;
  content: string;
  mainImageUrl?: string | null;
  displayOrder?: number;
  isDraft?: boolean;
}

/** Create an entry, then detect+store the original language fields. */
export const createQaEntry = async (
  input: QaEntryInput,
  authorId: string
): Promise<QaEntry | null> => {
  const { data, error } = await supabase
    .from('qa_entries')
    .insert([{
      author_id: authorId,
      category_id: input.categoryId,
      headline: input.headline,
      short_description: input.shortDescription,
      content: input.content,
      main_image_url: input.mainImageUrl ?? null,
      display_order: input.displayOrder ?? 0,
      is_draft: input.isDraft ?? false,
    }])
    .select('*')
    .single();
  if (error || !data) {
    console.error('Error creating qa entry:', error);
    return null;
  }

  // Detect and persist the original-language columns (best-effort).
  try {
    const lang = await translationService.detectLanguage(input.content || input.headline);
    const suffix = lang === 'en' ? '_en' : lang === 'ar' ? '_ar' : lang === 'tr' ? '_tr' : '_en';
    await supabase.from('qa_entries').update({
      original_language: lang,
      [`headline${suffix}`]: input.headline,
      [`short_description${suffix}`]: input.shortDescription,
      [`content${suffix}`]: input.content,
    }).eq('id', data.id);
  } catch (e) {
    console.error('Error detecting qa entry language:', e);
  }

  return normalizeQaEntry(data);
};

/** Update an entry. */
export const updateQaEntry = async (
  id: string,
  input: QaEntryInput
): Promise<QaEntry | null> => {
  const payload: Record<string, unknown> = {
    category_id: input.categoryId,
    headline: input.headline,
    short_description: input.shortDescription,
    content: input.content,
    main_image_url: input.mainImageUrl ?? null,
  };
  if (typeof input.displayOrder === 'number') payload.display_order = input.displayOrder;
  if (typeof input.isDraft === 'boolean') payload.is_draft = input.isDraft;

  const { data, error } = await supabase
    .from('qa_entries')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) {
    console.error('Error updating qa entry:', error);
    return null;
  }
  return normalizeQaEntry(data);
};

/** Delete an entry. */
export const deleteQaEntry = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('qa_entries').delete().eq('id', id);
  if (error) {
    console.error('Error deleting qa entry:', error);
    return false;
  }
  return true;
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `qaService.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/services/qaService.ts
git commit -m "feat(qa): qaService CRUD for categories and entries"
```

---

## Task 4: Translation service (`qaTranslationService`)

**Files:**
- Create: `src/services/qaTranslationService.ts`

Mirrors `blogTranslationService.translatePost` for the `headline`/`short_description`/`content` fields of `qa_entries`.

- [ ] **Step 1: Implement `src/services/qaTranslationService.ts`**

```ts
import { supabase } from '@/integrations/supabase/client';
import { translationService } from './translationService';

type Lang = 'ar' | 'tr' | 'en';
const BASE_FIELDS = ['headline', 'short_description', 'content'] as const;

const fieldFor = (base: string, lang: string): string =>
  lang === 'en' ? `${base}_en` : lang === 'ar' ? `${base}_ar` : lang === 'tr' ? `${base}_tr` : base;

class QaTranslationService {
  private static instance: QaTranslationService;
  static getInstance(): QaTranslationService {
    if (!QaTranslationService.instance) QaTranslationService.instance = new QaTranslationService();
    return QaTranslationService.instance;
  }

  /**
   * Translate an entry's headline/short_description/content into the target
   * language, caching results in the *_<lang> columns. Returns the localized
   * trio (existing translation if already present).
   */
  async translateEntry(
    entryId: string,
    targetLanguage: Lang,
    sourceLanguage?: string
  ): Promise<{ success: boolean; headline?: string; shortDescription?: string; content?: string }> {
    try {
      const selectCols = ['headline', 'short_description', 'content']
        .flatMap((b) => [b, `${b}_en`, `${b}_ar`, `${b}_tr`])
        .join(', ');
      const { data: entry, error } = await supabase
        .from('qa_entries')
        .select(selectCols)
        .eq('id', entryId)
        .single();
      if (error || !entry) {
        console.error('Error fetching qa entry for translation:', error);
        return { success: false };
      }

      const updateData: Record<string, string> = {};
      const result: Record<string, string> = {};

      for (const base of BASE_FIELDS) {
        const targetField = fieldFor(base, targetLanguage);
        const existing = (entry as any)[targetField];
        const original = (entry as any)[base] as string;
        if (existing) {
          result[base] = existing;
          continue;
        }
        if (!original) {
          result[base] = '';
          continue;
        }
        const detected = sourceLanguage || (await translationService.detectLanguage(original));
        if (detected !== 'en') {
          const origField = fieldFor(base, detected);
          if (!(entry as any)[origField]) updateData[origField] = original;
        }
        const translated = await translationService.translateText(original, targetLanguage, detected);
        updateData[targetField] = translated;
        result[base] = translated;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('qa_entries')
          .update(updateData)
          .eq('id', entryId);
        if (updateError) {
          console.error('Error caching qa translations:', updateError);
          return { success: false };
        }
      }

      return {
        success: true,
        headline: result.headline,
        shortDescription: result.short_description,
        content: result.content,
      };
    } catch (e) {
      console.error('Error in translateEntry:', e);
      return { success: false };
    }
  }
}

export const qaTranslationService = QaTranslationService.getInstance();
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `qaTranslationService.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/services/qaTranslationService.ts
git commit -m "feat(qa): qaTranslationService for entry field translation"
```

---

## Task 5: i18n namespace + registration

**Files:**
- Create: `public/locales/en/qa.json`, `public/locales/ar/qa.json`, `public/locales/tr/qa.json`
- Modify: `src/i18n/config.ts`

- [ ] **Step 1: Create `public/locales/en/qa.json`**

```json
{
  "title": "Frequently Asked Questions",
  "subtitle": "Find answers to common questions about OttoCollect",
  "learnMore": "Learn more",
  "backToGuide": "Back to FAQ",
  "actions": {
    "create": "New question",
    "edit": "Edit",
    "delete": "Delete",
    "save": "Save",
    "publish": "Publish",
    "cancel": "Cancel"
  },
  "form": {
    "headlineLabel": "Question (headline)",
    "headlinePlaceholder": "e.g. What notes will not be graded by PMG?",
    "shortLabel": "Short answer (shown on the FAQ list)",
    "shortPlaceholder": "A one or two sentence summary",
    "contentLabel": "Full answer",
    "contentPlaceholder": "Write the full answer...",
    "categoryLabel": "Category",
    "newCategory": "+ New category",
    "newCategoryPlaceholder": "New category name",
    "draft": "Save as draft"
  },
  "status": {
    "loading": "Loading...",
    "empty": "No questions yet.",
    "saving": "Saving...",
    "deleteConfirm": "Delete this question permanently?"
  },
  "errors": {
    "loadFailed": "Could not load the FAQ. Please try again.",
    "saveFailed": "Could not save. Please try again.",
    "validation": "Please fill in the question, short answer, category, and full answer."
  },
  "admin": {
    "onlyTitle": "Admins only",
    "onlyDescription": "Only administrators can create or edit FAQ entries."
  }
}
```

- [ ] **Step 2: Create `public/locales/ar/qa.json` and `public/locales/tr/qa.json`**

Copy the same JSON structure into both files with the same English values for now (translations are filled by the team later; the UI falls back to these). Use identical keys.

`public/locales/ar/qa.json` and `public/locales/tr/qa.json`: exact same content as the EN file in Step 1.

- [ ] **Step 3: Register the namespace in `src/i18n/config.ts`**

Find the `ns:` array (currently ends `..., 'shared', 'admin'`) and add `'qa'`:

```ts
ns: ['common', 'navigation', 'auth', 'catalog', 'collection', 'marketplace', 'forum', 'profile', 'pages', 'guide', 'filter', 'blog', 'notification', 'badges', 'settings', 'contactUs', 'messaging', 'shared', 'admin', 'qa'],
```

- [ ] **Step 4: Verify the dev server loads the namespace**

Run: `npm run dev` (then stop it). Confirm no console error about a missing `qa` namespace when visiting `/guide` later.

- [ ] **Step 5: Commit**

```bash
git add public/locales/en/qa.json public/locales/ar/qa.json public/locales/tr/qa.json src/i18n/config.ts
git commit -m "feat(qa): add qa i18n namespace (en/ar/tr) and register it"
```

---

## Task 6: Admin editor form (`CreateGuideForm`)

**Files:**
- Create: `src/components/qa/CreateGuideForm.tsx`

Reuses the Tiptap `RichTextEditor` and `uploadQaImage`. Supports create + edit (via `entryId` prop). Includes inline "new category" creation in the category `<Select>`.

- [ ] **Step 1: Implement `src/components/qa/CreateGuideForm.tsx`**

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { isContentEmpty } from '@/lib/htmlContent';
import {
  fetchQaCategories, fetchQaEntryById, createQaEntry, updateQaEntry,
  createQaCategory, uploadQaImage,
} from '@/services/qaService';
import type { QaCategory } from '@/types/qa';

const NEW_CATEGORY_VALUE = '__new__';

export function CreateGuideForm({ entryId }: { entryId?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation(['qa']);
  const { direction } = useLanguage();

  const [categories, setCategories] = useState<QaCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [headline, setHeadline] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tf = useMemo(
    () => (key: string, fallback: string) => {
      const v = t(key);
      return v === key ? fallback : v;
    },
    [t]
  );

  useEffect(() => {
    fetchQaCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (!entryId) return;
    fetchQaEntryById(entryId).then((e) => {
      if (!e) return;
      setCategoryId(e.categoryId);
      setHeadline(e.headline);
      setShortDescription(e.shortDescription);
      setContent(e.content);
    });
  }, [entryId]);

  const usingNewCategory = categoryId === NEW_CATEGORY_VALUE;
  const canSubmit =
    !!user &&
    headline.trim().length > 0 &&
    shortDescription.trim().length > 0 &&
    !isContentEmpty(content) &&
    (usingNewCategory ? newCategoryName.trim().length > 0 : categoryId.length > 0);

  const handleSubmit = async (asDraft: boolean) => {
    if (!canSubmit || !user) {
      toast({
        variant: 'destructive',
        title: tf('errors.saveFailed', 'Could not save.'),
        description: tf('errors.validation', 'Please fill in all fields.'),
      });
      return;
    }
    setIsSubmitting(true);
    try {
      let resolvedCategoryId = categoryId;
      if (usingNewCategory) {
        const created = await createQaCategory(newCategoryName.trim(), categories.length);
        if (!created) throw new Error('category creation failed');
        resolvedCategoryId = created.id;
      }

      const input = {
        categoryId: resolvedCategoryId,
        headline: headline.trim(),
        shortDescription: shortDescription.trim(),
        content,
        isDraft: asDraft,
      };

      const saved = entryId
        ? await updateQaEntry(entryId, input)
        : await createQaEntry(input, user.id);

      if (!saved) throw new Error('save failed');

      toast({ title: tf('actions.save', 'Saved') });
      navigate('/guide');
    } catch (e) {
      console.error('Error saving qa entry:', e);
      toast({
        variant: 'destructive',
        title: tf('errors.saveFailed', 'Could not save. Please try again.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }}>
      <div className="mb-6">
        <Button type="button" variant="ghost" onClick={() => navigate('/guide')} className="flex items-center">
          {direction === 'rtl' ? <ArrowRight className="mr-2 h-4 w-4" /> : <ArrowLeft className="mr-2 h-4 w-4" />}
          {tf('backToGuide', 'Back to FAQ')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="qa-category">{tf('form.categoryLabel', 'Category')}</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="qa-category">
                <SelectValue placeholder={tf('form.categoryLabel', 'Category')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
                <SelectItem value={NEW_CATEGORY_VALUE}>{tf('form.newCategory', '+ New category')}</SelectItem>
              </SelectContent>
            </Select>
            {usingNewCategory && (
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={tf('form.newCategoryPlaceholder', 'New category name')}
                maxLength={80}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="qa-headline">{tf('form.headlineLabel', 'Question (headline)')}</Label>
            <Input
              id="qa-headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder={tf('form.headlinePlaceholder', 'Question...')}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qa-short">{tf('form.shortLabel', 'Short answer')}</Label>
            <Textarea
              id="qa-short"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder={tf('form.shortPlaceholder', 'Short summary...')}
              maxLength={400}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qa-content">{tf('form.contentLabel', 'Full answer')}</Label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder={tf('form.contentPlaceholder', 'Write the full answer...')}
              dir={direction === 'rtl' ? 'rtl' : 'ltr'}
              onImageUpload={uploadQaImage}
            />
          </div>
        </CardContent>

        <CardFooter className="px-6 py-4 border-t flex justify-between">
          <Button type="button" variant="outline" onClick={() => handleSubmit(true)} disabled={isSubmitting || !canSubmit}>
            {tf('form.draft', 'Save as draft')}
          </Button>
          <Button type="submit" disabled={isSubmitting || !canSubmit}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tf('status.saving', 'Saving...')}</>
            ) : (
              tf('actions.publish', 'Publish')
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
```

- [ ] **Step 2: Verify `Textarea` and `Select` components exist**

Run: `ls src/components/ui/textarea.tsx src/components/ui/select.tsx`
Expected: both files exist. (If `textarea.tsx` is missing, replace the `<Textarea>` with a shadcn `<Input>` — but it exists in this codebase.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `CreateGuideForm.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/qa/CreateGuideForm.tsx
git commit -m "feat(qa): CreateGuideForm admin editor (Tiptap + category select)"
```

---

## Task 7: Create/edit page with admin gate (`CreateGuidePost`)

**Files:**
- Create: `src/pages/CreateGuidePost.tsx`

Mirrors `CreateBlogPost.tsx` but gates on **admin**, not just logged-in, and reads an optional `:id` route param for edit.

- [ ] **Step 1: Implement `src/pages/CreateGuidePost.tsx`**

```tsx
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreateGuideForm } from '@/components/qa/CreateGuideForm';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function CreateGuidePost() {
  const { t } = useTranslation(['qa']);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();

  const isAdmin = user ? user.role === 'Super Admin' || !!user.role?.includes('Admin') : false;
  const tf = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  if (!user || !isAdmin) {
    return (
      <div className="container py-8">
        <div className="ottoman-card p-12 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-serif mb-4 text-foreground">
            <span>{tf('admin.onlyTitle', 'Admins only')}</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-6">
            {tf('admin.onlyDescription', 'Only administrators can create or edit FAQ entries.')}
          </p>
          <Button onClick={() => navigate('/guide')} size="lg" className="px-8">
            {tf('backToGuide', 'Back to FAQ')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <CreateGuideForm entryId={id} />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CreateGuidePost.tsx
git commit -m "feat(qa): CreateGuidePost admin-gated create/edit page"
```

---

## Task 8: Full article page (`GuidePost`)

**Files:**
- Create: `src/pages/GuidePost.tsx`

Renders one entry: `headline` as title (wrapped in `<span>` per convention), `content` via `RichTextContent`. Admin edit/delete. Localized via `getLocalizedEntry`.

- [ ] **Step 1: Implement `src/pages/GuidePost.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RichTextContent } from '@/components/shared/RichTextContent';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';
import { ArrowLeft, ArrowRight, Pencil, Trash2, Loader2 } from 'lucide-react';
import { fetchQaEntryById, deleteQaEntry } from '@/services/qaService';
import { getLocalizedEntry, type QaEntry } from '@/types/qa';
import SEOHead from '@/components/seo/SEOHead';

export default function GuidePost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation(['qa']);
  const { direction, currentLanguage } = useLanguage();

  const [entry, setEntry] = useState<QaEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = user ? user.role === 'Super Admin' || !!user.role?.includes('Admin') : false;
  const tf = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchQaEntryById(id)
      .then(setEntry)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!entry) return;
    if (!window.confirm(tf('status.deleteConfirm', 'Delete this question permanently?'))) return;
    setDeleting(true);
    const ok = await deleteQaEntry(entry.id);
    setDeleting(false);
    if (ok) {
      toast({ title: tf('actions.delete', 'Deleted') });
      navigate('/guide');
    } else {
      toast({ variant: 'destructive', title: tf('errors.saveFailed', 'Error') });
    }
  };

  if (loading) {
    return <div className="container py-12 text-center">{tf('status.loading', 'Loading...')}</div>;
  }
  if (!entry) {
    return (
      <div className="container py-12 text-center">
        <p className="mb-4">{tf('errors.loadFailed', 'Could not load the FAQ.')}</p>
        <Button onClick={() => navigate('/guide')}>{tf('backToGuide', 'Back to FAQ')}</Button>
      </div>
    );
  }

  const localized = getLocalizedEntry(entry, currentLanguage);

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <SEOHead title={`${localized.headline} | OttoCollect`} description={localized.shortDescription} type="article" />

      <div className="mb-6 flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => navigate('/guide')} className="flex items-center">
          {direction === 'rtl' ? <ArrowRight className="mr-2 h-4 w-4" /> : <ArrowLeft className="mr-2 h-4 w-4" />}
          {tf('backToGuide', 'Back to FAQ')}
        </Button>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/create-guide-post/${entry.id}`)}>
              <Pencil className="h-4 w-4 mr-1" />{tf('actions.edit', 'Edit')}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>

      {entry.mainImageUrl && (
        <img src={entry.mainImageUrl} alt="" className="w-full rounded-lg mb-6 object-cover" />
      )}

      <h1 className="text-3xl font-serif font-bold mb-6 text-foreground">
        <span>{localized.headline}</span>
      </h1>

      <RichTextContent content={localized.content} className="prose max-w-none" />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/GuidePost.tsx
git commit -m "feat(qa): GuidePost full article page with admin controls"
```

---

## Task 9: Rewrite `/guide` list page (accordion per category)

**Files:**
- Modify: `src/pages/Guide.tsx` (full rewrite)

Replaces the hardcoded i18n-driven guide with a data-driven accordion. Uses shadcn `Accordion`. Each item: header = `headline`; expanded = `shortDescription` + "Learn more" link. Admin sees a "New question" button.

- [ ] **Step 1: Confirm the shadcn Accordion exists**

Run: `ls src/components/ui/accordion.tsx`
Expected: file exists (used elsewhere in the app).

- [ ] **Step 2: Rewrite `src/pages/Guide.tsx`**

Replace the entire file content with:

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { PenSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import SEOHead from '@/components/seo/SEOHead';
import { fetchQaCategories, fetchQaEntries } from '@/services/qaService';
import {
  groupEntriesByCategory, getLocalizedEntry, getLocalizedCategoryName,
  type QaCategoryGroup,
} from '@/types/qa';

const Guide = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { currentLanguage, direction } = useLanguage();
  const { t } = useTranslation(['qa']);

  const [groups, setGroups] = useState<QaCategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user ? user.role === 'Super Admin' || !!user.role?.includes('Admin') : false;
  const tf = useMemo(
    () => (key: string, fallback: string) => {
      const v = t(key);
      return v === key ? fallback : v;
    },
    [t]
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchQaCategories(), fetchQaEntries()])
      .then(([cats, entries]) => setGroups(groupEntriesByCategory(cats, entries)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <SEOHead
        title="OttoCollect FAQ - Frequently Asked Questions"
        description="Answers to common questions about collecting Ottoman Empire banknotes on OttoCollect."
        type="website"
        canonical="https://ottocollect.com/guide/"
      />

      <section className={`${theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-600'} py-12 mb-10`}>
        <div className="container mx-auto px-4 text-center">
          <h1 className={`text-3xl md:text-4xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'}`}>
            <span>{tf('title', 'Frequently Asked Questions')}</span>
          </h1>
          <p className={`mt-4 ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'} max-w-2xl mx-auto`}>
            {tf('subtitle', 'Find answers to common questions about OttoCollect')}
          </p>
        </div>
      </section>

      <div className="page-container">
        <div className="max-w-3xl mx-auto px-4">
          {isAdmin && (
            <div className="flex justify-end mb-6">
              <Button variant="outline" size="sm" onClick={() => navigate('/create-guide-post')}>
                <PenSquare className="h-4 w-4 mr-2" />
                {tf('actions.create', 'New question')}
              </Button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-10">{tf('status.loading', 'Loading...')}</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-10">{tf('status.empty', 'No questions yet.')}</div>
          ) : (
            groups.map((group) => (
              <div key={group.category.id} className="mb-10">
                <h2 className="text-xl font-bold mb-4 text-foreground">
                  <span>{getLocalizedCategoryName(group.category, currentLanguage)}</span>
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {group.entries.map((entry) => {
                    const localized = getLocalizedEntry(entry, currentLanguage);
                    return (
                      <AccordionItem key={entry.id} value={entry.id}>
                        <AccordionTrigger className={direction === 'rtl' ? 'text-right' : 'text-left'}>
                          <span>{localized.headline}</span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground mb-3 leading-relaxed">
                            {localized.shortDescription}
                          </p>
                          <button
                            type="button"
                            onClick={() => navigate(`/guide-post/${entry.id}`)}
                            className="text-primary hover:underline text-sm font-medium"
                          >
                            {tf('learnMore', 'Learn more')} »
                          </button>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Guide;
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Guide.tsx
git commit -m "feat(qa): rewrite /guide as data-driven Q&A accordion list"
```

---

## Task 10: Wire routes in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add imports**

Near the existing page imports (after `import Guide from "./pages/Guide";`), add:

```tsx
import GuidePost from "./pages/GuidePost";
import CreateGuidePost from "./pages/CreateGuidePost";
```

- [ ] **Step 2: Add routes to the `appRoutes` array**

Find the line `{ path: "/guide", element: <Guide /> },` and replace it with:

```tsx
  { path: "/guide", element: <Guide /> },
  { path: "/guide-post/:id", element: <GuidePost /> },
  { path: "/create-guide-post", element: <CreateGuidePost /> },
  { path: "/create-guide-post/:id", element: <CreateGuidePost /> },
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(qa): add /guide-post and /create-guide-post routes"
```

---

## Task 11: Manual end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Start the app**

Run: `npm run dev`

- [ ] **Step 2: Verify the public list**

Visit `/guide`. Expected:
- Title "Frequently Asked Questions".
- A "Getting Started" category with 3 accordion questions (the migrated guides).
- Expanding a question shows the short answer + "Learn more »".

- [ ] **Step 3: Verify the full article**

Click "Learn more" on the first question. Expected: navigates to `/guide-post/:id`, shows the headline as the page title and the full step-by-step HTML (ordered list).

- [ ] **Step 4: Verify admin authoring (logged in as an Admin/Super Admin)**

- "New question" button is visible on `/guide`.
- Click it → fill headline, short answer, pick/create a category, write content in the editor → Publish.
- The new question appears under its category on `/guide`.
- Edit it via the pencil on its `/guide-post/:id` page; changes persist.
- Delete it; it disappears from `/guide`.

- [ ] **Step 5: Verify non-admin is read-only**

Logged out (or as a non-admin): no "New question"/edit/delete controls; navigating to `/create-guide-post` shows the "Admins only" gate.

- [ ] **Step 6: Verify onboarding tutorial still works**

Confirm the tutorial popup/progress still render (the `guide` i18n namespace was not removed). Trigger the welcome tutorial if available.

- [ ] **Step 7: Run the unit tests + final build**

Run: `npx vitest run src/types/qa.test.ts && npm run build`
Expected: tests PASS, build succeeds.

---

## Out of scope / follow-ups (logged, not silently dropped)

- **Category reordering UI:** categories are ordered by `display_order` (set at creation). A drag-to-reorder admin UI is a follow-up; for now order is editable via `updateQaCategory`.
- **AR/TR seed translations:** seeded entries are English-only; AR/TR fill in on demand via `qaTranslationService` (a per-entry translate button can be added later, mirroring `BlogTranslationButton`).
- **Static-HTML SEO snapshot:** if the FAQ should be crawlable like other pages, the SEO bot-rendering bucket pipeline (see project memory) may need a follow-up entry; not required for this plan.
```

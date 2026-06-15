# Credits & Links Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `/credits` page styled like `/guide` that shows a flat list of name→URL links (opening in a new tab), with Super-Admin-only inline add/edit/delete.

**Architecture:** New `credit_links` Supabase table (public read, Super-Admin write via RLS) → a thin CRUD service `creditLinksService.ts` (no translation layer) → a `CreditsLinks.tsx` page cloned from `Guide.tsx`'s hero+container but rendering anchors instead of an accordion → route in `App.tsx` → footer link below "About Us".

**Tech Stack:** React + TypeScript, react-router-dom, Supabase JS client, i18next, Vitest, Tailwind, shadcn/ui (`Button`, `Input`), lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-06-14-credits-links-page-design.md`

---

### Task 1: Database migration — `credit_links` table + RLS

**Files:**
- Create: `supabase/migrations/20260614000000_credit_links.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Credits & Links: a flat, public list of name + URL items.
-- Public read; only Super Admin can write. Public URL is /credits.

CREATE TABLE IF NOT EXISTS public.credit_links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  url           text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_links ENABLE ROW LEVEL SECURITY;

-- Public read.
DROP POLICY IF EXISTS "credit_links public read" ON public.credit_links;
CREATE POLICY "credit_links public read"
  ON public.credit_links FOR SELECT USING (true);

-- Super Admin only manage (strict — not country admins).
DROP POLICY IF EXISTS "credit_links super admin write" ON public.credit_links;
CREATE POLICY "credit_links super admin write"
  ON public.credit_links FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Super Admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Super Admin'));
```

- [ ] **Step 2: Verify SQL syntax locally (no remote apply)**

Run: `grep -c "CREATE POLICY" supabase/migrations/20260614000000_credit_links.sql`
Expected: `2`

> NOTE: This project deploys migrations via the normal deploy flow (`supabase` + Cloud Build). Do NOT apply to remote here; the migration file is the deliverable. Applying to the live project requires the user's explicit go-ahead.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260614000000_credit_links.sql
git commit -m "feat(credits): add credit_links table with public-read/super-admin-write RLS"
```

---

### Task 2: Service + types — `creditLinksService.ts` (TDD)

**Files:**
- Create: `src/services/creditLinksService.ts`
- Test: `src/services/creditLinksService.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/creditLinksService.test.ts`
Expected: FAIL — cannot resolve `./creditLinksService` / exports undefined.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/services/creditLinksService.ts
import { supabase } from '@/integrations/supabase/client';

export interface CreditLink {
  id: string;
  name: string;
  url: string;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export const normalizeCreditLink = (row: any): CreditLink => ({
  id: row.id,
  name: row.name,
  url: row.url,
  displayOrder: row.display_order ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Fetch all links, ordered for display. */
export const fetchCreditLinks = async (): Promise<CreditLink[]> => {
  const { data, error } = await supabase
    .from('credit_links')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) {
    console.error('Error fetching credit links:', error);
    return [];
  }
  return (data || []).map(normalizeCreditLink);
};

/** Create a link, appending it after the current highest display_order. */
export const createCreditLink = async (name: string, url: string): Promise<CreditLink | null> => {
  const { data: top } = await supabase
    .from('credit_links')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1);
  const nextOrder = ((top && top[0]?.display_order) ?? -1) + 1;

  const { data, error } = await supabase
    .from('credit_links')
    .insert([{ name, url, display_order: nextOrder }])
    .select('*')
    .single();
  if (error || !data) {
    console.error('Error creating credit link:', error);
    return null;
  }
  return normalizeCreditLink(data);
};

/** Update a link's name and/or url. */
export const updateCreditLink = async (
  id: string,
  fields: { name?: string; url?: string }
): Promise<CreditLink | null> => {
  const payload: Record<string, unknown> = {};
  if (typeof fields.name === 'string') payload.name = fields.name;
  if (typeof fields.url === 'string') payload.url = fields.url;
  const { data, error } = await supabase
    .from('credit_links')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) {
    console.error('Error updating credit link:', error);
    return null;
  }
  return normalizeCreditLink(data);
};

/** Delete a link. */
export const deleteCreditLink = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('credit_links').delete().eq('id', id);
  if (error) {
    console.error('Error deleting credit link:', error);
    return false;
  }
  return true;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/creditLinksService.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/creditLinksService.ts src/services/creditLinksService.test.ts
git commit -m "feat(credits): add creditLinksService CRUD with tests"
```

---

### Task 3: i18n strings + namespace registration

**Files:**
- Modify: `public/locales/en/common.json` (add `footer.creditsLinks`)
- Modify: `public/locales/ar/common.json` (add `footer.creditsLinks`)
- Modify: `public/locales/tr/common.json` (add `footer.creditsLinks`)
- Create: `public/locales/en/creditsLinks.json`
- Create: `public/locales/ar/creditsLinks.json`
- Create: `public/locales/tr/creditsLinks.json`
- Modify: `src/i18n/config.ts` (add `creditsLinks` to the `ns` array)

- [ ] **Step 1: Add the footer label to each `common.json`**

In `public/locales/en/common.json`, inside the `"footer"` object (next to `"aboutUs"`), add:
```json
    "creditsLinks": "Credits & Links",
```
In `public/locales/ar/common.json` footer object, add:
```json
    "creditsLinks": "الاعتمادات والروابط",
```
In `public/locales/tr/common.json` footer object, add:
```json
    "creditsLinks": "Krediler ve Bağlantılar",
```

> Make sure a comma is added to the previous line so the JSON stays valid.

- [ ] **Step 2: Create the page namespace files**

`public/locales/en/creditsLinks.json`:
```json
{
  "title": "Credits & Links",
  "subtitle": "Useful links and the people and projects we credit.",
  "status": {
    "loading": "Loading...",
    "empty": "No links yet."
  },
  "actions": {
    "add": "Add link",
    "edit": "Edit",
    "delete": "Delete",
    "save": "Save",
    "cancel": "Cancel"
  },
  "form": {
    "namePlaceholder": "Display name",
    "urlPlaceholder": "https://example.com"
  },
  "status_deleteConfirm": "Delete this link permanently?"
}
```

`public/locales/ar/creditsLinks.json`:
```json
{
  "title": "الاعتمادات والروابط",
  "subtitle": "روابط مفيدة والأشخاص والمشاريع التي نقدّرها.",
  "status": {
    "loading": "جارٍ التحميل...",
    "empty": "لا توجد روابط بعد."
  },
  "actions": {
    "add": "إضافة رابط",
    "edit": "تعديل",
    "delete": "حذف",
    "save": "حفظ",
    "cancel": "إلغاء"
  },
  "form": {
    "namePlaceholder": "الاسم المعروض",
    "urlPlaceholder": "https://example.com"
  },
  "status_deleteConfirm": "حذف هذا الرابط نهائيًا؟"
}
```

`public/locales/tr/creditsLinks.json`:
```json
{
  "title": "Krediler ve Bağlantılar",
  "subtitle": "Faydalı bağlantılar ve teşekkür ettiğimiz kişiler ve projeler.",
  "status": {
    "loading": "Yükleniyor...",
    "empty": "Henüz bağlantı yok."
  },
  "actions": {
    "add": "Bağlantı ekle",
    "edit": "Düzenle",
    "delete": "Sil",
    "save": "Kaydet",
    "cancel": "İptal"
  },
  "form": {
    "namePlaceholder": "Görünen ad",
    "urlPlaceholder": "https://example.com"
  },
  "status_deleteConfirm": "Bu bağlantı kalıcı olarak silinsin mi?"
}
```

- [ ] **Step 3: Register the namespace**

In `src/i18n/config.ts`, find the `ns: [...]` array and add `'creditsLinks'` to it (e.g. after `'qa'`):
```ts
ns: ['common', 'navigation', 'auth', 'catalog', 'collection', 'marketplace', 'forum', 'profile', 'pages', 'guide', 'filter', 'blog', 'notification', 'badges', 'settings', 'contactUs', 'messaging', 'shared', 'admin', 'qa', 'creditsLinks'],
```

- [ ] **Step 4: Verify JSON is valid**

Run: `node -e "['en','ar','tr'].forEach(l=>{require('./public/locales/'+l+'/creditsLinks.json');require('./public/locales/'+l+'/common.json')});console.log('json ok')"`
Expected: `json ok`

- [ ] **Step 5: Commit**

```bash
git add public/locales/*/creditsLinks.json public/locales/*/common.json src/i18n/config.ts
git commit -m "feat(credits): add i18n strings and register creditsLinks namespace"
```

---

### Task 4: SEO config entry

**Files:**
- Modify: `src/config/seoConfig.ts` (add a `credits` block next to `guide`)

- [ ] **Step 1: Add the SEO block**

In `src/config/seoConfig.ts`, inside the `pages` object (right after the `guide: { ... },` block, ~line 217), add:
```ts
    credits: {
      title: 'Credits & Links - OttoCollect',
      description: 'Useful links, references, and credits for the people and projects behind OttoCollect.',
      keywords: [
        'OttoCollect credits',
        'OttoCollect links',
        'numismatic resources',
        'banknote references'
      ]
    },
```

- [ ] **Step 2: Verify it parses**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep seoConfig || echo "no seoConfig type errors"`
Expected: `no seoConfig type errors`

- [ ] **Step 3: Commit**

```bash
git add src/config/seoConfig.ts
git commit -m "feat(credits): add SEO config for /credits"
```

---

### Task 5: Page component — `CreditsLinks.tsx`

**Files:**
- Create: `src/pages/CreditsLinks.tsx`

- [ ] **Step 1: Write the page component**

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import SEOHead from '@/components/seo/SEOHead';
import { SEO_CONFIG } from '@/config/seoConfig';
import {
  fetchCreditLinks, createCreditLink, updateCreditLink, deleteCreditLink,
  type CreditLink,
} from '@/services/creditLinksService';

const CreditsLinks = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { direction } = useLanguage();
  const { t } = useTranslation(['creditsLinks']);

  const [links, setLinks] = useState<CreditLink[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline editor state: editingId === 'new' means the add row; otherwise a row id.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = user?.role === 'Super Admin';

  const tf = useMemo(
    () => (key: string, fallback: string) => {
      const v = t(key);
      return v === key ? fallback : v;
    },
    [t]
  );

  const load = () => {
    setLoading(true);
    fetchCreditLinks()
      .then(setLinks)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const startAdd = () => {
    setEditingId('new');
    setDraftName('');
    setDraftUrl('');
  };

  const startEdit = (link: CreditLink) => {
    setEditingId(link.id);
    setDraftName(link.name);
    setDraftUrl(link.url);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftName('');
    setDraftUrl('');
  };

  const saveEdit = async () => {
    const name = draftName.trim();
    const url = draftUrl.trim();
    if (!name || !url) return;
    setSaving(true);
    try {
      if (editingId === 'new') {
        await createCreditLink(name, url);
      } else if (editingId) {
        await updateCreditLink(editingId, { name, url });
      }
      cancelEdit();
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(tf('status_deleteConfirm', 'Delete this link permanently?'))) return;
    await deleteCreditLink(id);
    load();
  };

  const editorRow = (
    <div className="flex flex-col sm:flex-row gap-2 py-3 border-b border-border">
      <Input
        value={draftName}
        onChange={(e) => setDraftName(e.target.value)}
        placeholder={tf('form.namePlaceholder', 'Display name')}
        className="sm:max-w-xs"
      />
      <Input
        value={draftUrl}
        onChange={(e) => setDraftUrl(e.target.value)}
        placeholder={tf('form.urlPlaceholder', 'https://example.com')}
        className="flex-1"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={saveEdit} disabled={saving || !draftName.trim() || !draftUrl.trim()}>
          <Check className="h-4 w-4 mr-1" />{tf('actions.save', 'Save')}
        </Button>
        <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
          <X className="h-4 w-4 mr-1" />{tf('actions.cancel', 'Cancel')}
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      <SEOHead
        title={SEO_CONFIG.pages.credits.title}
        description={SEO_CONFIG.pages.credits.description}
        keywords={SEO_CONFIG.pages.credits.keywords}
        type="website"
        canonical="https://ottocollect.com/credits/"
      />

      <section className={`${theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-600'} py-12 mb-10`}>
        <div className="container mx-auto px-4 text-center">
          <h1 className={`text-3xl md:text-4xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'}`}>
            <span>{tf('title', 'Credits & Links')}</span>
          </h1>
          <p className={`mt-4 ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'} max-w-2xl mx-auto`}>
            {tf('subtitle', 'Useful links and the people and projects we credit.')}
          </p>
        </div>
      </section>

      <div className="page-container">
        <div className="max-w-3xl mx-auto px-4">
          {isSuperAdmin && editingId !== 'new' && (
            <div className="flex justify-end mb-6">
              <Button variant="outline" size="sm" onClick={startAdd}>
                <Plus className="h-4 w-4 mr-2" />
                {tf('actions.add', 'Add link')}
              </Button>
            </div>
          )}

          {isSuperAdmin && editingId === 'new' && editorRow}

          {loading ? (
            <div className="text-center py-10">{tf('status.loading', 'Loading...')}</div>
          ) : links.length === 0 && editingId !== 'new' ? (
            <div className="text-center py-10">{tf('status.empty', 'No links yet.')}</div>
          ) : (
            <ul className="divide-y divide-border">
              {links.map((link) => (
                <li key={link.id}>
                  {editingId === link.id ? (
                    editorRow
                  ) : (
                    <div className={`flex items-center justify-between gap-3 py-3 ${direction === 'rtl' ? 'flex-row-reverse text-right' : ''}`}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium break-all"
                      >
                        {link.name}
                      </a>
                      {isSuperAdmin && (
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" onClick={() => startEdit(link)} aria-label={tf('actions.edit', 'Edit')}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(link.id)} aria-label={tf('actions.delete', 'Delete')}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreditsLinks;
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep CreditsLinks || echo "no CreditsLinks type errors"`
Expected: `no CreditsLinks type errors`

- [ ] **Step 3: Commit**

```bash
git add src/pages/CreditsLinks.tsx
git commit -m "feat(credits): add CreditsLinks page with super-admin inline editing"
```

---

### Task 6: Route registration

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the import**

Near the other page imports (next to `import Guide from "./pages/Guide";`, ~line 53), add:
```tsx
import CreditsLinks from "./pages/CreditsLinks";
```

- [ ] **Step 2: Add the route**

In the routes array, after the `{ path: "/guide", element: <Guide /> },` line (~line 116), add:
```tsx
  { path: "/credits", element: <CreditsLinks /> },
```

- [ ] **Step 3: Verify it type-checks and builds the route**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "App.tsx" || echo "no App.tsx type errors"`
Expected: `no App.tsx type errors`

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(credits): register /credits route"
```

---

### Task 7: Footer link below "About Us"

**Files:**
- Modify: `src/components/layout/Footer.tsx`

- [ ] **Step 1: Add the link**

In `src/components/layout/Footer.tsx`, in the "Help & Support" nav, directly AFTER the closing `</Link>` of the About Us link (currently line 95), add:
```tsx
                <Link to="/credits" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  {t('footer.creditsLinks')}
                </Link>
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "Footer.tsx" || echo "no Footer.tsx type errors"`
Expected: `no Footer.tsx type errors`

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Footer.tsx
git commit -m "feat(credits): link Credits & Links in footer below About Us"
```

---

### Task 8: Full verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass (including the new `creditLinksService.test.ts`).

- [ ] **Step 2: Type-check the whole project**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Manual smoke test (dev server)**

Run: `npm run dev`, then in the browser:
- Visit `/credits` → hero + (empty) list render like `/guide`.
- Footer shows "Credits & Links" directly below "About Us"; clicking it navigates to `/credits`.
- As a non-Super-Admin (or logged out): no Add/Edit/Delete controls visible.
- As Super Admin: "Add link" works (after the migration is applied to the DB); a saved link renders as an anchor that opens in a new tab; edit and delete work.

> The migration (Task 1) must be applied to the target Supabase DB before add/edit/delete will succeed against the live backend. Read works regardless. Deploying the migration is the user's call.

- [ ] **Step 4: Final commit (if any cleanup)**

```bash
git status   # confirm clean working tree; nothing should be uncommitted
```

---

## Notes for the implementer

- **DRY:** the inline `editorRow` is reused for both the add row and per-row edit — don't duplicate it.
- **YAGNI:** no categories, no reordering UI, no link-name translation. Don't add them.
- **Permission:** strict `user?.role === 'Super Admin'` in the UI; RLS enforces the same on the server. Country admins are intentionally excluded (unlike `/guide`).
- **Repo convention:** title text is wrapped in `<span>` (already done in the page code).
- **No auto-deploy/push:** commits are local. Pushing and applying the migration to the live project require the user's explicit go-ahead.

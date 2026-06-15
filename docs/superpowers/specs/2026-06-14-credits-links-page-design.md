# Credits & Links — Design Spec

**Date:** 2026-06-14
**Status:** Approved (pending spec review)

## Summary

A new public page **"Credits & Links"** at `/credits` that looks like the existing
`/guide` page (same hero header + centered container) but renders a **flat list of
links** instead of an accordion. Each list item is a **name + URL**; clicking the
name opens the URL in a new browser tab. **Only Super Admin** can add, edit, or
delete items, via **inline editing** on the page itself. No HTML content, no
per-item expansion, no translation of the link names.

## Goals / Non-goals

**Goals**
- Public page styled identically to `/guide`.
- Flat list of clickable items (name → opens URL in new tab).
- Super-Admin-only inline management: add row, edit name/URL, delete row.
- Footer entry point directly below the "About Us" link.

**Non-goals (YAGNI)**
- No categories/grouping (flat list only).
- No translation of link names (only the page title/subtitle are i18n).
- No drag-and-drop reordering UI (order is by `display_order`, new items appended).
- No rich text / HTML / images per item.
- No "Learn more" / detail page (unlike guide entries).

## Data model — new table `credit_links`

New migration `supabase/migrations/<timestamp>_credit_links.sql`, modeled on
`20260607000000_qa_tables.sql`.

```sql
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
CREATE POLICY "credit_links public read"
  ON public.credit_links FOR SELECT USING (true);

-- Super Admin only manage (strict — NOT country admins).
CREATE POLICY "credit_links super admin write"
  ON public.credit_links FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Super Admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Super Admin'));
```

The strict Super-Admin RLS mirrors the inline pattern used by
`watermark_settings` / `country_default_preferences` migrations.

## Service — `src/services/creditLinksService.ts`

Simple CRUD calqued from `qaService.ts` (no translation layer):

- `fetchCreditLinks(): Promise<CreditLink[]>` — `select('*').order('display_order', { ascending: true })`.
- `createCreditLink(name, url): Promise<CreditLink | null>` — insert with
  `display_order = (current max) + 1`.
- `updateCreditLink(id, { name?, url? }): Promise<CreditLink | null>`.
- `deleteCreditLink(id): Promise<boolean>`.

Type `CreditLink { id, name, url, displayOrder, createdAt, updatedAt }` with a
`normalizeCreditLink` mapper (snake_case → camelCase), following the `qa.ts`
types pattern. Place the type either in the service file or `src/types/`.

## Page — `src/pages/CreditsLinks.tsx`

Built from the `Guide.tsx` skeleton:

- Same `SEOHead`, hero `<section>` (title + subtitle), and `page-container` +
  `max-w-3xl mx-auto` layout. **Title text wrapped in `<span>`** (repo convention).
- `isSuperAdmin = user?.role === 'Super Admin'`.
- Fetch via `fetchCreditLinks()` in `useEffect`; `loading` / empty states like guide.
- **Render (all users):** flat list. Each item:
  ```tsx
  <a href={item.url} target="_blank" rel="noopener noreferrer"
     className="text-primary hover:underline ...">
    {item.name}
  </a>
  ```
  No accordion, no expansion.
- **Super Admin controls:**
  - "Add" button (top-right, like guide's "New question" button).
  - Per-row edit (pencil) + delete (trash) icons.
  - **Inline edit mode:** the row becomes two inputs (name, url) + Save/Cancel.
    Adding a row shows an empty inline editor that inserts on save.
  - After create/update/delete, re-fetch (or update local state) so the list
    reflects changes immediately.

## Routing — `src/App.tsx`

Add to the routes array:
```tsx
{ path: "/credits", element: <CreditsLinks /> },
```
with the matching `import CreditsLinks from "./pages/CreditsLinks";`.

## Footer entry point — `src/components/layout/Footer.tsx`

In the "Help & Support" column, add a `<Link>` directly **below** the existing
About Us link (after line ~95):
```tsx
<Link to="/credits" className={...same classes...}>
  {t('footer.creditsLinks')}
</Link>
```

## i18n

New translation strings under a `footer.creditsLinks` key (footer label) and a
small set for the page itself (title, subtitle, add/edit/delete/save/cancel,
loading/empty). Reuse the page's `tf(key, fallback)` helper from `Guide.tsx` so
English fallbacks render even before translations are added. Link names are user
data and are **not** translated.

## Permissions summary

| Action            | Who          |
|-------------------|--------------|
| View page + links | Everyone     |
| Add / edit / delete | Super Admin only (UI gate + RLS) |

## Testing

- Service: unit tests for create (appends order), update, delete, fetch ordering
  (mirror `qaService.test.ts` style).
- Page: renders links with `target="_blank"`; admin controls hidden for
  non-Super-Admin; inline add/edit/delete flow.
- Manual: confirm RLS rejects writes from a non-Super-Admin session.

## Out of scope / future

Reordering UI, categories, and link-name translation can be added later if needed.

# Q&A / FAQ Page (replaces `/guide`) — Design

**Date:** 2026-06-07
**Branch:** `feat/qa-guide-page`
**Status:** Approved

## Summary

Replace the current hardcoded `/guide` page with an admin-managed Q&A / FAQ
system, modeled closely on the existing blog feature. Questions are grouped
into ordered **categories** (e.g. "PMG Grading") and rendered as accordions.
Expanding a question shows a short admin-written answer plus a **"Learn more"**
link that opens a full article page built with the same Tiptap HTML editor and
`RichTextContent` renderer used by the blog.

The key difference from blog: the admin explicitly chooses the **short text**
(`headline` = the question, `short_description` = the short answer) that appears
on the main `/guide` list, separately from the full HTML `content`.

The route `/guide` is preserved (SEO). The existing 3 guide tutorials
(`addBanknote`, `editBanknote`, `suggestPicture`) are migrated into seeded Q&A
entries with their steps converted to HTML.

## Goals

- Public, read-only Q&A list at `/guide`, grouped by category, accordion UI.
- Full article page per entry at `/guide-post/:id` (no comments).
- Admin-only create/edit at `/create-guide-post` and `/create-guide-post/:id`,
  reusing the blog's Tiptap `RichTextEditor` and components.
- Admin chooses `headline` + `short_description` (the "short text") per entry.
- Admin-managed categories with ordering and multilingual names.
- Multilingual content (EN/AR/TR) with auto-translation, same pattern as blog.
- Migrate the 3 existing guides into seed Q&A entries.

## Non-Goals (YAGNI)

- No comments on Q&A pages.
- No per-user drafts limit / rank gating (admin-only authoring).
- No reuse of the onboarding tutorial system (it stays untouched).

## Constraints / Things Not To Break

- The i18n namespace `guide.json` is **also** used by the onboarding/tutorial
  system (`TutorialPopup`, `TutorialProgress`, `TutorialDebug`,
  `TutorialHighlight`). It MUST be preserved. Only the `sections.*` keys are
  page-specific; they may stay as-is (harmless) — content is migrated to seed
  data, not deleted from the namespace.
- Project convention: every title element (`h1`–`h6`, `CardTitle`,
  `DialogTitle`, etc.) wraps its text in a `<span>`.

## Naming Decision

- Tables / services / types use the `qa_*` prefix (describes the data = Q&A).
- Public URL stays `/guide` (and `/guide-post/:id`, `/create-guide-post`).

## Data Model (Supabase)

### `qa_categories`
Sections such as "PMG Grading" / "Getting Started".

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text | main-language name |
| name_en / name_ar / name_tr | text null | translations |
| display_order | int | section ordering on the list |
| original_language | text null | auto-detected |
| created_at / updated_at | timestamptz | |

### `qa_entries`
Each question / article.

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| author_id | uuid fk profiles | |
| category_id | uuid fk qa_categories | |
| headline | text | the question (accordion header), main lang |
| headline_en / headline_ar / headline_tr | text null | |
| short_description | text | short answer shown when expanded, main lang |
| short_description_en / _ar / _tr | text null | |
| content | text | full HTML article, main lang |
| content_en / content_ar / content_tr | text null | |
| main_image_url | text null | optional image for the full page |
| display_order | int | order within the category |
| is_draft | boolean default false | unpublished if true |
| original_language | text null | auto-detected on first save |
| created_at / updated_at | timestamptz | |

**Difference vs blog:** `headline` and `short_description` are admin-chosen
(not auto-generated like the blog `excerpt`).

### RLS
- Public `SELECT` on `qa_categories` and on `qa_entries` where `is_draft = false`.
- `INSERT`/`UPDATE`/`DELETE` restricted to admin roles (mirror blog policy /
  existing admin role check pattern in the codebase).

## Routes (`src/App.tsx`)

- `/guide` → `Guide` (rewritten) — Q&A list grouped by category.
- `/guide-post/:id` → `GuidePost` — full article (no comments).
- `/create-guide-post` → `CreateGuidePost` (admin gate) — create.
- `/create-guide-post/:id` → `CreateGuidePost` (admin gate) — edit.

Nav/footer already link to `/guide`; labels stay.

## Components

- **`src/pages/Guide.tsx`** (rewrite): fetch ordered categories + their
  published entries; render shadcn `Accordion` grouped per category. Each item:
  header = `headline`, body = `short_description` + "Learn more »" link to
  `/guide-post/:id`. Show "Create" button + category management only for admins.
  Keep `SEOHead`. Provide per-entry translation affordance like blog.
- **`src/pages/GuidePost.tsx`** (new): fetch entry by id; render `headline` as
  title (wrapped in `<span>`) and `content` via `RichTextContent` (sanitized
  HTML). Admin edit/delete controls. Translation button (mirror
  `BlogTranslationButton`). No comments.
- **`src/pages/CreateGuidePost.tsx`** (new): admin auth gate (mirror
  `CreateBlogPost.tsx`), renders `CreateGuideForm`.
- **`src/components/qa/CreateGuideForm.tsx`** (new): inputs for `headline`,
  `short_description`, a category `<Select>` (with "create new category"
  option), the Tiptap `RichTextEditor` for `content`, optional image upload,
  draft/publish + save. On edit, preload entry by id.
- **`src/components/qa/QaCategoryManager.tsx`** (new, admin): create/rename/
  reorder categories. (May start minimal: create + assign; ordering via
  `display_order`.)

Reuse as-is: `RichTextEditor`, `RichTextContent`, `uploadBlogImage`, shared
editor extensions, shadcn `Accordion`/`Card`/`Select`/`Button`.

## Service Layer

- **`src/services/qaService.ts`** (mirror `blogService.ts`):
  - `fetchQaCategories()`, `fetchQaCategoriesWithEntries(language)`
  - `fetchQaEntryById(id)`
  - `createQaEntry(...)`, `updateQaEntry(...)`, `deleteQaEntry(...)`
  - `createQaCategory(...)`, `updateQaCategory(...)`
  - `fetchMyQaDrafts(userId)` (admin drafts)
  - reuse `uploadBlogImage` for images (bucket `forum_images`)
- **`src/services/qaTranslationService.ts`** (mirror `blogTranslationService.ts`):
  - `translateEntry`, `getLocalizedContent`, `hasTranslation`,
    `detectAndSaveOriginalLanguage` for `headline` / `short_description` /
    `content`, and category `name`.

## Types & i18n

- **`src/types/qa.ts`**: `QaCategory`, `QaEntry` interfaces +
  `normalizeQaEntry`, `normalizeQaCategory`.
- New i18n namespace for FAQ UI strings (titles, buttons, labels, empty states),
  registered in `src/i18n/config.ts` for EN/AR/TR. The existing `guide`
  namespace is left untouched.

## Permissions

Admin check mirrors blog: `user.role === 'Super Admin' || user.role?.includes('Admin')`.
Only admins see create/edit/delete controls and category management. Reading is
public.

## Content Migration (Seed)

Convert the 3 existing guides from `public/locales/en/guide.json`
(`sections.addBanknote`, `sections.editBanknote`, `sections.suggestPicture`)
into 3 seeded `qa_entries`:

- Category: "Getting Started" (`qa_categories`, `display_order` 0).
- For each guide: `headline` = guide title, `short_description` = one-line
  summary, `content` = the steps rendered as an HTML ordered list (`<ol><li>`),
  preserving the note where present.
- Seed via a Supabase migration (idempotent insert).

EN content is migrated; AR/TR fill in via the translation flow on demand.

## Error Handling

- List/post fetch failures: show a friendly empty/error state; never crash the
  page (mirror blog patterns).
- Create/edit: validate `headline`, `short_description`, `category_id`, and
  non-empty `content` before save; toast on failure.
- Image upload failures surface a toast; entry can still save without an image.
- HTML is sanitized on render via existing `sanitizeHtml`/`RichTextContent`.

## Testing

- Service layer: unit tests for create/update/delete/fetch and category
  grouping/ordering (mirror existing blog service test style, if present).
- Migration: verify seeded category + 3 entries exist and content is valid HTML.
- Manual: admin create → appears under correct category on `/guide`; "Learn
  more" opens `/guide-post/:id`; non-admin sees read-only; translation toggles.

## Open Items

None blocking — naming and route decisions are finalized above.

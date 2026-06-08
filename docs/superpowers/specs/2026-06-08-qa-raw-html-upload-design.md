# Q&A raw-HTML upload ("the page IS the uploaded HTML") — Design

**Date:** 2026-06-08
**Status:** Approved (implement locally; do NOT commit/push/deploy/migrate without an explicit ask)

## Problem

An admin uploads a complete, self-contained HTML document (its own
`<!DOCTYPE>`, `<head><style>`, `<body>`) for a guide/FAQ entry and wants the
`/guide-post/:id` page to **be exactly that HTML** (design preserved). The
current "Upload HTML file" button loads the file into the Tiptap editor, which
strips the design. They also want the uploaded HTML auto-translated to the other
two languages after upload.

## Approach

Add a "raw HTML" entry type. When the admin uploads/pastes a raw HTML document,
store it verbatim and render it faithfully (humans: sandboxed `<iframe srcdoc>`;
bots: the HTML served as the page with our SEO meta injected). Translate the
whole document to the other two languages with Google Translate `format=html`
(preserves tags/CSS) at publish time.

## Decisions

- **Render (human):** sandboxed `<iframe srcdoc=...>` with
  `sandbox="allow-same-origin"` (NO `allow-scripts`). The sandbox neutralises all
  JS (so no extra sanitising needed); `allow-same-origin` lets the parent read
  `contentDocument` to auto-size the iframe height. Full design preserved.
- **Editor UX:** an entry is either **Rich text** (Tiptap, default) or **HTML**
  (raw). A toggle switches modes. HTML mode = a monospace `<textarea>` holding
  the source + an "Upload .html" button that fills it + a live iframe preview.
- **Translation:** eager at publish for raw entries — translate headline +
  short answer (`format=text`) and the full content (`format=html`) into the two
  non-original languages, storing `*_ar`/`*_tr`. Reads then just pick the column
  (no per-view API calls). Resilient: on a failed field translation, fall back to
  the base text for that field/lang.
- **Naming:** new boolean column `qa_entries.content_is_raw`.

## Data model

`qa_entries`: add `content_is_raw boolean NOT NULL DEFAULT false`.
(Existing `content` / `content_en/_ar/_tr` columns hold the full HTML for raw
entries.)

## Components / changes

1. **Migration** `supabase/migrations/20260608000000_qa_content_is_raw.sql` —
   add the column.
2. **`src/types/qa.ts`** — `QaEntry.contentIsRaw`; set it in `normalizeQaEntry`.
   `getLocalizedEntry` already picks `content_<lang>` so raw reads work unchanged.
3. **`supabase/functions/translate-content/index.ts`** — accept optional
   `format: 'text' | 'html'` (default `'text'`), pass to Google Translate's
   `format`. Backward compatible (blog/forum keep `text`).
4. **`src/services/translationService.ts`** — `translateText(text, target,
   source = 'en', format: 'text' | 'html' = 'text')`; forward `format` to the
   edge function.
5. **`src/services/qaService.ts`**
   - `QaEntryInput.contentIsRaw?: boolean`; write `content_is_raw`.
   - `createQaEntry` / `updateQaEntry`: when raw, after the write, eagerly
     translate headline+short (`text`) and content (`html`) into the two
     non-original languages and save the `*_ar`/`*_tr` columns (plus base
     `*_<orig>`); fall back to base on failure.
   - `updateQaEntry` already nulls `*_ar`/`*_tr`; for raw it then re-populates
     them via the eager translation.
   - Read path (`fetchQaEntriesWithTranslations`,
     `fetchQaEntryByIdWithTranslations`): split rows — non-raw use the existing
     `getLocalizedRecords(..., autoTranslate = true)`; raw use
     `getLocalizedRecords(..., autoTranslate = false)` (pick stored columns, no
     API, never text-mode-translate the HTML). Preserve original ordering.
6. **`src/components/qa/RawHtmlFrame.tsx`** (new) — `<iframe srcDoc={html}
   sandbox="allow-same-origin">`; on load + on window resize, set height from
   `iframe.contentDocument.body.scrollHeight`.
7. **`src/pages/GuidePost.tsx`** — if `entry.contentIsRaw` render `RawHtmlFrame`
   with the localized content; else `RichTextContent` (unchanged).
8. **`src/components/qa/CreateGuideForm.tsx`** — mode toggle (Rich / HTML). HTML
   mode: textarea (source) + upload `.html` button (fills textarea) + iframe
   preview. On submit, pass `contentIsRaw`. The old "load file into Tiptap"
   behaviour is removed.
9. **`supabase/functions/generate-catalog-pages/index.ts`** —
   `generateGuidePostHTML`: if raw, output the uploaded HTML as the page
   (strip `<script>` for the bot-served copy) with our `<link rel=canonical>` +
   robots/OG meta injected into `<head>`; else the current Article path.
10. **i18n** (`public/locales/{en,ar,tr}/qa.json`) — keys for the mode toggle,
    HTML source label, preview label.

## Error handling

- Translation failure for a field/lang → store base text (page still renders).
- Very large HTML may exceed Google Translate's per-request limit → that field's
  translation falls back to base; logged. (No chunking — YAGNI for now.)
- Iframe with no `allow-scripts`: any `<script>`/inline handler simply doesn't
  run; no XSS surface for human viewers.

## Out of scope

- Per-language static bot files (static stays base/English, like blog).
- Editing raw HTML inside a WYSIWYG (raw mode is source-only by design).
- Chunked translation of very large documents.

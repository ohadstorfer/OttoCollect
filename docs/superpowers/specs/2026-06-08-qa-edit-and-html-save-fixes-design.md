# Guide (Q&A) editor fixes — rich-text edits & HTML save blocking

**Date:** 2026-06-08
**Status:** Approved (design), pending implementation
**Area:** `src/services/qaService.ts` (no schema changes)

## Problem

Two bugs reported from admin testing of the User Guide editor:

### Bug 1 — editing a rich-text ("Editor") entry doesn't show the changes
Creating a rich-text entry works; the first publish is correct. But editing it
afterward and publishing again does **not** update what's shown — neither the
short answer nor the full editor body.

### Bug 2 — re-saving / overriding an HTML entry sometimes won't let you save
Uploading HTML works. But re-saving (overriding) an existing HTML entry
sometimes leaves the Publish/Save button stuck; closing the browser and coming
back lets you save again.

## Root cause

### Bug 1 — the render prefers a per-language column the update never refreshes
- Both the list (`Guide.tsx:94`) and detail page (`GuidePost.tsx:67`) render via
  `getLocalizedEntry(entry, currentLanguage)`.
- `langSuffix('en')` returns `'_en'` (not empty), so even in English the render
  **prefers `headline_en` / `short_description_en` / `content_en`** over the base
  columns (`types/qa.ts:81-103`).
- **Create** detects language and writes those `_en` columns (`qaService.ts:296-305`)
  → first publish is correct.
- **Update** writes the base columns and **nulls only `_ar`/`_tr`**, never
  refreshing `_en` (`qaService.ts:319-335`). So `content_en` keeps the pre-edit
  text and the page keeps rendering it.
- Raw-HTML entries avoid this because their update re-runs
  `persistRawEntryTranslations`, which rewrites the original-language column.

### Bug 2 — the save awaits a slow, no-timeout full-HTML translation
- Saving a raw-HTML entry `await`s `persistRawEntryTranslations` (`qaService.ts:354`),
  which translates the **full HTML document twice** (→ ar, tr) via the edge
  function (`qaService.ts:249-260`).
- Neither `translateText` nor `supabase.functions.invoke` has a client-side
  timeout (`translationService.ts:101-130`). A slow/stalled edge function on a
  large document leaves the `await` pending.
- While pending, `isSubmitting` stays `true` → Publish button stuck disabled on
  "Saving…" (`CreateGuideForm.tsx:104-137, 273-282`). A reload resets it.

## Fix

All changes are in `src/services/qaService.ts`. No schema or component changes.

### Bug 1 fix
1. **Null all three language columns on update**, not just `_ar`/`_tr`. Add
   `headline_en`, `short_description_en`, `content_en` to the null-out payload in
   `updateQaEntry`. This makes `getLocalizedEntry` fall back to the fresh base
   columns immediately on save, so edits are visible right away.
2. **Rebuild the original-language cache after update.** Extract create's
   "detect language → write `*_<orig>` columns" block into a shared helper
   `persistRichEntryOriginalLanguage(entryId, input)`. Call it from:
   - `createQaEntry` rich-text branch (no behavior change), and
   - the rich-text branch of `updateQaEntry` (new), after the base update.

### Bug 2 fix
- **Run the eager raw-HTML translation in the background.** Change
  `await persistRawEntryTranslations(...)` to fire-and-forget
  (`void persistRawEntryTranslations(id, input).catch(console.error)`) in both
  `createQaEntry` and `updateQaEntry`. The base row is already saved, so the
  function returns immediately and the Save button never waits on translation.
- **Add a per-call timeout** around the translation calls so a stalled edge
  function can't leave a zombie background promise; on timeout, fall back to the
  base text (same as the existing error fallback).

## Behavior after fix

- Editing a rich-text entry shows the new short answer and body immediately
  (base fallback), and rebuilds the original-language cache.
- Saving/overriding a raw-HTML entry returns instantly; ar/tr translations fill
  in a few seconds later in the background.

## Accepted tradeoff

Immediately after saving a raw-HTML entry, switching to Arabic/Turkish within
~1–2 seconds may briefly show the original-language HTML until the background
translation lands. The raw read path already falls back to the base column
(`autoTranslate=false`), so this is a brief, self-healing state.

## Out of scope

- RTL (`dir="rtl"`) is not applied to translated Arabic raw-HTML documents
  (`RawHtmlFrame` injects no direction). Tracked separately; not part of these
  two bugs.
- Static-HTML/SEO regeneration timing relative to background translation is
  unchanged (separate trigger).

## Testing

- Unit: `persistRichEntryOriginalLanguage` writes the correct `*_<orig>` column
  for en/ar/tr-detected input; `updateQaEntry` payload nulls all six `_ar/_tr/_en`
  columns.
- Manual: create a rich entry → edit short answer + body → publish → both update
  on the list and detail page (English). Re-save a large HTML entry → button
  returns immediately, no stuck spinner; ar/tr populate shortly after.

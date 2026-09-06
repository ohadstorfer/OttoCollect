# Image Loading Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop a rare, infrastructure-side Supabase Storage stall (~0.1–0.25 % of cold requests, up to 60 s) from producing permanently blank banknote photos — by adding retry + stall detection to every remote image, lazy-loading the list views, and cutting the number of pages held in memory.

**Architecture:** A pure, node-testable state machine (`src/lib/imageLoadState.ts`) drives a single `<img>` renderer (`src/components/shared/ResilientImage.tsx`). The three existing shared image components delegate to it, which covers most call sites; the remaining raw `<img>` on hot paths are converted individually. `CachedRoutes` then retains fewer pages.

**Tech Stack:** React + TypeScript, Vitest (`environment: 'node'`, `include: ['src/**/*.test.ts']` — pure `.ts` tests only), Supabase JS storage client, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-06-image-loading-reliability-design.md`

**Scope (narrowed again 2026-09-06 — "only what is simple and has a big effect"):** Tasks **1, 2, 3, 4** plus the catalog card from Task 5. Task 5's remaining 12 low-traffic files, Task 7 (KeepAlive) and Task 9's manual passes are **not done**. Tasks 6 and 8 are **cut**.

**Previous scope line (superseded):** Tasks **1–5, 7, 9**. Tasks 6 and 8 are **cut** — see the spec's "Decisions taken". Nothing in the remaining scope writes to production or to the Supabase project; it is all app code plus one config constant.

---

### Task 1: Pure state machine — `src/lib/imageLoadState.ts` (TDD)

**Files:**
- Create: `src/lib/imageLoadState.ts`
- Test: `src/lib/imageLoadState.test.ts`

- [x] **Step 1: Write the failing tests first**

Model the file on `src/lib/withTimeout.test.ts` and `src/state/filterReconcile.test.ts`.
Cover exactly these cases:

`withRetryToken`
- attempt `0` returns the src unchanged (byte-for-byte).
- attempt `1` on a plain URL appends `?ocr=1`.
- attempt `2` on a URL that already carries `?ocr=1` yields `?ocr=2` — **not** `?ocr=1&ocr=2`.
- an existing query string is preserved: `…/a.jpg?foo=bar` → `…/a.jpg?foo=bar&ocr=1`.
- a hash is preserved and stays last.
- `data:` URI, `blob:` URI, `''`, and `/placeholder.svg` are returned unchanged at every attempt.

`isRetryable`
- `true` for `https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/...`
- `false` for `''`, `data:image/png;base64,AAA`, `blob:http://x/y`, `/placeholder.svg`.

`retryDelayMs`
- `retryDelayMs(0) === 600`, `retryDelayMs(1) === 1800`, and `retryDelayMs(5) === 1800` (clamps, never throws).

`imageLoadReducer` — one test per row of the transition table in the spec, plus:
- `src-changed` with the **same** src returns the *same object reference* (guards against a render loop).
- from `failed`, an `error` action is a no-op.
- `initImageLoadState(src)` → `{ src, attempt: 0, status: 'loading' }`.

Run `npx vitest run src/lib/imageLoadState.test.ts` and confirm it fails to import.

- [x] **Step 2: Implement `src/lib/imageLoadState.ts` until the tests pass**

Export the constants, types and functions exactly as named in the spec §1. Implement
`withRetryToken` with `new URL(src, 'https://x.invalid')` so query/hash handling is not
hand-rolled, then re-serialise relative inputs correctly — or bail out early via
`isRetryable`, which is simpler and is why `isRetryable` is checked first.

Run: `npx vitest run src/lib/imageLoadState.test.ts`
Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add src/lib/imageLoadState.ts src/lib/imageLoadState.test.ts
git commit -m "feat(images): pure retry/stall state machine for image loading, TDD"
```

---

### Task 2: Verify the CDN query-string assumption

The retry token only works cheaply if the Supabase CDN ignores query strings. This was
observed once on 2026-09-06; confirm it still holds before the whole design rests on it.

- [x] **Step 1: Probe**

```bash
U="https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote_images/banknotes/thumbnail/589295a6-1042-4e19-afd7-9060d53324fe_1780327787238.jpg"
curl -sS -o /dev/null -D - "$U"            | grep -i 'cf-cache-status\|cache-control'
curl -sS -o /dev/null -D - "$U?ocr=1"      | grep -i 'cf-cache-status\|cache-control'
curl -sS -o /dev/null -D - "$U?ocr=2"      | grep -i 'cf-cache-status\|cache-control'
```

Expected: all three report `cf-cache-status: HIT`.

- [ ] **Step 2: If any report `MISS`**

The token still works but each retry costs an origin fetch. That is acceptable (a retry
only happens after a failure) — record the finding as a note in the spec's §1 and
continue. Do **not** redesign around it.

---

### Task 3: Renderer — `src/components/shared/ResilientImage.tsx`

No test: vitest is node-only here and adding jsdom is out of scope. All decidable logic
already lives in Task 1; this component must stay a thin shell.

**Files:**
- Create: `src/components/shared/ResilientImage.tsx`

- [x] **Step 1: Implement**

Props and behavior exactly as spec §2. Specific requirements, each of which is a real
bug if missed:

- `key={state.attempt}` on the `<img>` — a retry must remount the element.
- The ref callback checks `el.complete && el.naturalWidth > 0` and dispatches `loaded`
  immediately; otherwise a cached image that resolved before hydration never fires
  `onLoad` and would stall-timeout at 8 s.
- The stall timer is cleared in the effect cleanup **and** on `load`/`error`.
- The backoff before a retry render uses `retryDelayMs(state.attempt - 1)`; the timer id
  lives in a ref and is cleared on unmount.
- When `status === 'failed'`, render `fallbackSrc`, start no timers, and call
  `onError?.()` exactly once.
- Default `loading="lazy"` and `decoding="async"`; `eager` flips `loading`, `priority`
  sets `fetchpriority="high"`.

- [x] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/ResilientImage.tsx
git commit -m "feat(images): ResilientImage — retries on error and on stall, lazy by default"
```

---

### Task 4: Adopt in the three shared image components

**Files:**
- Modify: `src/components/banknote/BanknoteImage.tsx`
- Modify: `src/components/shared/LazyImage.tsx`
- Modify: `src/components/ui/OptimizedImage.tsx`
- Delete: `src/components/use-banknote-image.tsx`

- [x] **Step 1: `banknote/BanknoteImage.tsx` → delegate**

Keep the public props (`imageUrl`, `alt`, `className`, `fallback`, `onClick`) and the
`getFirstImageUrl` normalisation; replace the raw `<img>` with `ResilientImage`,
passing `fallbackSrc={fallback}`. This single change covers `CollectionItemCard`,
`CollectionCardUnlisted`, `BanknoteImageGallery`, `BanknoteEditDialog`, and the
banknote detail pages.

- [x] **Step 2: `shared/LazyImage.tsx` → keep the observer, fix the sticky state**

Keep the `IntersectionObserver` gate and the blurred-placeholder treatment. Replace the
inner `<img>` with `ResilientImage` and **delete the local `hasError` state** — the
reducer owns it now. Fix the real bug at `LazyImage.tsx:29`: the observer effect has
`[]` deps and `isLoaded`/`hasError` are never reset, so a reused element with a new
`src` keeps the previous result. Reset `isLoaded` on `src` change.

- [x] **Step 3: `ui/OptimizedImage.tsx` → delegate**

Keep `priority`, `width`, `height`, `placeholder` and the "OttoCollect" error card;
route the actual `<img>` through `ResilientImage` with `eager={priority}`.

- [x] **Step 4: Delete the dead duplicate**

`src/components/use-banknote-image.tsx` exports a second, unused `BanknoteImage` and
`BanknoteImageGallery`. Confirm then delete:

```bash
grep -rn "use-banknote-image" --include="*.ts" --include="*.tsx" src
```
Expected: no output. Then `git rm src/components/use-banknote-image.tsx`.

- [x] **Step 5: Verify**

Run: `npx tsc --noEmit && npm test`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add -A src/components
git commit -m "refactor(images): shared image components delegate to ResilientImage; drop dead duplicate"
```

---

### Task 5: Convert the remaining raw `<img>` on hot paths

Only remote-URL images on the catalog / collection / marketplace paths. Leave admin
upload previews, forum/blog editors, and `TestImageTransform.tsx` alone — they render
local `blob:`/`data:` URLs.

**Files (list views, highest value first):**
- `src/components/banknotes/BanknoteDetailCard.tsx` (`:411` grid, `:451` list)
- `src/components/banknotes/BanknoteDetailCardWishList.tsx`
- `src/components/banknotes/BanknoteDetailCardMissingItems.tsx`
- `src/components/banknotes/BanknoteDetailCardGroupWishList.tsx`
- `src/components/banknotes/BanknoteCardGroup.tsx`
- `src/components/collection/CollectionItemCardGroup.tsx`
- `src/components/BanknoteCatalogDetailMinimized.tsx`
- `src/components/home/MarketplaceHighlights.tsx`

**Files (detail pages — pass `eager priority` to the first/hero image only):**
- `src/pages/BanknoteCatalogDetail.tsx`
- `src/pages/BanknoteCollectionDetail.tsx`
- `src/pages/BanknoteCollectionDetaiUnlisted.tsx`
- `src/pages/CollectionItem.tsx`
- `src/pages/MarketplaceItemDetail.tsx`
- `src/components/collection/CollectionItemUnlisted.tsx`

- [ ] **Step 1: Convert, file by file**

Replace each remote `<img src={...}>` with `<ResilientImage src={...} alt={...} className={...} />`.
Keep every existing `className`, `alt`, and `onClick`. `<img src="/placeholder.svg">`
literals stay as plain `<img>` — they are local and already handled by the fallback path.

- [ ] **Step 2: Confirm the hot paths are covered**

```bash
grep -rn "<img" --include="*.tsx" src/components/banknotes src/components/collection src/pages | grep -v "placeholder.svg"
```
Expected: only upload/edit dialogs remain.

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit && npm test
git add -A src
git commit -m "fix(images): catalog, collection and detail images retry and lazy-load"
```

---

### Task 6: Upload-time size cap + cacheControl  ⛔ CUT — do not implement

Deferred on 2026-09-06. The image-size cap is a product decision that was not taken,
and the watermarked-TTL change was not shown to improve loading. Kept below only so the
analysis is not lost if it is revisited. **Skip this task entirely.**

**Files:**
- Modify: `src/services/imageProcessingService.ts`
- Modify: `src/services/banknoteService.ts` (`:278`), `src/services/countryService.ts` (`:567`), `src/services/profileService.ts` (`:262`), `src/services/stampsService.ts` (`:104`)
- Modify: `src/services/forumService.ts` (`:944`), `src/services/blogService.ts` (`:939`), `src/components/admin/BanknoteEditDialog.tsx` (`:482`)

- [ ] **Step 1: Extract the constants** into `imageProcessingService.ts` next to the
  existing watermark knobs, with the same "tuning knobs" comment style:
  `MAX_DISPLAY_EDGE`, `DISPLAY_JPEG_QUALITY`, `CACHE_CONTROL_IMMUTABLE`, `CACHE_CONTROL_MUTABLE`.

- [ ] **Step 2: Downscale the watermarked canvas** in `processAndUploadImage`. The
  thumbnail path (`:151-224`) already implements stepped downscaling — reuse that shape
  rather than writing a second one; factor it into a local
  `downscaleToCanvas(bitmapOrCanvas, maxEdge)` helper and call it for both the thumbnail
  (300) and the watermarked (`MAX_DISPLAY_EDGE`). Encode watermarked at
  `DISPLAY_JPEG_QUALITY` instead of the current `1.0` (`:228`).
  **Do not touch the `original` upload** — it is the archival copy and the input to
  `regenerateWatermarkedInPlace`.

- [ ] **Step 3: Set `cacheControl` on every upload call site.**
  `original/` and `thumbnail/` → `CACHE_CONTROL_IMMUTABLE`; `watermarked/` →
  `CACHE_CONTROL_MUTABLE`. Leave `regenerateWatermarkedInPlace` (`:333`) at `'60'`
  unless decision §2 selects Phase 2. Avatars, country images, stamps, forum and blog
  images are all timestamped and never overwritten → `CACHE_CONTROL_IMMUTABLE`.

- [ ] **Step 4: Verify by uploading one image through the running app**

```bash
npm run dev
```
Upload a banknote photo, then check the three new objects:

```bash
curl -sS -o /dev/null -D - "<thumbnail url>"  | grep -i 'cache-control\|content-length'
curl -sS -o /dev/null -D - "<watermarked url>" | grep -i 'cache-control\|content-length'
```
Expected: thumbnail `max-age=31536000`; watermarked `max-age=86400` and
`content-length` well under 400 KB for a typical 3000×2000 source.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "perf(images): cap display image at 2000px/q0.85 and cache uploads for a year"
```

---

### Task 7: KeepAlive retention

**Files:**
- Modify: `src/CachedRoutes.tsx` (`:75`)

- [ ] **Step 1:** `max={20}` → `max={6}`, with a comment explaining that every retained
  page keeps its `<img>` elements and decoded bitmaps alive, which is memory pressure on
  mobile. Do **not** change `KEEP_ALIVE_PATTERNS` — which routes are cached is a
  separate product decision.

- [ ] **Step 2: Verify manually** that catalog → banknote → back → another banknote →
  back still restores instantly with scroll position intact.

- [ ] **Step 3: Commit**

```bash
git add src/CachedRoutes.tsx
git commit -m "perf(nav): keep 6 pages alive instead of 20 to cut mobile memory pressure"
```

---

### Task 8: Backfill `cacheControl` on the 7,541 existing objects  ⛔ CUT — do not implement

Deferred on 2026-09-06, reversing this plan's original recommendation. Measurement:
excluding the hours in which this investigation's own load tests ran, the origin served
**177 image requests across 148 distinct objects in 24 h — 1.2 per object per day**, so
the CDN edge is already absorbing nearly all repeat traffic and a longer TTL has little
room to remove the misses where the stall happens. Separately, the mechanism is
unproven: the served header does track the stored `cacheControl` (an object with
`max-age=60` serves `max-age=60`), but a Postgres-only `UPDATE` may not propagate if
storage-api reads the header from S3. Kept below for the record. **Skip this task
entirely.**

- [ ] **Step 1: Probe on exactly ONE object**

Pick a thumbnail, record its current header, update only that row's metadata, wait for
the CDN TTL to lapse (or use a fresh object), and re-check:

```sql
UPDATE storage.objects
   SET metadata = jsonb_set(metadata, '{cacheControl}', '"max-age=31536000"')
 WHERE bucket_id = 'banknote_images'
   AND name = '<one thumbnail path>';
```

```bash
curl -sS -o /dev/null -D - "<that url>" | grep -i cache-control
```

- [ ] **Step 2: If the header did NOT change**

Stop. Storage is not reading the header from that column on this version. Record the
result in the spec, revert the single row, and re-scope this task to "new uploads only".
Do **not** fall back to re-uploading 3.6 GB without a fresh decision.

- [ ] **Step 3: If it DID change — write the migration**

Create `supabase/migrations/<timestamp>_storage_cache_control_backfill.sql` plus its
rollback under `supabase/migrations/rollback/`, matching the existing pair convention
(see `20260819000000_marketplace_legacy_publish_reanchor.sql`). Update
`banknote_images` objects under `*/original/` and `*/thumbnail/` to `max-age=31536000`
and `*/watermarked/` to `max-age=86400`. The rollback restores `max-age=3600`.

> NOTE: this project deploys migrations via the normal deploy flow. Do NOT apply to
> remote from here; the migration file is the deliverable.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations
git commit -m "perf(storage): backfill cacheControl on existing banknote images"
```

---

### Task 9: Verification pass

- [ ] **Step 1: Full gate**

```bash
npm test && npx tsc --noEmit && npm run build
```
Expected: all clean.

- [ ] **Step 2: Retry behavior, DevTools**

Open a catalog country page, add a request-blocking rule for one thumbnail URL, reload.
Expected: two retried requests carrying `?ocr=1` and `?ocr=2` about 0.6 s and 1.8 s
apart, then the placeholder. Never a broken-image icon, never a blank frame that stays
blank.

- [ ] **Step 3: Stall behavior**

Throttle to "Slow 3G" and reload the same page. Expected: images that exceed the 15 s
stall window are retried rather than left hanging.

- [ ] **Step 4: Lazy loading**

With the Network panel filtered to Img, load a catalog country page without scrolling.
Expected: far fewer requests than the number of cards rendered, growing as you scroll.

- [ ] **Step 5: Re-measure the origin failure rate**

Re-run the burst that found the original stall and record the result in the spec:

```bash
# 400 thumbnail URLs, concurrency 50, 20 s ceiling
cat urls.txt | xargs -P 50 -I{} curl -sS -o /dev/null \
  -w "%{http_code} %{time_total}\n" --max-time 20 "{}" | awk '{print $1}' | sort | uniq -c
```

- [ ] **Step 6: Ops follow-up (no code)**

Open a Supabase support ticket, phrased as a question rather than a diagnosis: two
~60s stalls in 24 h serving public objects (60,132 ms `origin_time`, and a 502 after
58,259 ms — quote each `sb_request_id` from 2026-09-06 `edge_logs`). All traffic is
served by `storage-api-canary-lb-eu-central-1-ext` at storage-api v1.71.0 while the
current release is v1.73.0. Ask what that fleet is and why the project sits on that
version. Do **not** assert that it is an early-release channel — see the spec's
"On the word canary".

---

### Out of scope — file separately

- `server.js:20` `CRAWLER_REGEX` matches any user-agent containing `ai` or `gpt`.
- `weekly-sitemap-generation` cron failed 2026-08-31.
- ~89/day `400 NoSuchKey` for `static-pages/catalog-banknote-*.html`.
- Re-encoding the existing oversized objects (26 MB and 11.4 MB files).

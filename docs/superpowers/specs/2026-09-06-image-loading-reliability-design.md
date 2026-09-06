# Image Loading Reliability — Design Spec

**Date:** 2026-09-06
**Status:** Scoped 2026-09-06 — caching/sizing work deferred, see "Decisions taken"

## Problem

Since roughly 2026-08-23, banknote photos on ottocollect.com intermittently fail to
render. Not always, not the same images, and a reload usually fixes it.

### What the investigation ruled out (2026-09-06)

| Hypothesis | How it was checked | Result |
|---|---|---|
| Broken URLs / bad storage rows | Joined every image URL in `collection_items` + `detailed_banknotes` against `storage.objects` | **0 dangling of 6,186** |
| A recent deploy broke it | Prod serves `last-modified: Sat, 04 Jul 2026` | **Prod code has not changed since July 4**, so the Aug 16–18 work is not the cause |
| Cleanup job deleted live images | `image_cleanup_queue`, `cron.job_run_details` | No deletions in the window |
| Data/traffic spike | `storage.objects` by day; `collection_items` by week | 18 objects (3 MB) on Aug 22, nothing else |

### Two GitHub repos — read this before checking "what was deployed"

The working copy's `origin` is `github.com/ohadstorfer/OttoCollect`, but that is **not**
the repo Lovable and Cloud Build use. The live repo is
`github.com/ohadstorfer/ottoman-banknote-archive-hub` (single branch, `main`), and the
Cloud Run service in `cloudbuild.yaml` is likewise named `ottoman-banknote-archive-hub`.

`OttoCollect/main` sits at `2320f463` (2026-07-04) and is stale; the Aug 16–18 marketplace
work is merged on `ottoman-banknote-archive-hub/main`. An earlier draft of this spec read
the stale repo and concluded that work "was never merged" — wrong repo. The conclusion it
supported still holds by a different route: production serves a 2026-07-04 build, so
whatever changed in late August did not come from application code.

### Root cause (infrastructure)

All of this project's Storage traffic (3,772 requests over 24 h, no exceptions) is
served by hosts named `storage-api-canary-lb-eu-central-1-{ext,adm}`, region
`eu-central-1`, running storage-api **v1.71.0**. That fleet intermittently stalls:

- `edge_logs`, 24 h window: a thumbnail `GET` with `response.origin_time = 60,132 ms`
  (real iPhone user), and a storage `GET` returning **502 after 58,259 ms**.
- Local burst test, 400 thumbnail URLs at concurrency 50: **1 request hung and timed
  out at 20 s with 0 bytes** on a cold CDN; **0 failures in 1,200** subsequent warm requests.

Failure rate is ~0.1–0.25 % per request, and only on CDN misses. That is small per
image and large per page.

**On the word "canary" — do not over-read it.** An earlier draft of this spec claimed the
fleet is an early-release channel that receives new builds first. That is **not supported**:
v1.71.0 was published 2026-08-24 and the current release is **v1.73.0** (2026-09-03), so
the project is three minor versions *behind*, not ahead. There is no public Supabase
documentation for this fleet, so what "canary" designates here is unknown.

What is worth reporting is a **date correlation, not a proven cause**: v1.71.0 shipped
2026-08-24 and the symptom was first noticed ~2026-08-23/24, in a window where prod app
code had not changed since 2026-07-04. The v1.71.0 changelog is a single feature
(asymmetric URL signing keys, PR #1257) and touches nothing in the public-object serving
path, so the changelog does not support causation either. Treat this as a question for
Supabase support, not a diagnosis.

### Why it is visible to users

Items 1–3 and 6 are in scope. Items 4–5 are accurate findings that are **not** being
fixed in this round — see "Decisions taken".

The app turns a rare transient stall into a permanent blank:

1. **No retry anywhere.** `BanknoteDetailCard.tsx:411` and `:451` (the catalog card)
   render a bare `<img>` with no `onError`. `LazyImage` and `BanknoteImage` set a
   sticky error state and fall back to `/placeholder.svg` forever. `LazyImage`'s
   `hasError`/`isLoaded` are never reset when the `src` prop changes
   (`LazyImage.tsx:29`, effect deps `[]`).
2. **A stall never fires `error`.** A 60-second hang produces no event at all, so even
   an `onError` handler would not help. We need a stall timeout.
3. **Almost no lazy loading.** Only 4 files use `loading="lazy"`
   (`LazyImage.tsx:102`, `banknote/BanknoteImage.tsx:33`, `Footer.tsx:33`,
   `LatestForumPosts.tsx:96`). The catalog card has none, so every card in the 8
   initially-visible groups (`LazyBanknoteDisplay.tsx:63`, `initialLoadCount: 8`)
   requests its image immediately — and the largest group is 76 items
   (Ottoman Empire, "World War 1. Banknotes (1915-1918)").
4. *(diagnosis only — deferred)* **Payload weight.** 292 collection watermarked images = **194 MB** (avg 665 KB,
   max 11.4 MB; largest object in the bucket is 26 MB). `processAndUploadImage`
   writes the watermarked canvas at **original resolution, JPEG quality 1.0**
   (`imageProcessingService.ts:228`).
5. *(diagnosis only — deferred)* **`cache-control: public, max-age=3600`** on every object
   (`storage.objects.metadata.cacheControl = "max-age=3600"`). Browsers re-download
   everything after an hour, so each user repeatedly re-runs the risky path.
6. **KeepAlive holds up to 20 pages mounted** (`CachedRoutes.tsx:75`, `max={20}`,
   patterns cover every catalog/collection/detail route). All their `<img>` stay in
   the DOM; on mobile this is memory pressure and blanked bitmaps.

## Goals / Non-goals

**Goals**
- A single image renderer that retries on `error` **and on stall**, then degrades to a
  placeholder. One transient failure must never produce a permanently blank image.
- All list and detail images lazy-load and decode off the main thread.
- KeepAlive keeps a sane number of pages.
- All retry/backoff logic lives in pure, node-testable modules (vitest here is
  `environment: 'node'`, `include: ['src/**/*.test.ts']` — **no `.tsx` tests exist or
  are possible without adding jsdom**).

**Non-goals (YAGNI)**
- No new image CDN, no image-transform service, no `<picture>`/AVIF/WebP pipeline.
- No re-processing of the 7,541 existing objects' pixels (a separate, heavy phase).
- No change to the watermark look, position, or per-category settings.
- No virtualization rewrite of the catalog list.
- No fix for the unrelated findings listed under "Deferred".

## Design

### 1. Pure state machine — `src/lib/imageLoadState.ts`

Everything decidable without a DOM goes here, so it is covered by vitest.

```ts
export const IMAGE_MAX_ATTEMPTS = 3;          // initial + 2 retries
export const IMAGE_RETRY_DELAYS_MS = [600, 1800];
export const IMAGE_STALL_MS = 15000;

export type ImageStatus = 'loading' | 'loaded' | 'failed';
export interface ImageLoadState { src: string; attempt: number; status: ImageStatus }
export type ImageLoadAction =
  | { type: 'src-changed'; src: string }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'stalled' };

export function initImageLoadState(src: string): ImageLoadState;
export function imageLoadReducer(s: ImageLoadState, a: ImageLoadAction): ImageLoadState;
export function retryDelayMs(attempt: number): number;   // clamps to last entry
export function isRetryable(src: string): boolean;       // false for '', data:, blob:, and same-origin relative paths
export function withRetryToken(src: string, attempt: number): string;
```

`withRetryToken` rules (all covered by tests):

- `attempt === 0` → returns `src` unchanged.
- Otherwise appends/**replaces** an `ocr` query param: `?ocr=1`, then `?ocr=2` — it must
  never stack (`?ocr=1&ocr=2`).
- Preserves any pre-existing query string and hash.
- Returns `src` untouched when `isRetryable(src)` is false — we never cache-bust
  `/placeholder.svg` or a `data:` URI.

Why a query token is required: after an `<img>` errors, re-assigning the identical
`src` may not issue a new request (browser negative caching). A distinct URL forces it.
**Verified 2026-09-06:** the Supabase Smart CDN ignores the query string
(`?cb=…` returned `cf-cache-status: HIT`), so a retry costs no extra origin traffic
when the object is already at the edge. The plan re-verifies this before relying on it.

`imageLoadReducer` transitions:

| state.status | action | next |
|---|---|---|
| any | `src-changed` (different src) | `{ src, attempt: 0, status: 'loading' }` |
| any | `src-changed` (same src) | unchanged (no render loop) |
| `loading` | `loaded` | `{ status: 'loaded' }` |
| `loading` | `error` / `stalled`, `attempt + 1 < IMAGE_MAX_ATTEMPTS` | `{ attempt: attempt + 1, status: 'loading' }` |
| `loading` | `error` / `stalled`, no attempts left | `{ status: 'failed' }` |
| `loaded` / `failed` | `error` / `stalled` / `loaded` | unchanged |

### 2. Renderer — `src/components/shared/ResilientImage.tsx`

The only place in the app that mounts an `<img>` for remote content. A thin shell over
the reducer; it owns exactly two DOM concerns — the stall timer and the
`img.complete` race.

```tsx
interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;      // default '/placeholder.svg'
  eager?: boolean;           // default false → loading="lazy"
  priority?: boolean;        // default false → fetchpriority="high" when true
  stallMs?: number;          // default IMAGE_STALL_MS
  onLoad?: () => void;
  onError?: () => void;      // fires once, only after the final attempt fails
}
```

Behavior:

- `useReducer(imageLoadReducer, src, initImageLoadState)`.
- `key={state.attempt}` on the `<img>` so a retry remounts the element rather than
  relying on `src` mutation.
- `src={withRetryToken(state.src, state.attempt)}`; on `status === 'failed'`, renders
  `fallbackSrc` with no token and no further timers.
- `loading={eager ? 'eager' : 'lazy'}`, `decoding="async"`,
  `fetchpriority={priority ? 'high' : 'auto'}`.
- Stall timer: on entering `loading` **and being in view**, `setTimeout(stallMs)` →
  dispatch `stalled`. Cleared on `load`/`error`/unmount. A ref callback checks
  `img.complete` on mount to cover an image that finished before React attached the
  handler (cache hit).
- **Viewport gate (found during implementation).** The timer must not start at mount:
  with `loading="lazy"` the browser does not request a below-the-fold image until it
  nears the viewport, so a mount-time timer would "stall" images that were never
  requested and blank them after 3 attempts. An `IntersectionObserver`
  (`rootMargin: 300px`) gates the timer; `eager`/`priority` images skip the gate.
- `IMAGE_STALL_MS` is 15s, not 8s: an `<img>` gives no way to distinguish a zero-byte
  hang from a slow-but-progressing download, so the threshold sits above a legitimate
  slow load (~13s for a 665 KB image on slow 3G) and well below the observed 60s hang.
- Retry delay: the `error` **dispatch** is deferred by `retryDelayMs(attempt)` rather
  than gating the render. Same backoff, but the failed `<img>` stays mounted during the
  wait, so there is no flash of an empty box. The final failure dispatches immediately —
  there is nothing left to back off from. (Refined during implementation; the earlier
  render-gating sketch would have flashed.)
- Never throws, never logs per-image noise.

### 3. Adoption

Three shared components are rewritten to delegate, which covers most call sites at once:

- `src/components/banknote/BanknoteImage.tsx` → `ResilientImage`. Consumers:
  `CollectionItemCard`, `CollectionCardUnlisted`, `BanknoteImageGallery`,
  `BanknoteDetailCard*`, `BanknoteCatalogDetail`, `BanknoteCollectionDetail*`,
  `BanknoteDetail`, `BanknoteFixed`, `BanknoteEditDialog`.
- `src/components/shared/LazyImage.tsx` → keeps its `IntersectionObserver` gate,
  renders `ResilientImage` inside, and **fixes the sticky-state bug** (reset on `src`
  change). Consumers: `CollectionCard`, `BanknoteCard`, `MarketplaceItem`.
- `src/components/ui/OptimizedImage.tsx` → `ResilientImage`. Consumers: `Navbar`, `Index`.

`src/components/use-banknote-image.tsx` is **dead code** (0 importers) and is deleted.

Remaining raw `<img>` on hot paths are replaced individually — see the plan's Task 4.
Admin upload previews, the forum/blog editors, and `TestImageTransform.tsx` keep their
raw `<img>`: they render local `blob:`/`data:` URLs where retry is meaningless.

### 4. Upload changes — `src/services/imageProcessingService.ts`  ⚠️ DEFERRED (see "Decisions taken" §1–§2)

> Kept for the record. Do not implement in this round.

```ts
export const MAX_DISPLAY_EDGE = 2000;        // px, long edge of the watermarked file
export const DISPLAY_JPEG_QUALITY = 0.85;
export const CACHE_CONTROL_IMMUTABLE = '31536000';  // 1 year
export const CACHE_CONTROL_MUTABLE = '86400';       // 1 day
```

- `processAndUploadImage` downscales the watermarked canvas to `MAX_DISPLAY_EDGE` on
  its long edge (never upscales) and encodes at `DISPLAY_JPEG_QUALITY`. Expected effect
  on a typical 3000×2000 upload: ~2.0 MB → ~250 KB.
- The **original** keeps full resolution and is uploaded untouched — it is the archival
  copy and the input to watermark re-renders.
- `cacheControl`:
  - `original/` and `thumbnail/` → `CACHE_CONTROL_IMMUTABLE`. Paths are
    `${userId}_${Date.now()}.${ext}` and are never overwritten.
  - `watermarked/` → `CACHE_CONTROL_MUTABLE`. It **is** overwritten in place by
    `regenerateWatermarkedInPlace` (`imageProcessingService.ts:333`, currently
    `cacheControl: '60'`), so a one-year TTL would strand stale watermarks in browser
    caches. 1 day is 1,440× better than 60 s and keeps admin feedback same-day.
    Making `watermarked/` immutable too would be a further phase — see "Decisions taken".
- Same `cacheControl` treatment for `banknoteService.ts:278`, `countryService.ts:567`,
  `profileService.ts:262`, `stampsService.ts:104` (all currently `'3600'`), and for
  `forumService.ts:944`, `blogService.ts:939`, `BanknoteEditDialog.tsx:482` (currently
  no option at all → default 3600).

### 5. Backfill for the 7,541 existing objects  ⚠️ DEFERRED (see "Decisions taken" §3)

> Kept for the record. Do not implement in this round.

`storage.objects.metadata` is a jsonb column that already holds
`"cacheControl": "max-age=3600"`, and storage-api serves the header from it. So the
backfill is a metadata `UPDATE`, not a re-upload of 3.6 GB.

**This must be proven on one object before being run in bulk**, and it touches the live
project. It was cut on 2026-09-06 (see "Decisions taken" §3). If ever revisited and the probe shows
the header does not change, the fallback is "new uploads only", and the item is
re-scoped rather than forced.

### 6. KeepAlive

`src/CachedRoutes.tsx:75`, `max={20}` → `max={6}`. Six covers the realistic
list → detail → back → another detail loop while cutting retained DOM and decoded
bitmaps by ~70 %.

## Decisions taken (Ohad, 2026-09-06) — all caching/sizing work is deferred

**Scope is now Tasks 1–5, 7, 9 only.** Tasks 6 and 8 are cut from this round.

1. **Image size cap (`MAX_DISPLAY_EDGE` / quality)** — **deferred.** Not now.
2. **Watermarked TTL (`60` → `86400`)** — **deferred.** The case that it improves
   loading was not made.
3. **Metadata backfill of `cacheControl` on prod** — **deferred**, after re-examination
   this reverses the spec's original recommendation. Two independent reasons:

   - **It would barely reduce the stalls.** The stall only occurs on a CDN miss. Over a
     24 h window, excluding the hours in which the investigation's own load tests ran
     (06, 21, 22 UTC), the origin saw **177 image requests across 148 distinct objects
     — 1.2 fetches per object per day**. The Cloudflare edge is already absorbing
     essentially all repeat traffic *despite* `max-age=3600`, so raising the TTL has
     little headroom to remove misses. (The 2.83/object figure measured earlier was an
     artifact of the load tests themselves.)
   - **The mechanism is unproven.** Confirmed that the served header does track the
     stored value — an object whose `metadata.cacheControl` is `max-age=60` serves
     `cache-control: public, max-age=60`. But that does not establish that a
     *Postgres-only* `UPDATE` propagates: storage-api may serve the header from the S3
     object's own `CacheControl`, with the `storage.objects.metadata` column being a
     mirror written at upload time. If so, the UPDATE changes nothing and leaves the
     mirror desynced from what is actually served — worse than not touching it.

   What the backfill *would* genuinely buy is less re-downloading by returning visitors
   (browser cache) — a bandwidth and perceived-speed win, not a fix for blank photos.
   Revisit it as a performance item, with its own measurement, after the retry work ships.

4. **Re-encoding the existing oversized files** (the 26 MB and 11 MB objects) was never
   in this spec. Worth a separate admin batch job later.

The remaining scope touches no production data and no Supabase project state.

## Deferred — real, unrelated, found during the investigation

- `server.js:20` `CRAWLER_REGEX` contains bare `ai` and `gpt` alternatives with no word
  boundary, so any user-agent containing "ai" is served bot HTML.
- `weekly-sitemap-generation` (cron job 3) failed on 2026-08-31.
- ~89 storage `400 / NoSuchKey` per day for `static-pages/catalog-banknote-*.html`
  files that were never generated.
- Supabase support ticket — phrased as a question, not a demand: two ~60s stalls in 24 h
  serving public objects (60,132 ms, and a 502 after 58,259 ms; quote the `sb_request_id`
  of each). All traffic is on `storage-api-canary-lb-eu-central-1-ext` at v1.71.0 while
  the current release is v1.73.0. Ask what that fleet is and why the project is pinned to
  that version.

## Success criteria

- `npm test` green, including the new `src/lib/imageLoadState.test.ts`.
- `npx tsc --noEmit` and `npm run build` clean.
- DevTools: blocking one image URL shows 2 retries then the placeholder — never a
  broken-image icon, never a permanently blank frame.
- Catalog country page issues image requests progressively on scroll rather than all at
  once (Network panel).

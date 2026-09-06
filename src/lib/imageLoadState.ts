/**
 * Retry/stall state machine for remote <img> loading.
 *
 * Why this exists: Supabase Storage occasionally stalls on a CDN miss (observed
 * up to 60s, see docs/superpowers/specs/2026-09-06-image-loading-reliability-design.md).
 * A stalled image never fires `error`, so an onError handler alone is not enough —
 * we also need a timeout. And because nothing in the app retried, a single transient
 * failure left the photo permanently blank until a full page reload.
 *
 * All decidable logic lives here, DOM-free, so it is covered by vitest
 * (the suite runs `environment: 'node'` and only picks up `*.test.ts`).
 */

/** Initial load + 2 retries. */
export const IMAGE_MAX_ATTEMPTS = 3;

/** Backoff before retry N. Index = the attempt that just failed. */
export const IMAGE_RETRY_DELAYS_MS = [600, 1800];

/**
 * An image that has not loaded within this long *after entering the viewport* is
 * treated as failed.
 *
 * The pathology we are catching hangs for ~60s having received zero bytes, and an
 * <img> gives us no way to tell that apart from a slow-but-progressing download.
 * So the threshold is set well above a legitimate slow load (a ~665 KB watermarked
 * image over slow 3G is ~13s) and well below the observed hang. Too low and we
 * would abort images that were about to arrive.
 */
export const IMAGE_STALL_MS = 15000;

/** Query parameter used to force a fresh request on retry. */
export const RETRY_PARAM = 'ocr';

export type ImageStatus = 'loading' | 'loaded' | 'failed';

export interface ImageLoadState {
  src: string;
  /** 0 = first try. Also drives the retry token and the <img> remount key. */
  attempt: number;
  status: ImageStatus;
}

export type ImageLoadAction =
  | { type: 'src-changed'; src: string }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'stalled' };

export function initImageLoadState(src: string): ImageLoadState {
  return { src, attempt: 0, status: 'loading' };
}

/**
 * True when appending a cache-busting token to `src` is both safe and useful.
 *
 * Local assets (`/placeholder.svg`) and in-memory sources (`data:`, `blob:`) are
 * excluded: they cannot suffer a CDN stall, and rewriting a `data:` URI would
 * corrupt it.
 */
export function isRetryable(src: string): boolean {
  if (!src) return false;
  return /^https?:\/\//i.test(src);
}

/**
 * Returns `src` for the given attempt.
 *
 * Attempt 0 is the untouched URL. Later attempts carry `?ocr=<attempt>`, because
 * re-assigning an identical `src` after an error may not issue a new request at
 * all (browser negative caching). The token replaces itself rather than stacking,
 * and any pre-existing query string and hash are preserved.
 */
export function withRetryToken(src: string, attempt: number): string {
  if (attempt <= 0 || !isRetryable(src)) return src;
  try {
    const url = new URL(src);
    url.searchParams.set(RETRY_PARAM, String(attempt));
    return url.toString();
  } catch {
    // Not a parseable absolute URL after all — leave it alone rather than guess.
    return src;
  }
}

/** Backoff after the given attempt failed. Clamps past the end of the table. */
export function retryDelayMs(attempt: number): number {
  const i = Math.min(Math.max(attempt, 0), IMAGE_RETRY_DELAYS_MS.length - 1);
  return IMAGE_RETRY_DELAYS_MS[i];
}

/** True when `attempt` still has a retry left after it. */
export function hasAttemptsLeft(attempt: number): boolean {
  return attempt + 1 < IMAGE_MAX_ATTEMPTS;
}

export function imageLoadReducer(
  state: ImageLoadState,
  action: ImageLoadAction
): ImageLoadState {
  switch (action.type) {
    case 'src-changed':
      // Same src → same object reference, so a re-render can't loop.
      if (action.src === state.src) return state;
      return initImageLoadState(action.src);

    case 'loaded':
      if (state.status !== 'loading') return state;
      return { ...state, status: 'loaded' };

    case 'error':
    case 'stalled':
      if (state.status !== 'loading') return state;
      if (hasAttemptsLeft(state.attempt)) {
        return { ...state, attempt: state.attempt + 1 };
      }
      return { ...state, status: 'failed' };

    default:
      return state;
  }
}

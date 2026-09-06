import { describe, it, expect } from 'vitest';
import {
  IMAGE_MAX_ATTEMPTS,
  imageLoadReducer,
  initImageLoadState,
  isRetryable,
  retryDelayMs,
  withRetryToken,
  type ImageLoadState,
} from './imageLoadState';

const REMOTE =
  'https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote_images/banknotes/thumbnail/a_1.jpg';

describe('isRetryable', () => {
  it('accepts remote http(s) URLs', () => {
    expect(isRetryable(REMOTE)).toBe(true);
    expect(isRetryable('http://example.com/a.jpg')).toBe(true);
  });

  it('rejects empty, data:, blob: and local paths', () => {
    expect(isRetryable('')).toBe(false);
    expect(isRetryable('data:image/png;base64,AAA')).toBe(false);
    expect(isRetryable('blob:http://localhost/abc')).toBe(false);
    expect(isRetryable('/placeholder.svg')).toBe(false);
  });
});

describe('withRetryToken', () => {
  it('returns the src untouched on attempt 0', () => {
    expect(withRetryToken(REMOTE, 0)).toBe(REMOTE);
  });

  it('appends the retry token on attempt 1', () => {
    expect(withRetryToken(REMOTE, 1)).toBe(`${REMOTE}?ocr=1`);
  });

  it('replaces the token instead of stacking it', () => {
    const once = withRetryToken(REMOTE, 1);
    const twice = withRetryToken(once, 2);
    expect(twice).toBe(`${REMOTE}?ocr=2`);
    expect(twice).not.toContain('ocr=1');
  });

  it('preserves an existing query string', () => {
    expect(withRetryToken(`${REMOTE}?foo=bar`, 1)).toBe(`${REMOTE}?foo=bar&ocr=1`);
  });

  it('preserves the hash and keeps it last', () => {
    expect(withRetryToken(`${REMOTE}#frag`, 1)).toBe(`${REMOTE}?ocr=1#frag`);
  });

  it('leaves non-retryable sources alone at every attempt', () => {
    for (const src of ['', 'data:image/png;base64,AAA', 'blob:http://x/y', '/placeholder.svg']) {
      expect(withRetryToken(src, 1)).toBe(src);
      expect(withRetryToken(src, 2)).toBe(src);
    }
  });
});

describe('retryDelayMs', () => {
  it('returns the configured backoff', () => {
    expect(retryDelayMs(0)).toBe(600);
    expect(retryDelayMs(1)).toBe(1800);
  });

  it('clamps past the end of the table instead of returning undefined', () => {
    expect(retryDelayMs(5)).toBe(1800);
    expect(retryDelayMs(-1)).toBe(600);
  });
});

describe('imageLoadReducer', () => {
  const loading = (over: Partial<ImageLoadState> = {}): ImageLoadState => ({
    src: REMOTE,
    attempt: 0,
    status: 'loading',
    ...over,
  });

  it('initImageLoadState starts on attempt 0, loading', () => {
    expect(initImageLoadState(REMOTE)).toEqual({ src: REMOTE, attempt: 0, status: 'loading' });
  });

  it('resets to attempt 0 when the src changes', () => {
    const s = loading({ attempt: 2, status: 'failed' });
    expect(imageLoadReducer(s, { type: 'src-changed', src: 'https://x/y.jpg' })).toEqual({
      src: 'https://x/y.jpg',
      attempt: 0,
      status: 'loading',
    });
  });

  it('returns the same reference when the src is unchanged', () => {
    const s = loading({ attempt: 1 });
    expect(imageLoadReducer(s, { type: 'src-changed', src: REMOTE })).toBe(s);
  });

  it('marks loaded from loading', () => {
    expect(imageLoadReducer(loading(), { type: 'loaded' }).status).toBe('loaded');
  });

  it('increments the attempt on error while retries remain', () => {
    const first = imageLoadReducer(loading(), { type: 'error' });
    expect(first).toMatchObject({ attempt: 1, status: 'loading' });
    const second = imageLoadReducer(first, { type: 'error' });
    expect(second).toMatchObject({ attempt: 2, status: 'loading' });
  });

  it('treats a stall exactly like an error', () => {
    expect(imageLoadReducer(loading(), { type: 'stalled' })).toMatchObject({
      attempt: 1,
      status: 'loading',
    });
  });

  it('fails after the last attempt', () => {
    const last = loading({ attempt: IMAGE_MAX_ATTEMPTS - 1 });
    expect(imageLoadReducer(last, { type: 'error' })).toMatchObject({
      attempt: IMAGE_MAX_ATTEMPTS - 1,
      status: 'failed',
    });
  });

  it('ignores further events once loaded or failed', () => {
    const done = loading({ status: 'loaded' });
    expect(imageLoadReducer(done, { type: 'error' })).toBe(done);
    const dead = loading({ status: 'failed', attempt: 2 });
    expect(imageLoadReducer(dead, { type: 'error' })).toBe(dead);
    expect(imageLoadReducer(dead, { type: 'stalled' })).toBe(dead);
    expect(imageLoadReducer(dead, { type: 'loaded' })).toBe(dead);
  });
});

import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  IMAGE_STALL_MS,
  hasAttemptsLeft,
  imageLoadReducer,
  initImageLoadState,
  retryDelayMs,
  withRetryToken,
} from '@/lib/imageLoadState';

/**
 * The one <img> renderer for remote images.
 *
 * Supabase Storage occasionally stalls on a CDN miss (measured up to 60s), and a
 * stalled image never fires `error` — so this component watches for BOTH an error
 * and a stall, retries with backoff, and only then degrades to the placeholder.
 * Before this existed, one transient failure left a photo blank until a full reload.
 *
 * All decision logic is in `@/lib/imageLoadState` (unit-tested); this file owns
 * only the two DOM concerns: the stall timer and the `img.complete` race.
 */
export interface ResilientImageProps
  extends Omit<
    React.ImgHTMLAttributes<HTMLImageElement>,
    'src' | 'alt' | 'onLoad' | 'onError' | 'loading'
  > {
  src: string;
  alt: string;
  /** Shown once every attempt has failed. */
  fallbackSrc?: string;
  /** Opt out of lazy loading (above-the-fold / hero images). */
  eager?: boolean;
  /** Hints the browser to fetch this one first. Implies `eager`. */
  priority?: boolean;
  stallMs?: number;
  onLoad?: () => void;
  /** Fires once, only after the final attempt fails. */
  onError?: () => void;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  fallbackSrc = '/placeholder.svg',
  eager = false,
  priority = false,
  stallMs = IMAGE_STALL_MS,
  onLoad,
  onError,
  ...imgProps
}) => {
  const [state, dispatch] = useReducer(imageLoadReducer, src, initImageLoadState);

  // Keep the machine in sync with the prop. A same-src update returns the same
  // state reference inside the reducer, so this cannot loop.
  useEffect(() => {
    dispatch({ type: 'src-changed', src });
  }, [src]);

  const isLoading = state.status === 'loading';
  const hasFailed = state.status === 'failed';

  const retryTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(retryTimer.current), []);

  const handleLoad = useCallback(() => {
    clearTimeout(retryTimer.current);
    dispatch({ type: 'loaded' });
    onLoad?.();
  }, [onLoad]);

  // Back off between a failure and the next request instead of hammering an
  // origin that is already struggling. The final failure is reported immediately.
  const handleError = useCallback(() => {
    clearTimeout(retryTimer.current);
    const delay = hasAttemptsLeft(state.attempt) ? retryDelayMs(state.attempt) : 0;
    retryTimer.current = setTimeout(() => dispatch({ type: 'error' }), delay);
  }, [state.attempt]);

  const imgRef = useRef<HTMLImageElement | null>(null);

  // The stall timer must not start before the browser actually requests the image.
  // With loading="lazy" a below-the-fold <img> is not fetched until it nears the
  // viewport, so a timer started at mount would "stall" an image that was never
  // even asked for. Gate on visibility instead.
  const [isInView, setIsInView] = useState(eager || priority);

  useEffect(() => {
    if (isInView) return;
    const el = imgRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsInView(true);
      },
      // Wider than the viewport so we line up with the browser's own lazy
      // threshold rather than starting the clock after it began fetching.
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isInView, state.attempt]);

  // The only thing that catches a stall: no `error` event is ever fired for one.
  useEffect(() => {
    if (!isLoading || !isInView) return;
    const timer = setTimeout(() => dispatch({ type: 'stalled' }), stallMs);
    return () => clearTimeout(timer);
  }, [isLoading, isInView, state.attempt, state.src, stallMs]);

  // An image served from cache can finish before React attaches onLoad, in which
  // case no event ever arrives and we would stall-timeout on a working image.
  // Read handlers through a ref so this callback stays stable and the <img> is
  // not detached/reattached on every attempt.
  const handlers = useRef({ handleLoad, handleError });
  handlers.current = { handleLoad, handleError };

  const attachImg = useCallback((el: HTMLImageElement | null) => {
    imgRef.current = el;
    if (!el || !el.complete) return;
    if (el.naturalWidth > 0) handlers.current.handleLoad();
    else handlers.current.handleError();
  }, []);

  const failureReported = useRef<string | null>(null);
  useEffect(() => {
    if (!hasFailed) return;
    if (failureReported.current === state.src) return;
    failureReported.current = state.src;
    onError?.();
  }, [hasFailed, state.src, onError]);

  const displaySrc = hasFailed ? fallbackSrc : withRetryToken(state.src, state.attempt);

  return (
    <img
      {...imgProps}
      // Remounts the element on each attempt so the browser issues a fresh request.
      key={hasFailed ? 'fallback' : state.attempt}
      ref={hasFailed ? undefined : attachImg}
      src={displaySrc}
      alt={alt}
      loading={eager || priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
      onLoad={hasFailed ? undefined : handleLoad}
      onError={hasFailed ? undefined : handleError}
    />
  );
};

export default ResilientImage;

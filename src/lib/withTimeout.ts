/**
 * Resolve `fallback` if `promise` does not settle within `ms`. Never rejects:
 * a rejection from `promise` also resolves to `fallback`. Used so a slow/stalled
 * translation call can't hang a background task indefinitely.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const done = (value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => done(fallback), ms);
    promise.then((v) => done(v), () => done(fallback));
  });
}

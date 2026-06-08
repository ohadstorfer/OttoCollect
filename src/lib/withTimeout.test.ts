import { describe, it, expect, vi } from 'vitest';
import { withTimeout } from './withTimeout';

describe('withTimeout', () => {
  it('resolves the real value when the promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve('OK'), 1000, 'FB')).resolves.toBe('OK');
  });

  it('resolves the fallback when the promise stalls past ms', async () => {
    vi.useFakeTimers();
    const p = withTimeout(new Promise<string>(() => {}), 1000, 'FB');
    vi.advanceTimersByTime(1000);
    await expect(p).resolves.toBe('FB');
    vi.useRealTimers();
  });

  it('resolves the fallback when the promise rejects', async () => {
    await expect(withTimeout(Promise.reject(new Error('x')), 1000, 'FB')).resolves.toBe('FB');
  });
});

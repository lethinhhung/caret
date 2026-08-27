/**
 * Fixed-window rate limiting, keyed by caller.
 *
 * Pure and in-memory: nothing here knows about HTTP or Next. State lives in
 * the process, so on a multi-instance deployment each instance keeps its own
 * counts — a soft ceiling, not a guarantee. Swap the store for a shared one
 * when that matters.
 */

export interface RateLimitRule {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Requests allowed per key within one window. */
  max: number;
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

interface Window {
  startedAt: number;
  count: number;
}

export interface RateLimiter {
  /** Records one hit for `key` and says whether it is allowed. */
  hit(key: string): RateLimitResult;
  /** Forgets everything. For tests. */
  reset(): void;
}

export function createRateLimiter(
  rules: RateLimitRule[],
  now: () => number = Date.now,
): RateLimiter {
  // One map per rule so windows of different lengths never share a counter.
  const stores = rules.map(() => new Map<string, Window>());
  const longest = Math.max(...rules.map((rule) => rule.windowMs));

  function prune(at: number) {
    rules.forEach((rule, i) => {
      for (const [key, window] of stores[i]) {
        if (at - window.startedAt >= rule.windowMs) stores[i].delete(key);
      }
    });
  }

  let lastPrune = 0;

  return {
    hit(key) {
      const at = now();
      // Sweep stale keys occasionally so idle callers do not pile up forever.
      if (at - lastPrune >= longest) {
        prune(at);
        lastPrune = at;
      }

      // Check every rule before counting, so a blocked request does not
      // consume budget from the rules it would have passed.
      let retryAfterMs = 0;
      const windows = rules.map((rule, i) => {
        const existing = stores[i].get(key);
        const window =
          existing && at - existing.startedAt < rule.windowMs
            ? existing
            : { startedAt: at, count: 0 };
        if (window.count >= rule.max) {
          retryAfterMs = Math.max(retryAfterMs, rule.windowMs - (at - window.startedAt));
        }
        return window;
      });

      if (retryAfterMs > 0) {
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
      }

      windows.forEach((window, i) => {
        window.count += 1;
        stores[i].set(key, window);
      });
      return { ok: true };
    },
    reset() {
      stores.forEach((store) => store.clear());
      lastPrune = 0;
    },
  };
}

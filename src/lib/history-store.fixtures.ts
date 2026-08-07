import { afterEach, beforeEach, vi } from "vitest";

type Store = typeof import("./history-store");

/**
 * Gives each test its own copy of the store.
 *
 * The store is module state, so one shared instance would carry a test's
 * entries into the next. The returned function mounts it the way
 * `useSyncExternalStore` does — which is what makes it read storage — and
 * hands it back, so a test can arrange the device before mounting.
 */
export function historyHarness(): () => Store {
  let store: Store;
  let unsubscribe: (() => void) | null = null;

  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    store = await import("./history-store");
  });

  afterEach(() => {
    unsubscribe?.();
    unsubscribe = null;
  });

  return () => {
    unsubscribe = store.subscribe(() => {});
    return store;
  };
}

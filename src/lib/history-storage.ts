import { parse, serialize, type HistoryEntry } from "./history";

/**
 * The one module that touches `localStorage`.
 *
 * Every access is wrapped, and every failure reads as "history is off" — which
 * is also the default. A device that refuses storage loses the feature; it
 * never loses the page.
 */

const ENABLED_KEY = "history-enabled";
const ENTRIES_KEY = "history";

export function readEnabled(): boolean {
  try {
    return storage()?.getItem(ENABLED_KEY) === "true";
  } catch {
    return false;
  }
}

export function readEntries(): HistoryEntry[] {
  try {
    return parse(storage()?.getItem(ENTRIES_KEY) ?? null);
  } catch {
    return [];
  }
}

/** Persists the switch, reporting whether the write actually landed. */
export function writeEnabled(enabled: boolean): boolean {
  try {
    const store = storage();
    if (!store) return false;
    store.setItem(ENABLED_KEY, String(enabled));
    return true;
  } catch {
    return false;
  }
}

export function removeEntries(): void {
  try {
    storage()?.removeItem(ENTRIES_KEY);
  } catch {
    // Nothing to undo — there was nothing readable there either.
  }
}

/**
 * Persists `entries` and returns what actually landed, or null if nothing did.
 *
 * A full quota sheds the older half and retries once. Losing the oldest checks
 * beats a store that silently stops accepting anything from here on.
 */
export function writeEntries(entries: HistoryEntry[]): HistoryEntry[] | null {
  const store = storage();
  if (!store) return null;

  try {
    store.setItem(ENTRIES_KEY, serialize(entries));
    return entries;
  } catch {
    const trimmed = entries.slice(0, Math.ceil(entries.length / 2));
    try {
      store.setItem(ENTRIES_KEY, serialize(trimmed));
      return trimmed;
    } catch {
      return null;
    }
  }
}

function storage(): Storage | null {
  // Blocked storage can throw from the getter itself, not just from a read.
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

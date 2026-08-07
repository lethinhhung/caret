import { add, type HistoryEntry } from "./history";
import {
  readEnabled,
  readEntries,
  removeEntries,
  writeEnabled,
  writeEntries,
} from "./history-storage";

/**
 * History as a subscribable snapshot.
 *
 * A module-level store rather than React state, because history is read from
 * the header and written from the results card and neither of those owns it.
 * The snapshot is a cached object so `useSyncExternalStore` can compare it by
 * reference; handing back a fresh one each read would loop forever.
 */

export interface History {
  enabled: boolean;
  entries: HistoryEntry[];
}

const EMPTY: History = { enabled: false, entries: [] };

let snapshot: History = EMPTY;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  // Storage is read on first subscribe — after hydration, never during render.
  if (listeners.size === 0) {
    load();
    window.addEventListener("storage", load);
  }
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", load);
  };
}

export function getSnapshot(): History {
  return snapshot;
}

/** Empty on the server: no render may depend on what is on the device. */
export function getServerSnapshot(): History {
  return EMPTY;
}

/** Turning history off deletes what was stored. See specs/core.md §5. */
export function setEnabled(enabled: boolean): void {
  // Storage that will not keep the flag cannot keep the checks either, so the
  // feature stays off rather than looking on and quietly storing nothing.
  if (!writeEnabled(enabled)) return publish(EMPTY);

  if (!enabled) {
    removeEntries();
    return publish(EMPTY);
  }
  publish({ enabled: true, entries: readEntries() });
}

/** Stores a completed check, returning its id — or null when history is off. */
export function record(
  check: Omit<HistoryEntry, "id" | "createdAt">,
): string | null {
  if (!snapshot.enabled) return null;

  const entry: HistoryEntry = { ...check, id: newId(), createdAt: Date.now() };
  save(add(snapshot.entries, entry));
  return entry.id;
}

/** Keeps a stored check current as the writer applies and reverts its fixes. */
export function updateAccepted(id: string, accepted: string[]): void {
  if (!snapshot.entries.some((entry) => entry.id === id)) return;

  save(
    snapshot.entries.map((entry) =>
      entry.id === id ? { ...entry, accepted } : entry,
    ),
  );
}

export function remove(id: string): void {
  save(snapshot.entries.filter((entry) => entry.id !== id));
}

export function clear(): void {
  save([]);
}

/** Persists `entries` and publishes whatever storage was willing to keep. */
function save(entries: HistoryEntry[]): void {
  publish({ ...snapshot, entries: writeEntries(entries) ?? snapshot.entries });
}

function publish(next: History): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

function load(): void {
  const enabled = readEnabled();
  publish({ enabled, entries: enabled ? readEntries() : [] });
}

function newId(): string {
  // `randomUUID` needs a secure context, which a LAN address is not.
  const fallback = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return globalThis.crypto?.randomUUID?.() ?? fallback;
}

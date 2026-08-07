import type { HistoryEntry } from "./history";
import type { GrammarError } from "./types";

export const WENT: GrammarError = {
  original: "went",
  suggestion: "gone",
  category: "grammar",
  explanation: "Use the past participle after 'have'.",
  start: 7,
  end: 11,
};

let counter = 0;

/** A sound entry, with just enough varied by default to keep ids unique. */
export function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  counter += 1;
  return {
    id: `entry-${counter}`,
    createdAt: 1_700_000_000_000 + counter,
    content: `I have went there ${counter}.`,
    errors: [WENT],
    accepted: ["7-11-gone"],
    ...overrides,
  };
}

/** What `record` is handed: an entry minus the parts the store fills in. */
export function check(
  content = "I have went there.",
): Omit<HistoryEntry, "id" | "createdAt"> {
  return { content, errors: [WENT], accepted: ["7-11-gone"] };
}

/** The raw string a stored history file would hold. */
export function file(entries: HistoryEntry[], version = 1): string {
  return JSON.stringify({ version, entries });
}

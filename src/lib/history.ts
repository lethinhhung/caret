import { isErrorCategory, type GrammarError } from "./types";

/**
 * The shape of browser-local history and the pure operations on it.
 *
 * Nothing here touches `localStorage` — that is `history-store.ts`'s job. This
 * module only knows how a history file is written, read back, and grown.
 */

export interface HistoryEntry {
  id: string;
  /** Epoch milliseconds; orders the list and dates each row in the panel. */
  createdAt: number;
  /** The text exactly as it was checked. `errors` index into it. */
  content: string;
  context?: string;
  errors: GrammarError[];
  /** `errorId`s of the fixes still applied. A missing one is a disagreement. */
  accepted: string[];
  /** Alternative phrasings, only present when the check found nothing. */
  improvements?: string[];
}

/** Newest first; anything past this falls off the end. */
export const MAX_ENTRIES = 50;

/** Bumped when the stored shape changes. An unknown version reads as empty. */
const VERSION = 1;

interface HistoryFile {
  version: number;
  entries: HistoryEntry[];
}

/**
 * Reads a stored history file.
 *
 * Anything unreadable — absent, not JSON, a version we do not know — is empty
 * rather than an error, and a file that has picked up a malformed entry keeps
 * the entries that are still sound. History is a convenience; it never gets to
 * take the app down with it.
 */
export function parse(raw: string | null): HistoryEntry[] {
  if (!raw) return [];

  let file: unknown;
  try {
    file = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!isRecord(file) || file.version !== VERSION) return [];
  if (!Array.isArray(file.entries)) return [];

  return file.entries.filter(isEntry).slice(0, MAX_ENTRIES);
}

export function serialize(entries: HistoryEntry[]): string {
  return JSON.stringify({ version: VERSION, entries } satisfies HistoryFile);
}

/**
 * Puts `entry` at the front, capped at `MAX_ENTRIES`.
 *
 * An earlier check of the same text and context is dropped rather than kept
 * alongside: re-checking something you already ran is a second look at one
 * piece of writing, not a second piece.
 */
export function add(
  entries: HistoryEntry[],
  entry: HistoryEntry,
): HistoryEntry[] {
  const others = entries.filter(
    (existing) =>
      existing.content !== entry.content ||
      (existing.context ?? "") !== (entry.context ?? ""),
  );
  return [entry, ...others].slice(0, MAX_ENTRIES);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isError(value: unknown): value is GrammarError {
  return (
    isRecord(value) &&
    typeof value.original === "string" &&
    typeof value.suggestion === "string" &&
    isErrorCategory(value.category) &&
    typeof value.explanation === "string" &&
    typeof value.start === "number" &&
    typeof value.end === "number"
  );
}

function isEntry(value: unknown): value is HistoryEntry {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.createdAt === "number" &&
    typeof value.content === "string" &&
    (value.context === undefined || typeof value.context === "string") &&
    Array.isArray(value.errors) &&
    value.errors.every(isError) &&
    isStringArray(value.accepted) &&
    (value.improvements === undefined || isStringArray(value.improvements))
  );
}

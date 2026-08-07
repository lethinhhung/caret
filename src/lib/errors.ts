import type { GrammarError } from "./types";

/**
 * Working with verified errors.
 *
 * Everything here assumes its `errors` argument came from `reconcileErrors`:
 * sorted by position and non-overlapping. That guarantee is what lets both
 * functions below walk the content with a single cursor.
 */

/** Stable identity for an error, used as a React key and in the applied-set. */
export function errorId(error: Pick<GrammarError, "start" | "end" | "suggestion">): string {
  return `${error.start}-${error.end}-${error.suggestion}`;
}

/**
 * Rebuilds `content` with the given fixes substituted in.
 *
 * When `applied` is omitted every fix is used.
 */
export function applyFixes(
  content: string,
  errors: GrammarError[],
  applied?: ReadonlySet<string>,
): string {
  let out = "";
  let cursor = 0;

  for (const error of errors) {
    // Defensive: a caller could hand us an unsorted list.
    if (error.start < cursor) continue;
    out += content.slice(cursor, error.start);
    out += applied && !applied.has(errorId(error)) ? error.original : error.suggestion;
    cursor = error.end;
  }

  return out + content.slice(cursor);
}

/**
 * Splits `content` into alternating plain and error segments so the annotated
 * view can render it without doing offset arithmetic itself.
 */
export type Segment =
  | { kind: "text"; text: string }
  | { kind: "error"; text: string; error: GrammarError };

export function segmentContent(
  content: string,
  errors: GrammarError[],
): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  for (const error of errors) {
    if (error.start < cursor) continue;
    if (error.start > cursor) {
      segments.push({ kind: "text", text: content.slice(cursor, error.start) });
    }
    segments.push({
      kind: "error",
      text: content.slice(error.start, error.end),
      error,
    });
    cursor = error.end;
  }

  if (cursor < content.length) {
    segments.push({ kind: "text", text: content.slice(cursor) });
  }

  return segments;
}

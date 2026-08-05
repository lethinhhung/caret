import type { GrammarError } from "./types";
import { isErrorCategory } from "./types";

/**
 * Reconciling model output with the source text.
 *
 * LLMs are unreliable at character offsets: they drift by a few characters, or
 * count code points differently than JavaScript does. Rather than trusting
 * `start`/`end`, we treat `original` as the source of truth and re-derive the
 * offsets from the actual content. Anything we cannot locate is dropped — a
 * missing suggestion is far better than a highlight over the wrong words.
 */

/** Stable identity for an error, used as a React key and in the applied-set. */
export function errorId(error: Pick<GrammarError, "start" | "end" | "suggestion">): string {
  return `${error.start}-${error.end}-${error.suggestion}`;
}

interface Claim {
  start: number;
  end: number;
}

function overlaps(a: Claim, b: Claim): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Every index where `needle` occurs in `haystack`. */
function allOccurrences(haystack: string, needle: string): number[] {
  const found: number[] = [];
  if (!needle) return found;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return found;
    found.push(at);
    from = at + 1;
  }
}

/**
 * Normalizes one raw error from the model into a verified `GrammarError`,
 * or returns `null` if it cannot be trusted.
 */
function reconcileOne(
  content: string,
  raw: unknown,
  claimed: Claim[],
): GrammarError | null {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as Record<string, unknown>;

  const original = typeof candidate.original === "string" ? candidate.original : null;
  const suggestion =
    typeof candidate.suggestion === "string" ? candidate.suggestion : null;
  const explanation =
    typeof candidate.explanation === "string" ? candidate.explanation.trim() : "";
  const category = isErrorCategory(candidate.category) ? candidate.category : null;

  // An empty `original` would be a pure insertion, which we cannot verify
  // against the text; the prompt asks the model to widen the span instead.
  if (!original || suggestion === null || !category) return null;
  // A "fix" that changes nothing is noise.
  if (original === suggestion) return null;

  const hintedStart = Number.isInteger(candidate.start)
    ? (candidate.start as number)
    : 0;

  // Prefer the model's own offsets when they actually line up.
  const exact: Claim = { start: hintedStart, end: hintedStart + original.length };
  const offsetsAreHonest =
    hintedStart >= 0 && content.slice(exact.start, exact.end) === original;

  let resolved: Claim | null = null;
  if (offsetsAreHonest && !claimed.some((c) => overlaps(c, exact))) {
    resolved = exact;
  } else {
    // Fall back to the unclaimed occurrence nearest the model's guess, which
    // keeps repeated words ("the the") anchored to the right instance.
    const candidates = allOccurrences(content, original)
      .map((start) => ({ start, end: start + original.length }))
      .filter((span) => !claimed.some((c) => overlaps(c, span)))
      .sort(
        (a, b) =>
          Math.abs(a.start - hintedStart) - Math.abs(b.start - hintedStart) ||
          a.start - b.start,
      );
    resolved = candidates[0] ?? null;
  }

  if (!resolved) return null;

  return {
    original,
    suggestion,
    category,
    explanation: explanation || "Suggested correction.",
    start: resolved.start,
    end: resolved.end,
  };
}

/**
 * Validates raw model errors against `content`, repairing offsets where
 * possible and dropping the rest. The result is sorted by position and
 * guaranteed non-overlapping, which is what the renderer and `applyFixes`
 * both assume.
 */
export function reconcileErrors(content: string, raw: unknown): GrammarError[] {
  if (!Array.isArray(raw)) return [];

  const claimed: Claim[] = [];
  const reconciled: GrammarError[] = [];

  // Longest originals first: they are the most specific and the least likely
  // to be matched at the wrong place, so they get first pick of the text.
  const ordered = [...raw.entries()].sort((a, b) => {
    const aLen =
      typeof (a[1] as Record<string, unknown>)?.original === "string"
        ? ((a[1] as Record<string, unknown>).original as string).length
        : 0;
    const bLen =
      typeof (b[1] as Record<string, unknown>)?.original === "string"
        ? ((b[1] as Record<string, unknown>).original as string).length
        : 0;
    return bLen - aLen || a[0] - b[0];
  });

  for (const [, item] of ordered) {
    const error = reconcileOne(content, item, claimed);
    if (!error) continue;
    claimed.push({ start: error.start, end: error.end });
    reconciled.push(error);
  }

  return reconciled.sort((a, b) => a.start - b.start || a.end - b.end);
}

/**
 * Rebuilds `content` with the given fixes substituted in.
 *
 * `errors` must be sorted and non-overlapping (i.e. straight from
 * `reconcileErrors`). When `applied` is omitted every fix is used.
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

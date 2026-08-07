import { locateSpan, type Span } from "./spans";
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

/** Length of a raw entry's `original`; 0 when it is absent or not a string. */
function originalLength(raw: unknown): number {
  const value = (raw as Record<string, unknown> | null)?.original;
  return typeof value === "string" ? value.length : 0;
}

/**
 * Normalizes one raw error from the model into a verified `GrammarError`,
 * or returns `null` if it cannot be trusted.
 */
function reconcileOne(
  content: string,
  raw: unknown,
  claimed: Span[],
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

  const hinted = Number.isInteger(candidate.start) ? (candidate.start as number) : 0;
  const span = locateSpan(content, original, hinted, claimed);
  if (!span) return null;

  return {
    original,
    suggestion,
    category,
    explanation: explanation || "Suggested correction.",
    start: span.start,
    end: span.end,
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

  const claimed: Span[] = [];
  const reconciled: GrammarError[] = [];

  // Longest originals first: they are the most specific and the least likely
  // to be matched at the wrong place, so they get first pick of the text.
  const ordered = [...raw.entries()].sort(
    ([ai, a], [bi, b]) => originalLength(b) - originalLength(a) || ai - bi,
  );

  for (const [, item] of ordered) {
    const error = reconcileOne(content, item, claimed);
    if (!error) continue;
    claimed.push({ start: error.start, end: error.end });
    reconciled.push(error);
  }

  return reconciled.sort((a, b) => a.start - b.start || a.end - b.end);
}

/**
 * Finding where a piece of text sits in the source.
 *
 * The model tells us both what it corrected and where, and the two often
 * disagree. Resolving that is pure string work, kept apart from the judgement
 * calls in `reconcile.ts` about which corrections are worth keeping at all.
 */

export interface Span {
  start: number;
  end: number;
}

function overlaps(a: Span, b: Span): boolean {
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
 * Where `text` actually sits in `content`, ignoring any span already `claimed`.
 *
 * The caller's `hintedStart` wins when it lines up; otherwise the nearest
 * unclaimed occurrence does, which keeps a repeated word ("the the") anchored
 * to the instance the hint was pointing at. Returns `null` when `text` does not
 * occur in `content` outside the claimed spans.
 */
export function locateSpan(
  content: string,
  text: string,
  hintedStart: number,
  claimed: Span[],
): Span | null {
  const exact: Span = { start: hintedStart, end: hintedStart + text.length };
  const honest = hintedStart >= 0 && content.slice(exact.start, exact.end) === text;
  if (honest && !claimed.some((c) => overlaps(c, exact))) return exact;

  const candidates = allOccurrences(content, text)
    .map((start) => ({ start, end: start + text.length }))
    .filter((span) => !claimed.some((c) => overlaps(c, span)))
    .sort(
      (a, b) =>
        Math.abs(a.start - hintedStart) - Math.abs(b.start - hintedStart) ||
        a.start - b.start,
    );

  return candidates[0] ?? null;
}

import { errorId } from "./errors";
import type { GrammarError } from "./types";

/**
 * The diff between the submitted text and the corrected text.
 *
 * We do not need to *compute* a diff: every change is an error the writer has
 * applied, so the diff is just the content walked with each applied error
 * emitted as a delete/insert pair. That keeps the category attached to each
 * change, which a textual diff would have to guess at.
 */

export type DiffPart =
  | { op: "equal"; text: string }
  | { op: "delete" | "insert"; text: string; error: GrammarError };

/**
 * Assumes `errors` came from `reconcileErrors`: sorted and non-overlapping.
 * When `applied` is omitted every fix counts as applied.
 */
export function diffFromErrors(
  content: string,
  errors: GrammarError[],
  applied?: ReadonlySet<string>,
): DiffPart[] {
  const parts: DiffPart[] = [];
  let cursor = 0;

  const pushEqual = (text: string) => {
    if (!text) return;
    const last = parts[parts.length - 1];
    if (last?.op === "equal") last.text += text;
    else parts.push({ op: "equal", text });
  };

  for (const error of errors) {
    if (error.start < cursor) continue;
    pushEqual(content.slice(cursor, error.start));
    const isApplied = !applied || applied.has(errorId(error));
    if (isApplied) {
      parts.push({ op: "delete", text: error.original, error });
      if (error.suggestion) parts.push({ op: "insert", text: error.suggestion, error });
    } else {
      pushEqual(error.original);
    }
    cursor = error.end;
  }

  pushEqual(content.slice(cursor));
  return parts;
}

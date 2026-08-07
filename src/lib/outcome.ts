import { applyFixes } from "./errors";
import type { HistoryEntry } from "./history";
import type { CheckResponse } from "./types";

/**
 * A completed check, paired with the exact text that produced it. Annotations
 * index into `content`, so editing the textarea afterwards can never shift the
 * highlights out from under the writer.
 */
export interface Outcome {
  content: string;
  result: CheckResponse;
  /** The history entry this check is stored as, when history is on. */
  entryId?: string;
}

/**
 * Rebuilds an outcome from a stored check.
 *
 * `corrected` was never stored — it comes back out of the text and the errors
 * that index into it, so there is no second copy to fall out of step.
 */
export function outcomeFromEntry(entry: HistoryEntry): Outcome {
  return {
    content: entry.content,
    entryId: entry.id,
    result: {
      status: entry.errors.length > 0 ? "has_errors" : "correct",
      corrected: applyFixes(entry.content, entry.errors),
      errors: entry.errors,
      improvements: entry.improvements,
    },
  };
}

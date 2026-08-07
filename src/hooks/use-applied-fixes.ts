"use client";

import { useCallback, useMemo, useState } from "react";
import { applyFixes, errorId } from "@/lib/errors";
import type { GrammarError } from "@/lib/types";

/**
 * Which of a check's fixes are applied, and the text that comes out.
 *
 * Fixes arrive applied, so copying the corrected text is one click away and
 * reverting one is a deliberate act rather than the starting point.
 */
export function useAppliedFixes(content: string, errors: GrammarError[]) {
  const [applied, setApplied] = useState<ReadonlySet<string>>(() => new Set());

  const corrected = useMemo(
    () => applyFixes(content, errors, applied),
    [content, errors, applied],
  );
  const allApplied = errors.length > 0 && applied.size === errors.length;

  /** Starts from a known set: a fresh check, or one loaded back from history. */
  const reset = useCallback((ids: string[]) => setApplied(new Set(ids)), []);

  const toggleFix = useCallback((id: string) => {
    setApplied((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setApplied(allApplied ? new Set() : new Set(errors.map(errorId)));
  }, [allApplied, errors]);

  return { applied, corrected, allApplied, reset, toggleFix, toggleAll };
}

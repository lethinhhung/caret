"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAcceptedSync } from "@/hooks/use-accepted-sync";
import { useAppliedFixes } from "@/hooks/use-applied-fixes";
import { requestCheck } from "@/lib/check-client";
import { errorId } from "@/lib/errors";
import type { HistoryEntry } from "@/lib/history";
import { record } from "@/lib/history-store";
import { outcomeFromEntry, type Outcome } from "@/lib/outcome";
import { MAX_CONTENT_LENGTH } from "@/lib/types";

/** Runs a check against `/api/check` and tracks which of its fixes are kept. */
export function useGrammarCheck(content: string, context: string) {
  const [isChecking, setIsChecking] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const errors = useMemo(() => outcome?.result.errors ?? [], [outcome]);
  const fixes = useAppliedFixes(outcome?.content ?? "", errors);
  const { reset } = fixes;
  useAcceptedSync(outcome?.entryId, fixes.applied);

  // Held so an unmount can cancel the request instead of leaving it running.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const overLimit = content.length > MAX_CONTENT_LENGTH;
  const canCheck = content.trim().length > 0 && !overLimit && !isChecking;

  const run = useCallback(async () => {
    if (!canCheck) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsChecking(true);
    setFailure(null);

    const hint = context.trim() || undefined;

    try {
      const attempt = await requestCheck(
        { content, context: hint },
        controller.signal,
      );

      if (!attempt.ok) {
        if (!attempt.message) return;
        setFailure(attempt.message);
        setOutcome(null);
        return;
      }

      const { result } = attempt;
      const accepted = result.errors.map(errorId);
      const entryId = record({
        content,
        context: hint,
        errors: result.errors,
        accepted,
        improvements: result.improvements,
      });

      setOutcome({ content, result, entryId: entryId ?? undefined });
      reset(accepted);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsChecking(false);
      }
    }
  }, [canCheck, content, context, reset]);

  /** Puts a stored check back on screen, over a running one if need be. */
  const restore = useCallback(
    (entry: HistoryEntry) => {
      abortRef.current?.abort();
      setFailure(null);
      setOutcome(outcomeFromEntry(entry));
      reset(entry.accepted);
    },
    [reset],
  );

  return {
    isChecking,
    outcome,
    failure,
    errors,
    overLimit,
    canCheck,
    run,
    restore,
    ...fixes,
  };
}

/** Everything a view needs to render a check, as returned above. */
export type GrammarCheck = ReturnType<typeof useGrammarCheck>;

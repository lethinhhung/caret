"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyFixes, errorId } from "@/lib/errors";
import {
  MAX_CONTENT_LENGTH,
  type CheckErrorResponse,
  type CheckResponse,
} from "@/lib/types";

/**
 * A completed check, paired with the exact text that produced it. Annotations
 * index into `content`, so editing the textarea afterwards can never shift the
 * highlights out from under the writer.
 */
export interface Outcome {
  content: string;
  result: CheckResponse;
}

const GENERIC_FAILURE = "Something went wrong. Try again.";
const UNREACHABLE =
  "Could not reach the grammar service. Check your connection and try again.";

/**
 * Runs a check against `/api/check` and tracks which of its fixes are applied.
 *
 * Fixes arrive applied, so copying the corrected text is one click away and
 * reverting one is a deliberate act rather than the starting point.
 */
export function useGrammarCheck(content: string, context: string) {
  const [isChecking, setIsChecking] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [applied, setApplied] = useState<ReadonlySet<string>>(() => new Set());

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

    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, context: context.trim() || undefined }),
        signal: controller.signal,
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        const { error } = (payload ?? {}) as CheckErrorResponse;
        setFailure(error || GENERIC_FAILURE);
        setOutcome(null);
        return;
      }

      const result = payload as CheckResponse;
      setOutcome({ content, result });
      setApplied(new Set(result.errors.map(errorId)));
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setFailure(UNREACHABLE);
      setOutcome(null);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsChecking(false);
      }
    }
  }, [canCheck, content, context]);

  const errors = useMemo(() => outcome?.result.errors ?? [], [outcome]);
  const corrected = useMemo(
    () => (outcome ? applyFixes(outcome.content, outcome.result.errors, applied) : ""),
    [outcome, applied],
  );
  const allApplied = errors.length > 0 && applied.size === errors.length;

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

  return {
    isChecking,
    outcome,
    failure,
    applied,
    errors,
    corrected,
    allApplied,
    overLimit,
    canCheck,
    run,
    toggleFix,
    toggleAll,
  };
}

/** Everything a view needs to render a check, as returned above. */
export type GrammarCheck = ReturnType<typeof useGrammarCheck>;

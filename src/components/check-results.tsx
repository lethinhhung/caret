"use client";

import { CheckFailure } from "@/components/check-failure";
import { CleanCard } from "@/components/clean-card";
import { IssuesCard } from "@/components/issues-card";
import { ResultsPlaceholder } from "@/components/results-placeholder";
import { ResultsSkeleton } from "@/components/results-skeleton";
import type { Clipboard } from "@/hooks/use-copy";
import type { GrammarCheck } from "@/hooks/use-grammar-check";

/**
 * Whichever of the four states a check can be in: running, failed, finished
 * with corrections, or finished clean. Nothing has been run yet is the fifth,
 * and says so plainly rather than showing an empty card.
 */
export function CheckResults({
  check,
  clipboard,
  isStale,
  onRetry,
}: {
  check: GrammarCheck;
  clipboard: Clipboard;
  isStale: boolean;
  onRetry: () => void;
}) {
  const { isChecking, failure, outcome } = check;

  if (isChecking) return <ResultsSkeleton />;

  if (failure) {
    return (
      <CheckFailure
        message={failure}
        canRetry={check.canCheck}
        onRetry={onRetry}
      />
    );
  }

  if (!outcome) return <ResultsPlaceholder />;

  if (outcome.result.status !== "has_errors") {
    return (
      <CleanCard
        content={outcome.content}
        improvements={outcome.result.improvements}
        isStale={isStale}
        clipboard={clipboard}
      />
    );
  }

  // Toggling a fix rewrites the corrected text, which makes any standing
  // "Copied" confirmation a lie about what is on the clipboard.
  function toggleFix(id: string) {
    check.toggleFix(id);
    clipboard.clear();
  }

  function toggleAll() {
    check.toggleAll();
    clipboard.clear();
  }

  return (
    <IssuesCard
      content={outcome.content}
      errors={check.errors}
      applied={check.applied}
      corrected={check.corrected}
      allApplied={check.allApplied}
      isStale={isStale}
      clipboard={clipboard}
      onToggleFix={toggleFix}
      onToggleAll={toggleAll}
    />
  );
}

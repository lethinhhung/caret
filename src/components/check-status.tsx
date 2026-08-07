import type { Outcome } from "@/lib/outcome";

/**
 * The results region, announced.
 *
 * Everything below is conveyed visually by cards and highlights; this is the
 * same information said once, in a live region, for anyone not looking at it.
 */
export function CheckStatus({
  isChecking,
  failure,
  outcome,
}: {
  isChecking: boolean;
  failure: string | null;
  outcome: Outcome | null;
}) {
  const count = outcome?.result.errors.length ?? 0;

  const status = isChecking
    ? "Checking your text."
    : failure
      ? failure
      : outcome
        ? outcome.result.status === "has_errors"
          ? `${count} ${count === 1 ? "issue" : "issues"} found.`
          : "No issues found."
        : "";

  return (
    <p role="status" aria-live="polite" className="sr-only">
      {status}
    </p>
  );
}

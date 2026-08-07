import type { GrammarError } from "./types";

/**
 * Builds one entry of unvalidated model output.
 *
 * Fields are deliberately loose: these stand in for what Gemini sends before
 * `reconcileErrors` has vetted it, so a test needs to be able to pass a
 * category the type system would reject.
 */
export const raw = (
  over: Partial<Record<keyof GrammarError, unknown>> & { original: string },
) => ({
  suggestion: "x",
  category: "grammar",
  explanation: "because",
  start: 0,
  end: 0,
  ...over,
});

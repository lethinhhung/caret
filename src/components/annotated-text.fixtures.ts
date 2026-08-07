import type { GrammarError } from "@/lib/types";

/** Two verified errors in one sentence, one of each of two categories. */

export const CONTENT = "I have went to the store and it was'nt open.";

export const WENT: GrammarError = {
  original: "went",
  suggestion: "gone",
  category: "grammar",
  explanation: "Use the past participle after 'have'.",
  start: 7,
  end: 11,
};

export const WASNT: GrammarError = {
  original: "was'nt",
  suggestion: "wasn't",
  category: "spelling",
  explanation: "The apostrophe belongs before the t.",
  start: 32,
  end: 38,
};

export const ERRORS = [WENT, WASNT];

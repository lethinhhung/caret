/** Shared request/response contract for `POST /api/check`. See specs/core.md §4. */

export const ERROR_CATEGORIES = [
  "grammar",
  "spelling",
  "punctuation",
  "style",
] as const;

export type ErrorCategory = (typeof ERROR_CATEGORIES)[number];

/** Longest content we accept, in characters. Enforced on both client and server. */
export const MAX_CONTENT_LENGTH = 5000;
/** Longest context hint we accept, in characters. */
export const MAX_CONTEXT_LENGTH = 200;

export interface GrammarError {
  /** The exact substring of the original content this error covers. */
  original: string;
  /** Replacement text. Empty string means "delete this span". */
  suggestion: string;
  category: ErrorCategory;
  /** One short sentence explaining the fix. */
  explanation: string;
  /** Inclusive start offset into the original content. */
  start: number;
  /** Exclusive end offset into the original content. */
  end: number;
}

export interface CheckRequest {
  context?: string;
  content: string;
}

export interface CheckResponse {
  status: "has_errors" | "correct";
  /** Full corrected text with every reported error applied. */
  corrected: string;
  errors: GrammarError[];
  /** Alternative phrasings — only populated when `status` is `"correct"`. */
  improvements?: string[];
}

export interface CheckErrorResponse {
  error: string;
  /** Present on 429 so the client can tell the user when to retry. */
  retryAfterSeconds?: number;
}

export function isErrorCategory(value: unknown): value is ErrorCategory {
  return (
    typeof value === "string" &&
    (ERROR_CATEGORIES as readonly string[]).includes(value)
  );
}

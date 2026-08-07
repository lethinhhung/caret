/**
 * The two ways a Gemini call can fail that callers need to tell apart: the API
 * refused us, or it answered with something we cannot read. Only the second is
 * worth retrying.
 */

/** Thrown when Gemini itself rejects the request, so the route can map the status. */
export class GeminiApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "GeminiApiError";
  }
}

/** Thrown when the model returns something we cannot parse as our schema. */
export class GeminiParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiParseError";
  }
}

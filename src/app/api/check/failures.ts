import { NextResponse } from "next/server";
import { GeminiApiError, GeminiParseError } from "@/lib/gemini-errors";
import type { CheckErrorResponse } from "@/lib/types";

/**
 * Turning a failure into a response the client can act on.
 *
 * The rule throughout: say what the writer should do next, and never let the
 * cause leak. Anything that is our fault rather than theirs is logged without
 * detail and reported as a plain 500.
 */

export function fail(
  status: number,
  error: string,
  retryAfterSeconds?: number,
): NextResponse<CheckErrorResponse> {
  return NextResponse.json(
    retryAfterSeconds ? { error, retryAfterSeconds } : { error },
    {
      status,
      headers: retryAfterSeconds
        ? { "Retry-After": String(retryAfterSeconds) }
        : undefined,
    },
  );
}

/** Maps a thrown Gemini failure to the status and message the client sees. */
export function failureResponse(cause: unknown): NextResponse<CheckErrorResponse> {
  if (cause instanceof Error && cause.name === "AbortError") {
    // The client navigated away or pressed Check again; nothing to report.
    return fail(499, "Request cancelled.");
  }

  if (cause instanceof GeminiParseError) {
    return fail(500, "The grammar service returned an unreadable result. Try again.");
  }

  if (cause instanceof GeminiApiError) {
    if (cause.status === 429) {
      return fail(
        429,
        "The free tier is rate limited right now. Wait a moment and try again.",
        cause.retryAfterSeconds ?? 30,
      );
    }
    if (cause.status === 401 || cause.status === 403) {
      console.error("Gemini rejected the API key.");
      return fail(500, "The grammar service is not configured correctly.");
    }
    if (cause.status === 413 || cause.status === 422) {
      return fail(cause.status, cause.message);
    }
    return fail(502, "The grammar service is unavailable. Try again shortly.");
  }

  console.error("Unexpected failure in /api/check.");
  return fail(500, "Something went wrong. Try again.");
}

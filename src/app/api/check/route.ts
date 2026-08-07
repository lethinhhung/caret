import { NextResponse } from "next/server";
import { applyFixes } from "@/lib/errors";
import { reconcileErrors } from "@/lib/reconcile";
import {
  GeminiApiError,
  GeminiParseError,
  requestGrammarCheck,
} from "@/lib/gemini";
import {
  MAX_CONTENT_LENGTH,
  MAX_CONTEXT_LENGTH,
  type CheckErrorResponse,
  type CheckResponse,
} from "@/lib/types";

/**
 * POST /api/check — see specs/core.md §4.
 *
 * Stateless. The API key stays on the server and user text is never logged.
 */

// Always run at request time; there is nothing here worth prerendering.
export const dynamic = "force-dynamic";

function fail(
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

export async function POST(
  request: Request,
): Promise<NextResponse<CheckResponse | CheckErrorResponse>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // A config problem, not a user problem — say so without leaking specifics.
    console.error("GEMINI_API_KEY is not set; /api/check cannot run.");
    return fail(500, "The grammar service is not configured.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Request body must be valid JSON.");
  }

  if (typeof body !== "object" || body === null) {
    return fail(400, "Request body must be a JSON object.");
  }

  const { content, context } = body as { content?: unknown; context?: unknown };

  if (typeof content !== "string" || !content.trim()) {
    return fail(400, "Add some text to check.");
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return fail(
      400,
      `Text is ${content.length.toLocaleString()} characters; the limit is ${MAX_CONTENT_LENGTH.toLocaleString()}.`,
    );
  }
  if (context !== undefined && typeof context !== "string") {
    return fail(400, "Context must be text.");
  }
  if (typeof context === "string" && context.length > MAX_CONTEXT_LENGTH) {
    return fail(400, `Context is limited to ${MAX_CONTEXT_LENGTH} characters.`);
  }

  const trimmedContext = typeof context === "string" ? context.trim() : undefined;

  // One retry, because a malformed generation is usually transient.
  let raw;
  try {
    try {
      raw = await requestGrammarCheck(content, trimmedContext, apiKey, request.signal);
    } catch (first) {
      if (!(first instanceof GeminiParseError)) throw first;
      raw = await requestGrammarCheck(content, trimmedContext, apiKey, request.signal);
    }
  } catch (cause) {
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

  // Trust the text, not the model's offsets.
  const errors = reconcileErrors(content, raw.errors);

  const improvements =
    Array.isArray(raw.improvements) && errors.length === 0
      ? raw.improvements
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value) => value.length > 0 && value !== content.trim())
          .slice(0, 3)
      : [];

  // `status` is derived from what we could actually verify, so the UI never
  // claims "has errors" while showing nothing to fix.
  const status = errors.length > 0 ? "has_errors" : "correct";

  const response: CheckResponse = {
    status,
    // Rebuild from the verified spans so corrected text, annotations, and diff
    // can never disagree with each other.
    corrected: errors.length > 0 ? applyFixes(content, errors) : content,
    errors,
    ...(status === "correct" ? { improvements } : {}),
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}

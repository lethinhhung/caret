import { NextResponse } from "next/server";
import { applyFixes } from "@/lib/errors";
import { requestGrammarCheck } from "@/lib/gemini";
import { GeminiParseError } from "@/lib/gemini-errors";
import { reconcileErrors } from "@/lib/reconcile";
import type { CheckErrorResponse, CheckResponse } from "@/lib/types";
import { fail, failureResponse } from "./failures";
import { parseCheckRequest } from "./request";

/**
 * POST /api/check — see specs/core.md §4.
 *
 * Stateless. The API key stays on the server and user text is never logged.
 */

// Always run at request time; there is nothing here worth prerendering.
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
): Promise<NextResponse<CheckResponse | CheckErrorResponse>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // A config problem, not a user problem — say so without leaking specifics.
    console.error("GEMINI_API_KEY is not set; /api/check cannot run.");
    return fail(500, "The grammar service is not configured.");
  }

  const parsed = await parseCheckRequest(request);
  if (!parsed.ok) return fail(400, parsed.error);
  const { content, context } = parsed;

  // One retry, because a malformed generation is usually transient.
  let raw;
  try {
    try {
      raw = await requestGrammarCheck(content, context, apiKey, request.signal);
    } catch (first) {
      if (!(first instanceof GeminiParseError)) throw first;
      raw = await requestGrammarCheck(content, context, apiKey, request.signal);
    }
  } catch (cause) {
    return failureResponse(cause);
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

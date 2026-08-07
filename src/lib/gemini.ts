import { GeminiApiError, GeminiParseError } from "./gemini-errors";
import { buildPrompt, responseSchema, SYSTEM_PROMPT } from "./gemini-request";

/**
 * Gemini client — one call, one parsed result.
 *
 * Called only from the server. `GEMINI_API_KEY` must never be referenced from a
 * module that reaches the client bundle.
 */

// specs/core.md names gemini-2.5-flash-lite, but Google retired it for projects
// that were not already calling it ("no longer available to new users"). This is
// its current-generation equivalent and has the most generous free-tier quota of
// the lite models: 15 RPM / 250K TPM / 500 RPD.
const MODEL = "gemini-3.1-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/** Raw shape we ask the model for. Offsets are re-derived server-side anyway. */
export interface RawModelResult {
  status?: unknown;
  corrected?: unknown;
  errors?: unknown;
  improvements?: unknown;
}

interface GeminiPayload {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

/**
 * Interprets a 200 reply. A refusal or a truncated generation arrives looking
 * like success, so both are checked before the text is parsed.
 */
async function readResult(response: Response): Promise<RawModelResult> {
  const payload = (await response.json()) as GeminiPayload;

  if (payload.promptFeedback?.blockReason) {
    throw new GeminiApiError(
      "The text was blocked by the content filter. Try rephrasing it.",
      422,
    );
  }

  const candidate = payload.candidates?.[0];
  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new GeminiApiError(
      "The text produced too many corrections to return. Try checking a shorter passage.",
      413,
    );
  }

  const text = candidate?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) throw new GeminiParseError("Model returned an empty response.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GeminiParseError("Model returned malformed JSON.");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new GeminiParseError("Model returned JSON that is not an object.");
  }
  return parsed as RawModelResult;
}

/**
 * Calls Gemini and returns the parsed JSON object. Throws `GeminiApiError` for
 * transport/API failures and `GeminiParseError` for unusable output.
 */
export async function requestGrammarCheck(
  content: string,
  context: string | undefined,
  apiKey: string,
  signal?: AbortSignal,
): Promise<RawModelResult> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildPrompt(content, context) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
          // Proofreading should be deterministic, not creative.
          temperature: 0,
          maxOutputTokens: 8192,
        },
      }),
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") throw cause;
    throw new GeminiApiError("Could not reach the grammar service.", 502);
  }

  if (!response.ok) {
    // Read the headers for a retry hint only — never the body, it may echo user text.
    const retryAfter = Number(response.headers.get("retry-after"));
    throw new GeminiApiError(
      `Gemini request failed with status ${response.status}.`,
      response.status,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    );
  }

  return readResult(response);
}

import { ERROR_CATEGORIES } from "./types";

/**
 * Gemini client — prompt, response schema, and parsing.
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

const responseSchema = {
  type: "OBJECT",
  properties: {
    status: { type: "STRING", enum: ["has_errors", "correct"] },
    corrected: { type: "STRING" },
    errors: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          original: { type: "STRING" },
          suggestion: { type: "STRING" },
          category: { type: "STRING", enum: [...ERROR_CATEGORIES] },
          explanation: { type: "STRING" },
          start: { type: "INTEGER" },
          end: { type: "INTEGER" },
        },
        required: [
          "original",
          "suggestion",
          "category",
          "explanation",
          "start",
          "end",
        ],
        propertyOrdering: [
          "original",
          "suggestion",
          "category",
          "explanation",
          "start",
          "end",
        ],
      },
    },
    improvements: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["status", "corrected", "errors"],
  propertyOrdering: ["status", "corrected", "errors", "improvements"],
} as const;

const SYSTEM_PROMPT = `You are a precise proofreader. You correct text without changing its meaning or voice.

Return JSON matching the provided schema.

Rules for the "errors" array:
- Report only genuine problems: grammar, spelling, punctuation, or style/word choice.
- "original" MUST be an exact, verbatim substring of the input text. Copy it character for character. Never paraphrase it, never trim it, never normalize its quotes or spacing.
- "original" must never be empty. For a missing word or punctuation mark, widen the span to include an adjacent word so it is still an exact substring. Example: for a missing comma after "However", use original "However" and suggestion "However,".
- "start" is the 0-based character index where "original" begins; "end" is start + original.length.
- Make spans as short as possible while remaining unambiguous, and never let two spans overlap.
- "explanation" is ONE short sentence in plain language, addressed to the writer.
- "suggestion" replaces "original" exactly. To delete text, use an empty suggestion.

Rules for "corrected": the full input text with every reported error applied, and nothing else changed.

If the text has no errors, set status to "correct", set "corrected" to the input text unchanged, use an empty "errors" array, and provide 1-3 "improvements": complete rewrites of the whole text that are clearer, more concise, or better matched to the stated context. Do not provide "improvements" when status is "has_errors".`;

function buildPrompt(content: string, context?: string): string {
  const contextBlock = context?.trim()
    ? `The writer describes the context as: ${context.trim()}\nTake this into account when judging tone and word choice.\n\n`
    : "";

  // The text is delimited so the model does not treat it as instructions.
  return `${contextBlock}Proofread the text between the <text> tags. Offsets are relative to the first character after <text> plus a newline.

<text>
${content}
</text>`;
}

interface GeminiCandidate {
  content?: { parts?: { text?: string }[] };
  finishReason?: string;
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
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
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
    // Read the body for a status code only — never log it, it may echo user text.
    const retryAfter = Number(response.headers.get("retry-after"));
    throw new GeminiApiError(
      `Gemini request failed with status ${response.status}.`,
      response.status,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    );
  }

  const payload = (await response.json()) as {
    candidates?: GeminiCandidate[];
    promptFeedback?: { blockReason?: string };
  };

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

  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new GeminiParseError("Model returned JSON that is not an object.");
    }
    return parsed as RawModelResult;
  } catch (cause) {
    if (cause instanceof GeminiParseError) throw cause;
    throw new GeminiParseError("Model returned malformed JSON.");
  }
}

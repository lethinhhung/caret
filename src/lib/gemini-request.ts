import { ERROR_CATEGORIES } from "./types";

/**
 * What we ask Gemini for: the standing instruction, the JSON schema the reply
 * must satisfy, and the per-check prompt. Kept apart from the client so the
 * wording can be tuned without touching transport or error handling.
 */

export const responseSchema = {
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

export const SYSTEM_PROMPT = `You are a precise proofreader. You correct text without changing its meaning or voice.

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

export function buildPrompt(content: string, context?: string): string {
  const contextBlock = context?.trim()
    ? `The writer describes the context as: ${context.trim()}\nTake this into account when judging tone and word choice.\n\n`
    : "";

  // The text is delimited so the model does not treat it as instructions.
  return `${contextBlock}Proofread the text between the <text> tags. Offsets are relative to the first character after <text> plus a newline.

<text>
${content}
</text>`;
}

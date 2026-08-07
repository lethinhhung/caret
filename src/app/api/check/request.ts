import { MAX_CONTENT_LENGTH, MAX_CONTEXT_LENGTH } from "@/lib/types";

/**
 * Everything the route needs to believe about a request body before it spends
 * a Gemini call on it. Nothing here talks to the network or to Next.
 */

export type ParsedRequest =
  | { ok: true; content: string; context: string | undefined }
  | { ok: false; error: string };

const invalid = (error: string): ParsedRequest => ({ ok: false, error });

/** Reads and validates the JSON body. Every rejection is a 400 to the caller. */
export async function parseCheckRequest(request: Request): Promise<ParsedRequest> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalid("Request body must be valid JSON.");
  }

  if (typeof body !== "object" || body === null) {
    return invalid("Request body must be a JSON object.");
  }

  const { content, context } = body as { content?: unknown; context?: unknown };

  if (typeof content !== "string" || !content.trim()) {
    return invalid("Add some text to check.");
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return invalid(
      `Text is ${content.length.toLocaleString()} characters; the limit is ${MAX_CONTENT_LENGTH.toLocaleString()}.`,
    );
  }
  if (context !== undefined && typeof context !== "string") {
    return invalid("Context must be text.");
  }
  if (typeof context === "string" && context.length > MAX_CONTEXT_LENGTH) {
    return invalid(`Context is limited to ${MAX_CONTEXT_LENGTH} characters.`);
  }

  return {
    ok: true,
    content,
    context: typeof context === "string" ? context.trim() : undefined,
  };
}

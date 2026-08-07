import { beforeEach, afterEach, vi } from "vitest";
import { POST } from "./route";

/**
 * Shared scaffolding for the route tests: a Gemini-shaped reply, a way to post
 * a body, and a stubbed API key so no suite reaches the real service.
 */

/** Builds a Gemini success envelope wrapping `payload` as JSON text. */
export function geminiOk(payload: unknown, finishReason = "STOP") {
  return new Response(
    JSON.stringify({
      candidates: [
        { content: { parts: [{ text: JSON.stringify(payload) }] }, finishReason },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

export const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/check", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

/** Installs a test API key and silences the route's own logging. */
export function stubApiKey() {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  });
}

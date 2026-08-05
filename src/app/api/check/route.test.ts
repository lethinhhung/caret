import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import type { CheckErrorResponse, CheckResponse } from "@/lib/types";

/** Builds a Gemini-shaped success envelope wrapping `payload` as JSON text. */
function geminiOk(payload: unknown, finishReason = "STOP") {
  return new Response(
    JSON.stringify({
      candidates: [
        { content: { parts: [{ text: JSON.stringify(payload) }] }, finishReason },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/check", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

const originalKey = process.env.GEMINI_API_KEY;

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
});

describe("POST /api/check — validation", () => {
  it("rejects empty content with 400", async () => {
    const res = await post({ content: "   " });
    expect(res.status).toBe(400);
    expect((await res.json()) as CheckErrorResponse).toHaveProperty("error");
  });

  it("rejects missing content with 400", async () => {
    expect((await post({})).status).toBe(400);
  });

  it("rejects oversized content with 400", async () => {
    const res = await post({ content: "a".repeat(5001) });
    expect(res.status).toBe(400);
    expect(((await res.json()) as CheckErrorResponse).error).toContain("5,000");
  });

  it("rejects oversized context with 400", async () => {
    const res = await post({ content: "hi", context: "c".repeat(201) });
    expect(res.status).toBe(400);
  });

  it("rejects a non-string context with 400", async () => {
    expect((await post({ content: "hi", context: 42 })).status).toBe(400);
  });

  it("rejects malformed JSON with 400", async () => {
    expect((await post("{not json")).status).toBe(400);
  });

  it("does not call Gemini when validation fails", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await post({ content: "" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 500 when the API key is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await post({ content: "hello" });
    expect(res.status).toBe(500);
  });
});

describe("POST /api/check — success", () => {
  it("returns verified errors and a corrected string", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      geminiOk({
        status: "has_errors",
        corrected: "I have gone there.",
        errors: [
          {
            original: "went",
            suggestion: "gone",
            category: "grammar",
            explanation: "Use the past participle after 'have'.",
            start: 7,
            end: 11,
          },
        ],
      }),
    );

    const res = await post({ content: "I have went there." });
    const body = (await res.json()) as CheckResponse;

    expect(res.status).toBe(200);
    expect(body.status).toBe("has_errors");
    expect(body.errors).toHaveLength(1);
    expect(body.corrected).toBe("I have gone there.");
  });

  it("repairs offsets the model got wrong", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      geminiOk({
        status: "has_errors",
        corrected: "I have gone there.",
        errors: [
          {
            original: "went",
            suggestion: "gone",
            category: "grammar",
            explanation: "Past participle.",
            start: 0, // wrong on purpose
            end: 4,
          },
        ],
      }),
    );

    const body = (await (await post({ content: "I have went there." })).json()) as CheckResponse;
    expect(body.errors[0].start).toBe(7);
    expect(body.corrected).toBe("I have gone there.");
  });

  it("drops errors that do not appear in the text and downgrades to 'correct'", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      geminiOk({
        status: "has_errors",
        corrected: "whatever the model felt like",
        errors: [
          {
            original: "not in the text",
            suggestion: "x",
            category: "grammar",
            explanation: "Hallucinated.",
            start: 0,
            end: 15,
          },
        ],
      }),
    );

    const content = "This sentence is entirely fine.";
    const body = (await (await post({ content })).json()) as CheckResponse;

    expect(body.errors).toEqual([]);
    expect(body.status).toBe("correct");
    // Never surface the model's unverifiable rewrite.
    expect(body.corrected).toBe(content);
  });

  it("returns improvements when the text is already correct", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      geminiOk({
        status: "correct",
        corrected: "The report is attached.",
        errors: [],
        improvements: ["Please find the report attached.", "The report is enclosed."],
      }),
    );

    const body = (await (await post({ content: "The report is attached." })).json()) as CheckResponse;

    expect(body.status).toBe("correct");
    expect(body.improvements).toHaveLength(2);
  });

  it("caps improvements at three and drops echoes of the input", async () => {
    const content = "All good.";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      geminiOk({
        status: "correct",
        corrected: content,
        errors: [],
        improvements: [content, "a", "b", "c", "d", ""],
      }),
    );

    const body = (await (await post({ content })).json()) as CheckResponse;
    expect(body.improvements).toEqual(["a", "b", "c"]);
  });

  it("passes the context through to the model", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      geminiOk({ status: "correct", corrected: "Hi.", errors: [] }),
    );

    await post({ content: "Hi.", context: "formal email to a client" });

    const requestBody = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
    expect(JSON.stringify(requestBody.contents)).toContain("formal email to a client");
  });

  it("sends the API key as a header, not in the URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      geminiOk({ status: "correct", corrected: "Hi.", errors: [] }),
    );

    await post({ content: "Hi." });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).not.toContain("test-key");
    expect((init?.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
  });
});

describe("POST /api/check — failure handling", () => {
  it("passes a 429 through with a retry hint", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("rate limited", {
        status: 429,
        headers: { "retry-after": "42" },
      }),
    );

    const res = await post({ content: "hello there" });
    const body = (await res.json()) as CheckErrorResponse;

    expect(res.status).toBe(429);
    expect(body.retryAfterSeconds).toBe(42);
    expect(res.headers.get("Retry-After")).toBe("42");
  });

  it("defaults the retry hint when Gemini omits the header", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("rate limited", { status: 429 }),
    );

    const body = (await (await post({ content: "hello" })).json()) as CheckErrorResponse;
    expect(body.retryAfterSeconds).toBe(30);
  });

  it("retries once on malformed model output, then succeeds", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: "not json" }] } }] }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(geminiOk({ status: "correct", corrected: "Hi.", errors: [] }));

    const res = await post({ content: "Hi." });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it("returns 500 when the output is still malformed after the retry", async () => {
    const bad = () =>
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "nope" }] } }] }),
        { status: 200 },
      );
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(bad())
      .mockResolvedValueOnce(bad());

    const res = await post({ content: "Hi." });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(500);
  });

  it("does not retry a 429", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("", { status: 429 }));

    await post({ content: "Hi." });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("maps an auth failure to a generic 500 without leaking the cause", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 403 }));

    const res = await post({ content: "Hi." });
    const body = (await res.json()) as CheckErrorResponse;

    expect(res.status).toBe(500);
    expect(body.error).not.toMatch(/key|403/i);
  });

  it("maps a network failure to 502", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    expect((await post({ content: "Hi." })).status).toBe(502);
  });

  it("reports a content-filter block distinctly", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } }), {
        status: 200,
      }),
    );

    const res = await post({ content: "Hi." });
    expect(res.status).toBe(422);
    expect(((await res.json()) as CheckErrorResponse).error).toMatch(/filter/i);
  });

  it("reports a truncated generation instead of returning partial fixes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      geminiOk({ status: "has_errors", corrected: "", errors: [] }, "MAX_TOKENS"),
    );

    const res = await post({ content: "Hi." });
    expect(res.status).toBe(413);
  });
});

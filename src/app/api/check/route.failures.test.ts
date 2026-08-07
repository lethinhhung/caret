import { describe, expect, it, vi } from "vitest";
import { geminiOk, post, stubApiKey } from "./route.fixtures";
import type { CheckErrorResponse } from "@/lib/types";

stubApiKey();

/** A 200 reply whose text is not the JSON we asked for. */
const unparseable = () =>
  new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text: "not json" }] } }] }),
    { status: 200 },
  );

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
      .mockResolvedValueOnce(unparseable())
      .mockResolvedValueOnce(geminiOk({ status: "correct", corrected: "Hi.", errors: [] }));

    const res = await post({ content: "Hi." });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it("returns 500 when the output is still malformed after the retry", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(unparseable())
      .mockResolvedValueOnce(unparseable());

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

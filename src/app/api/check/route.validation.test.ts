import { describe, expect, it, vi } from "vitest";
import { post, stubApiKey } from "./route.fixtures";
import type { CheckErrorResponse } from "@/lib/types";

stubApiKey();

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

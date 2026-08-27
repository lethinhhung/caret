import { describe, expect, it, vi } from "vitest";
import { RATE_LIMITS } from "./rate-limit";
import { geminiOk, post, stubApiKey } from "./route.fixtures";
import type { CheckErrorResponse } from "@/lib/types";

stubApiKey();

const perMinute = RATE_LIMITS[0].max;
// A fresh Response per call: a body can only be read once.
const stubGemini = () =>
  vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => geminiOk({ status: "correct", errors: [] }));
const from = (ip: string) => post({ content: "hello" }, { "x-forwarded-for": ip });

describe("POST /api/check — per-IP rate limit", () => {
  it("rejects the request after the per-minute budget without calling Gemini", async () => {
    const fetchSpy = stubGemini();

    for (let i = 0; i < perMinute; i++) expect((await from("1.1.1.1")).status).toBe(200);
    const res = await from("1.1.1.1");
    const body = (await res.json()) as CheckErrorResponse;

    expect(res.status).toBe(429);
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
    expect(res.headers.get("Retry-After")).toBe(String(body.retryAfterSeconds));
    expect(fetchSpy).toHaveBeenCalledTimes(perMinute);
  });

  it("counts each IP separately", async () => {
    stubGemini();

    for (let i = 0; i < perMinute; i++) await from("1.1.1.1");
    expect((await from("2.2.2.2")).status).toBe(200);
  });

  it("uses the first address in a forwarded chain", async () => {
    stubGemini();

    for (let i = 0; i < perMinute; i++) await from("3.3.3.3, 10.0.0.1");
    expect((await from("3.3.3.3, 10.0.0.2")).status).toBe(429);
  });
});

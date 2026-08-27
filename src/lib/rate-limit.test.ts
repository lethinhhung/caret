import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

const MINUTE = 60_000;

function limiter(rules = [{ windowMs: MINUTE, max: 3 }]) {
  let now = 0;
  const limit = createRateLimiter(rules, () => now);
  return { limit, advance: (ms: number) => (now += ms) };
}

describe("createRateLimiter", () => {
  it("allows requests up to the maximum", () => {
    const { limit } = limiter();
    expect(limit.hit("a")).toEqual({ ok: true });
    expect(limit.hit("a")).toEqual({ ok: true });
    expect(limit.hit("a")).toEqual({ ok: true });
  });

  it("blocks the request past the maximum with a retry hint", () => {
    const { limit, advance } = limiter();
    for (let i = 0; i < 3; i++) limit.hit("a");
    advance(15_000);
    expect(limit.hit("a")).toEqual({ ok: false, retryAfterSeconds: 45 });
  });

  it("keeps keys independent", () => {
    const { limit } = limiter();
    for (let i = 0; i < 3; i++) limit.hit("a");
    expect(limit.hit("b")).toEqual({ ok: true });
  });

  it("opens a fresh window once the old one expires", () => {
    const { limit, advance } = limiter();
    for (let i = 0; i < 3; i++) limit.hit("a");
    advance(MINUTE);
    expect(limit.hit("a")).toEqual({ ok: true });
  });

  it("applies the longest retry when several rules are exhausted", () => {
    const { limit } = limiter([
      { windowMs: MINUTE, max: 1 },
      { windowMs: 24 * 60 * MINUTE, max: 1 },
    ]);
    limit.hit("a");
    expect(limit.hit("a")).toEqual({ ok: false, retryAfterSeconds: 24 * 60 * 60 });
  });

  it("does not charge a blocked request against the other rules", () => {
    const { limit, advance } = limiter([
      { windowMs: MINUTE, max: 1 },
      { windowMs: 3 * MINUTE, max: 2 },
    ]);
    limit.hit("a");
    limit.hit("a"); // blocked by the minute rule
    advance(MINUTE);
    expect(limit.hit("a")).toEqual({ ok: true }); // 2nd of 2 in the long window
  });

  it("forgets everything on reset", () => {
    const { limit } = limiter();
    for (let i = 0; i < 3; i++) limit.hit("a");
    limit.reset();
    expect(limit.hit("a")).toEqual({ ok: true });
  });
});

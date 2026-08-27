import { createRateLimiter } from "@/lib/rate-limit";

/**
 * The route's per-caller budget, and how a caller is identified.
 *
 * The numbers sit under the Gemini free tier (15 RPM / 500 RPD) so that one
 * writer cannot drain the quota everyone shares.
 */

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const RATE_LIMITS = [
  { windowMs: MINUTE, max: 10 },
  { windowMs: DAY, max: 100 },
];

export const checkLimiter = createRateLimiter(RATE_LIMITS);

/** Best-effort caller identity from the proxy headers, or "unknown". */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip")?.trim() || "unknown";
}

import type {
  CheckErrorResponse,
  CheckRequest,
  CheckResponse,
} from "./types";

const GENERIC_FAILURE = "Something went wrong. Try again.";
const UNREACHABLE =
  "Could not reach the grammar service. Check your connection and try again.";

export type CheckAttempt =
  | { ok: true; result: CheckResponse }
  /** `message` is null when the caller aborted: nothing to tell the writer. */
  | { ok: false; message: string | null };

/**
 * One round trip to the check route, with every way it can go turned into a
 * value. Nothing here throws, so the caller has no failure path to forget.
 */
export async function requestCheck(
  body: CheckRequest,
  signal: AbortSignal,
): Promise<CheckAttempt> {
  try {
    const response = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

    const payload: unknown = await response.json();

    if (!response.ok) {
      const { error } = (payload ?? {}) as CheckErrorResponse;
      return { ok: false, message: error || GENERIC_FAILURE };
    }
    return { ok: true, result: payload as CheckResponse };
  } catch (cause) {
    const aborted = cause instanceof DOMException && cause.name === "AbortError";
    return { ok: false, message: aborted ? null : UNREACHABLE };
  }
}

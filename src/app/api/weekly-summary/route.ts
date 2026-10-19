import { timingSafeEqual } from "node:crypto";
import { summarizeWeeklyActivities } from "@/lib/weekly-summary";

export const runtime = "nodejs";

function authorized(request: Request) {
  const expected = process.env.WEEKLY_SUMMARY_TOKEN;
  const header = request.headers.get("authorization");
  if (!expected || !header?.startsWith("Bearer ")) return false;
  const actual = Buffer.from(header.slice(7));
  const secret = Buffer.from(expected);
  return actual.length === secret.length && timingSafeEqual(actual, secret);
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (typeof body !== "object" || body === null) return Response.json({ error: "Invalid request." }, { status: 400 });
  const { period, entries } = body as { period?: unknown; entries?: unknown };
  if (typeof period !== "string" || !/^week of \d{4}-\d{2}-\d{2}$/.test(period)) {
    return Response.json({ error: "Invalid period." }, { status: 400 });
  }
  if (!Array.isArray(entries) || !entries.length || entries.length > 250 || entries.some((entry) => typeof entry !== "string")) {
    return Response.json({ error: "Invalid activities." }, { status: 400 });
  }
  const rows = entries as string[];
  if (rows.some((entry) => entry.length > 8_000) || rows.reduce((size, entry) => size + entry.length, 0) > 50_000) {
    return Response.json({ error: "Activities are too large." }, { status: 413 });
  }
  try {
    const summary = await summarizeWeeklyActivities(period, rows);
    return Response.json({ summary }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Weekly activity summarization failed.");
    return Response.json({ error: "Weekly summarization is unavailable." }, { status: 502 });
  }
}

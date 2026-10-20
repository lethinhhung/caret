const MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-3.1-flash-lite";

function formatSummary(value: string) {
  const bullets: string[] = [];
  for (const line of value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    if (/^(summary|key activities):?$/i.test(line)) continue;
    const bullet = /^(?:[-*•]|\d+[.)])\s+/.test(line);
    const text = line.replace(/^(?:[-*•]|\d+[.)])\s+/, "");
    if (bullet && bullets.length < 3) bullets.push(text);
    else if (bullets.length && !bullet) bullets[bullets.length - 1] += ` ${text}`;
    else if (!bullets.length && !bullet) bullets.push(text);
  }
  return bullets.slice(0, 3).map((line) => {
    const text = line.length <= 220 ? line : `${line.slice(0, 219).replace(/\s+\S*$/, "")}…`;
    return `• ${text}`;
  }).join("\n");
}

export async function summarizeWeeklyActivities(period: string, entries: string[]) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini is not configured.");
  const prompt = `Summarize these GitHub activities for ${period} in at most 3 short bullet points focused on actions and outcomes. Keep each bullet under 220 characters. Use **bold** for key outcomes, *italics* for project names or themes, and ++underline++ for one standout result when useful. Omit dates, time ranges, headings, and HTML. Use only supplied facts; do not invent or infer.\n\n${entries.join("\n")}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Gemini request failed (${response.status}).`);
  const payload = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  const summary = text ? formatSummary(text) : "";
  if (!summary) throw new Error("Gemini returned an unusable summary.");
  return summary;
}

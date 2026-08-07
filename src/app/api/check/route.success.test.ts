import { describe, expect, it, vi } from "vitest";
import { geminiOk, post, stubApiKey } from "./route.fixtures";
import type { CheckResponse } from "@/lib/types";

stubApiKey();

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
});

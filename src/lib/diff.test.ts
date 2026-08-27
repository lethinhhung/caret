import { describe, expect, it } from "vitest";
import { diffFromErrors } from "./diff";
import { errorId } from "./errors";
import type { GrammarError } from "./types";

const content = "I have went too the store.";
const WENT: GrammarError = {
  original: "went",
  suggestion: "gone",
  category: "grammar",
  explanation: "Past participle.",
  start: 7,
  end: 11,
};
const TOO: GrammarError = {
  original: "too",
  suggestion: "to",
  category: "spelling",
  explanation: "Wrong word.",
  start: 12,
  end: 15,
};

const render = (parts: ReturnType<typeof diffFromErrors>, side: "delete" | "insert") =>
  parts
    .filter((p) => p.op === side || p.op === "equal")
    .map((p) => p.text)
    .join("");

describe("diffFromErrors", () => {
  it("is all equal when there are no errors", () => {
    expect(diffFromErrors(content, [])).toEqual([{ op: "equal", text: content }]);
  });

  it("emits a delete/insert pair carrying the error for each applied fix", () => {
    const parts = diffFromErrors(content, [WENT, TOO]);
    expect(parts).toEqual([
      { op: "equal", text: "I have " },
      { op: "delete", text: "went", error: WENT },
      { op: "insert", text: "gone", error: WENT },
      { op: "equal", text: " " },
      { op: "delete", text: "too", error: TOO },
      { op: "insert", text: "to", error: TOO },
      { op: "equal", text: " the store." },
    ]);
  });

  it("reconstructs both sides exactly", () => {
    const parts = diffFromErrors(content, [WENT, TOO]);
    expect(render(parts, "delete")).toBe(content);
    expect(render(parts, "insert")).toBe("I have gone to the store.");
  });

  it("treats an unapplied fix as unchanged text", () => {
    const parts = diffFromErrors(content, [WENT, TOO], new Set([errorId(TOO)]));
    expect(parts).toEqual([
      { op: "equal", text: "I have went " },
      { op: "delete", text: "too", error: TOO },
      { op: "insert", text: "to", error: TOO },
      { op: "equal", text: " the store." },
    ]);
  });

  it("omits the insert for a deletion fix", () => {
    const dup: GrammarError = { ...WENT, original: "went ", suggestion: "", end: 12 };
    const parts = diffFromErrors(content, [dup]);
    expect(parts.filter((p) => p.op === "insert")).toEqual([]);
    expect(render(parts, "insert")).toBe("I have too the store.");
  });
});

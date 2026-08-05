import { describe, expect, it } from "vitest";
import { diffWords } from "./diff";

const render = (parts: ReturnType<typeof diffWords>, op: string) =>
  parts
    .filter((p) => p.op === op || p.op === "equal")
    .map((p) => p.text)
    .join("");

describe("diffWords", () => {
  it("marks everything equal for identical input", () => {
    const parts = diffWords("the cat sat", "the cat sat");
    expect(parts).toEqual([{ op: "equal", text: "the cat sat" }]);
  });

  it("detects a single word replacement", () => {
    const parts = diffWords("I have went there", "I have gone there");
    expect(parts.filter((p) => p.op === "delete").map((p) => p.text)).toEqual(["went"]);
    expect(parts.filter((p) => p.op === "insert").map((p) => p.text)).toEqual(["gone"]);
  });

  it("reconstructs both sides exactly", () => {
    const before = "I have went too the stor.";
    const after = "I have gone to the store.";
    const parts = diffWords(before, after);

    expect(render(parts, "delete")).toBe(before);
    expect(render(parts, "insert")).toBe(after);
  });

  it("detects a pure insertion", () => {
    const parts = diffWords("cat sat", "the cat sat");
    expect(parts.filter((p) => p.op === "delete")).toEqual([]);
    expect(render(parts, "insert")).toBe("the cat sat");
  });

  it("detects a pure deletion", () => {
    const parts = diffWords("the the cat", "the cat");
    expect(parts.filter((p) => p.op === "insert")).toEqual([]);
    expect(render(parts, "delete")).toBe("the the cat");
  });

  it("coalesces adjacent changes of the same kind", () => {
    const parts = diffWords("one two three four", "one alpha beta four");
    expect(parts.filter((p) => p.op === "delete")).toHaveLength(1);
    expect(parts.filter((p) => p.op === "insert")).toHaveLength(1);
  });

  it("handles empty inputs", () => {
    expect(diffWords("", "")).toEqual([]);
    expect(diffWords("", "new")).toEqual([{ op: "insert", text: "new" }]);
    expect(diffWords("old", "")).toEqual([{ op: "delete", text: "old" }]);
  });

  it("always reconstructs both sides exactly, across varied edits", () => {
    const cases: [string, string][] = [
      ["one two three four", "one alpha beta four"],
      ["a b c d e", "a x c y e"],
      ["the quick brown fox", "the slow brown fox jumps"],
      ["remove these words entirely", "remove entirely"],
      ["", "everything is new here"],
      ["nothing survives this edit", ""],
      ["  leading space", "leading space"],
      ["trailing space  ", "trailing space"],
      ["Hello, wrold!", "Hello, world!"],
      ["I has went too the stor", "I have gone to the store"],
      ["same same same", "same same same"],
      ["tabs\tand\nnewlines", "tabs\tor\nnewlines"],
    ];

    for (const [before, after] of cases) {
      const parts = diffWords(before, after);
      expect(render(parts, "delete"), `before: ${JSON.stringify(before)}`).toBe(before);
      expect(render(parts, "insert"), `after: ${JSON.stringify(after)}`).toBe(after);
    }
  });

  it("preserves newlines so multi-paragraph text survives a round trip", () => {
    const before = "First line.\n\nSecond lin.";
    const after = "First line.\n\nSecond line.";
    const parts = diffWords(before, after);

    expect(render(parts, "delete")).toBe(before);
    expect(render(parts, "insert")).toBe(after);
  });
});

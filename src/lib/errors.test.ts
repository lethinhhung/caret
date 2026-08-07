import { describe, expect, it } from "vitest";
import { applyFixes, errorId, segmentContent } from "./errors";
import { reconcileErrors } from "./reconcile";
import { raw } from "./errors.fixtures";

// Fixtures go through `reconcileErrors` so they carry the sorted,
// non-overlapping guarantee both functions under test rely on.

describe("applyFixes", () => {
  const content = "I have went too the stor.";
  const errors = reconcileErrors(content, [
    raw({ original: "went", suggestion: "gone", start: 7 }),
    raw({ original: "too", suggestion: "to", category: "spelling", start: 12 }),
    raw({ original: "stor", suggestion: "store", category: "spelling", start: 20 }),
  ]);

  it("applies every fix when no subset is given", () => {
    expect(applyFixes(content, errors)).toBe("I have gone to the store.");
  });

  it("applies only the selected fix", () => {
    const only = new Set([errorId(errors[0])]);
    expect(applyFixes(content, errors, only)).toBe("I have gone too the stor.");
  });

  it("returns the original text when nothing is applied", () => {
    expect(applyFixes(content, errors, new Set())).toBe(content);
  });

  it("handles a deletion suggestion", () => {
    const text = "This is is fine.";
    const parsed = reconcileErrors(text, [
      raw({ original: " is", suggestion: "", start: 7 }),
    ]);
    expect(applyFixes(text, parsed)).toBe("This is fine.");
  });

  it("preserves text after the final error", () => {
    const text = "teh end of the line";
    const parsed = reconcileErrors(text, [
      raw({ original: "teh", suggestion: "the", start: 0 }),
    ]);
    expect(applyFixes(text, parsed)).toBe("the end of the line");
  });

  it("is a no-op on an empty error list", () => {
    expect(applyFixes(content, [])).toBe(content);
  });
});

describe("segmentContent", () => {
  it("splits into alternating text and error segments that rejoin to the original", () => {
    const content = "I have went there.";
    const errors = reconcileErrors(content, [
      raw({ original: "went", suggestion: "gone", start: 7 }),
    ]);
    const segments = segmentContent(content, errors);

    expect(segments.map((s) => s.kind)).toEqual(["text", "error", "text"]);
    expect(segments.map((s) => s.text).join("")).toBe(content);
  });

  it("handles an error at the very start", () => {
    const content = "teh cat";
    const errors = reconcileErrors(content, [
      raw({ original: "teh", suggestion: "the", start: 0 }),
    ]);
    const segments = segmentContent(content, errors);

    expect(segments[0].kind).toBe("error");
    expect(segments.map((s) => s.text).join("")).toBe(content);
  });

  it("returns a single text segment when there are no errors", () => {
    expect(segmentContent("all good", [])).toEqual([
      { kind: "text", text: "all good" },
    ]);
  });
});

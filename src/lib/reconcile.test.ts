import { describe, expect, it } from "vitest";
import { reconcileErrors } from "./reconcile";
import { raw } from "./errors.fixtures";

describe("reconcileErrors", () => {
  it("keeps an error whose offsets already match the text", () => {
    const content = "I have went to the store.";
    const [error] = reconcileErrors(content, [
      raw({ original: "went", suggestion: "gone", start: 7, end: 11 }),
    ]);

    expect(error).toMatchObject({ original: "went", start: 7, end: 11 });
    expect(content.slice(error.start, error.end)).toBe("went");
  });

  it("repairs offsets that drifted", () => {
    const content = "I have went to the store.";
    // The model claims offset 3, but "went" actually starts at 7.
    const [error] = reconcileErrors(content, [
      raw({ original: "went", suggestion: "gone", start: 3, end: 7 }),
    ]);

    expect(content.slice(error.start, error.end)).toBe("went");
    expect(error.start).toBe(7);
  });

  it("drops an error whose text is nowhere in the content", () => {
    const content = "This sentence is fine.";
    expect(
      reconcileErrors(content, [raw({ original: "nonexistent", start: 0 })]),
    ).toEqual([]);
  });

  it("anchors a repeated word to the occurrence nearest the model's guess", () => {
    const content = "the cat sat on the the mat";
    // The duplicate "the" is the one at index 19.
    const [error] = reconcileErrors(content, [
      raw({ original: "the the", suggestion: "the", start: 15, end: 22 }),
    ]);

    expect(content.slice(error.start, error.end)).toBe("the the");
    expect(error.start).toBe(15);
  });

  it("gives each duplicate error its own occurrence instead of stacking them", () => {
    const content = "teh quick brown teh fox";
    const errors = reconcileErrors(content, [
      raw({ original: "teh", suggestion: "the", start: 0, end: 3 }),
      raw({ original: "teh", suggestion: "the", start: 16, end: 19 }),
    ]);

    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.start)).toEqual([0, 16]);
  });

  it("drops overlapping errors rather than corrupting the text", () => {
    const content = "I could of gone there.";
    const errors = reconcileErrors(content, [
      raw({ original: "could of", suggestion: "could have", start: 2, end: 10 }),
      raw({ original: "of", suggestion: "have", start: 8, end: 10 }),
    ]);

    expect(errors).toHaveLength(1);
    expect(errors[0].original).toBe("could of");
  });

  it("drops no-op suggestions", () => {
    const content = "Nothing to fix here.";
    expect(
      reconcileErrors(content, [
        raw({ original: "Nothing", suggestion: "Nothing", start: 0 }),
      ]),
    ).toEqual([]);
  });

  it("drops entries with an unknown category", () => {
    const content = "Some text here.";
    expect(
      reconcileErrors(content, [
        raw({ original: "Some", suggestion: "The", category: "vibes", start: 0 }),
      ]),
    ).toEqual([]);
  });

  it("drops entries with an empty original, which cannot be located", () => {
    const content = "Some text here.";
    expect(
      reconcileErrors(content, [raw({ original: "", suggestion: ",", start: 4 })]),
    ).toEqual([]);
  });

  it("survives malformed input without throwing", () => {
    expect(reconcileErrors("text", null)).toEqual([]);
    expect(reconcileErrors("text", "not an array")).toEqual([]);
    expect(reconcileErrors("text", [null, 42, { nope: true }])).toEqual([]);
  });

  it("returns errors sorted by position", () => {
    const content = "alpha beta gamma";
    const errors = reconcileErrors(content, [
      raw({ original: "gamma", suggestion: "delta", start: 11 }),
      raw({ original: "alpha", suggestion: "omega", start: 0 }),
    ]);

    expect(errors.map((e) => e.original)).toEqual(["alpha", "gamma"]);
  });
});

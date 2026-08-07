import { describe, expect, it } from "vitest";
import { MAX_ENTRIES, add, parse, serialize } from "./history";
import { entry, file } from "./history.fixtures";

describe("parse", () => {
  it("reads back what serialize wrote", () => {
    const entries = [entry(), entry()];
    expect(parse(serialize(entries))).toEqual(entries);
  });

  it("is empty when there is nothing stored", () => {
    expect(parse(null)).toEqual([]);
  });

  it("is empty when the stored value is not JSON", () => {
    expect(parse("{not json")).toEqual([]);
  });

  it("is empty when the version is one we do not know", () => {
    expect(parse(file([entry()], 99))).toEqual([]);
  });

  it("keeps the sound entries in a file that also holds a malformed one", () => {
    const sound = entry();
    const raw = JSON.stringify({
      version: 1,
      entries: [{ id: "bad", createdAt: "yesterday" }, sound],
    });

    expect(parse(raw)).toEqual([sound]);
  });

  it("drops an entry whose errors are not error-shaped", () => {
    const raw = file([{ ...entry(), errors: [{ original: "went" }] } as never]);
    expect(parse(raw)).toEqual([]);
  });
});

describe("add", () => {
  it("puts the newest entry first", () => {
    const older = entry();
    const newer = entry();

    expect(add([older], newer)).toEqual([newer, older]);
  });

  it("drops the oldest entry once the cap is reached", () => {
    const full = Array.from({ length: MAX_ENTRIES }, () => entry());
    const newer = entry();

    const result = add(full, newer);

    expect(result).toHaveLength(MAX_ENTRIES);
    expect(result[0]).toEqual(newer);
    expect(result).not.toContain(full[MAX_ENTRIES - 1]);
  });

  it("replaces an earlier check of the same text and context", () => {
    const first = entry({ content: "Same text.", context: "an email" });
    const second = entry({ content: "Same text.", context: "an email" });

    expect(add([entry(), first], second)).toEqual([second, expect.anything()]);
  });

  it("keeps the same text checked under a different context", () => {
    const first = entry({ content: "Same text.", context: "an email" });
    const second = entry({ content: "Same text.", context: "a tweet" });

    expect(add([first], second)).toEqual([second, first]);
  });

  it("treats an absent context and an empty one as the same", () => {
    const first = entry({ content: "Same text.", context: "" });
    const second = entry({ content: "Same text." });

    expect(add([first], second)).toEqual([second]);
  });
});

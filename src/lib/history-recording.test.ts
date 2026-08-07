import { describe, expect, it, vi } from "vitest";
import { historyHarness } from "./history-store.fixtures";
import { check } from "./history.fixtures";

const mount = historyHarness();

/** Every test here starts from a device that has opted in. */
function enabled() {
  const store = mount();
  store.setEnabled(true);
  return store;
}

describe("recording a check", () => {
  it("stores it under an id and persists it", () => {
    const store = enabled();

    const id = store.record(check("I have went there."));

    expect(id).toEqual(expect.any(String));
    expect(store.getSnapshot().entries[0]).toMatchObject({
      id,
      content: "I have went there.",
      accepted: ["7-11-gone"],
    });
    expect(localStorage.getItem("history")).toContain("I have went there.");
  });

  it("keeps a stored check's accepted fixes current", () => {
    const store = enabled();
    const id = store.record(check())!;

    store.updateAccepted(id, []);

    expect(store.getSnapshot().entries[0].accepted).toEqual([]);
  });

  it("ignores an update for an entry that is no longer there", () => {
    const store = enabled();
    store.record(check());

    store.updateAccepted("gone", []);

    expect(store.getSnapshot().entries[0].accepted).toEqual(["7-11-gone"]);
  });

  it("removes one entry without touching the others", () => {
    const store = enabled();
    const kept = store.record(check("Keep this."));
    const doomed = store.record(check("Not this."))!;

    store.remove(doomed);

    expect(store.getSnapshot().entries.map((it) => it.id)).toEqual([kept]);
  });

  it("clears every entry but leaves the switch on", () => {
    const store = enabled();
    store.record(check());

    store.clear();

    expect(store.getSnapshot()).toEqual({ enabled: true, entries: [] });
  });
});

describe("full storage", () => {
  it("sheds the oldest entries and retries once", () => {
    const store = enabled();
    for (let i = 0; i < 4; i += 1) store.record(check(`Text ${i}.`));

    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    store.record(check("One more."));

    const { entries } = store.getSnapshot();
    expect(entries).toHaveLength(3);
    expect(entries[0].content).toBe("One more.");
  });

  it("keeps what is on screen when the write cannot land at all", () => {
    const store = enabled();
    store.record(check("Already there."));

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    store.record(check("Never lands."));

    expect(store.getSnapshot().entries.map((it) => it.content)).toEqual([
      "Already there.",
    ]);
  });
});

import { describe, expect, it, vi } from "vitest";
import { historyHarness } from "./history-store.fixtures";
import { check, entry, file } from "./history.fixtures";

const mount = historyHarness();

describe("the history store", () => {
  it("renders empty on the server whatever is on the device", () => {
    localStorage.setItem("history-enabled", "true");
    localStorage.setItem("history", file([entry()]));

    expect(mount().getServerSnapshot()).toEqual({ enabled: false, entries: [] });
  });

  it("starts off, with nothing stored", () => {
    expect(mount().getSnapshot()).toEqual({ enabled: false, entries: [] });
  });

  it("hands back the same snapshot until something changes", () => {
    const store = mount();
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it("loads what an earlier session stored", () => {
    const stored = entry();
    localStorage.setItem("history-enabled", "true");
    localStorage.setItem("history", file([stored]));

    expect(mount().getSnapshot()).toEqual({ enabled: true, entries: [stored] });
  });

  it("ignores stored entries while the switch is off", () => {
    localStorage.setItem("history", file([entry()]));

    expect(mount().getSnapshot().entries).toEqual([]);
  });
});

describe("the switch", () => {
  it("records nothing while history is off", () => {
    const store = mount();

    expect(store.record(check())).toBeNull();
    expect(store.getSnapshot().entries).toEqual([]);
    expect(localStorage.getItem("history")).toBeNull();
  });

  it("persists being turned on", () => {
    const store = mount();
    store.setEnabled(true);

    expect(store.getSnapshot().enabled).toBe(true);
    expect(localStorage.getItem("history-enabled")).toBe("true");
  });

  it("deletes every entry when it is turned off", () => {
    const store = mount();
    store.setEnabled(true);
    store.record(check());

    store.setEnabled(false);

    expect(store.getSnapshot()).toEqual({ enabled: false, entries: [] });
    expect(localStorage.getItem("history")).toBeNull();
  });

  it("stays off when storage refuses to keep the flag", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("blocked");
    });
    const store = mount();

    store.setEnabled(true);

    expect(store.getSnapshot()).toEqual({ enabled: false, entries: [] });
  });
});

describe("another tab", () => {
  it("updates the snapshot when it writes history", () => {
    const store = mount();
    expect(store.getSnapshot().entries).toEqual([]);

    const stored = entry();
    localStorage.setItem("history-enabled", "true");
    localStorage.setItem("history", file([stored]));
    window.dispatchEvent(new StorageEvent("storage"));

    expect(store.getSnapshot()).toEqual({ enabled: true, entries: [stored] });
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryPanel } from "./history-panel";
import { entry, file } from "@/lib/history.fixtures";

beforeEach(() => {
  localStorage.clear();
});

/** Renders the header trigger and opens the slide-over, as a visitor would. */
async function openPanel() {
  const user = userEvent.setup();
  render(<HistoryPanel />);
  await user.click(screen.getByRole("button", { name: /^History/ }));
  return user;
}

const theSwitch = () => screen.getByRole("switch", { name: "Save my checks" });

describe("the history panel", () => {
  it("opens from the header with the switch off on a first visit", async () => {
    await openPanel();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(theSwitch()).not.toBeChecked();
  });

  it("explains what would be saved before anything is", async () => {
    await openPanel();

    expect(screen.getByText(/in this browser, on this device/)).toBeInTheDocument();
  });

  it("writes nothing to storage while it is off", async () => {
    const user = await openPanel();
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(localStorage.length).toBe(0);
  });

  it("persists the switch being turned on", async () => {
    const user = await openPanel();

    await user.click(theSwitch());

    expect(theSwitch()).toBeChecked();
    expect(localStorage.getItem("history-enabled")).toBe("true");
  });

  it("shows the empty state once it is on with nothing recorded", async () => {
    const user = await openPanel();

    await user.click(theSwitch());

    expect(screen.getByText(/No checks yet/)).toBeInTheDocument();
  });
});

describe("turning history off", () => {
  beforeEach(() => {
    localStorage.setItem("history-enabled", "true");
    localStorage.setItem("history", file([entry(), entry()]));
  });

  it("asks before deleting, and deletes nothing until answered", async () => {
    const user = await openPanel();

    await user.click(theSwitch());

    expect(screen.getByText(/deletes the 2 checks stored here/)).toBeInTheDocument();
    expect(theSwitch()).toBeChecked();
    expect(localStorage.getItem("history")).not.toBeNull();
  });

  it("purges every entry once confirmed", async () => {
    const user = await openPanel();
    await user.click(theSwitch());

    await user.click(screen.getByRole("button", { name: "Delete and turn off" }));

    expect(theSwitch()).not.toBeChecked();
    expect(localStorage.getItem("history")).toBeNull();
    expect(localStorage.getItem("history-enabled")).toBe("false");
  });

  it("leaves everything alone when the writer backs out", async () => {
    const user = await openPanel();
    await user.click(theSwitch());

    await user.click(screen.getByRole("button", { name: "Keep history" }));

    expect(theSwitch()).toBeChecked();
    expect(localStorage.getItem("history")).not.toBeNull();
  });
});

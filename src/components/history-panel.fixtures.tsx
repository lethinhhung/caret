import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryPanel } from "./history-panel";
import type { HistoryEntry } from "@/lib/history";
import { file } from "@/lib/history.fixtures";

/** Just the header trigger. An open sheet hides it, so count it from here. */
export function renderPanel() {
  const user = userEvent.setup();
  const onRestore = vi.fn();

  render(<HistoryPanel onRestore={onRestore} />);

  return { user, onRestore };
}

/** Opens the slide-over, as a visitor would. */
export async function openPanel() {
  const rendered = renderPanel();
  await rendered.user.click(screen.getByRole("button", { name: /^History/ }));

  return rendered;
}

/** A device that opted in some time ago and has `entries` on it. */
export function storedHistory(entries: HistoryEntry[]) {
  localStorage.setItem("history-enabled", "true");
  localStorage.setItem("history", file(entries));
}

export const theSwitch = () =>
  screen.getByRole("switch", { name: "Save my checks" });

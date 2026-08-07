import { beforeEach, describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { openPanel, renderPanel, storedHistory } from "./history-panel.fixtures";
import { parse } from "@/lib/history";
import { entry } from "@/lib/history.fixtures";

const NEWER = entry({ content: "The newer check." });
const OLDER = entry({ content: "The older check.", errors: [], accepted: [] });

const stored = () => parse(localStorage.getItem("history"));
const rows = () => screen.getAllByRole("listitem");

beforeEach(() => {
  localStorage.clear();
  storedHistory([NEWER, OLDER]);
});

describe("the list of stored checks", () => {
  it("counts them on the header trigger", () => {
    renderPanel();

    expect(screen.getByRole("button", { name: "History 2" })).toBeInTheDocument();
  });

  it("lists them newest first, with how each one went", async () => {
    await openPanel();

    expect(within(rows()[0]).getByText("The newer check.")).toBeInTheDocument();
    expect(within(rows()[0]).getByText(/1 issue$/)).toBeInTheDocument();
    expect(within(rows()[1]).getByText(/No issues$/)).toBeInTheDocument();
  });

  it("hands a check back to the page and closes itself", async () => {
    const { user, onRestore } = await openPanel();

    await user.click(screen.getByRole("button", { name: /The newer check\./ }));

    expect(onRestore).toHaveBeenCalledWith(NEWER);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deletes one check without touching the others", async () => {
    const { user } = await openPanel();

    await user.click(
      within(rows()[0]).getByRole("button", { name: "Delete this check" }),
    );

    expect(stored()).toEqual([OLDER]);
    expect(screen.queryByText("The newer check.")).not.toBeInTheDocument();
  });

  it("clears every check but leaves the switch on", async () => {
    const { user } = await openPanel();

    await user.click(screen.getByRole("button", { name: "Clear all" }));

    expect(stored()).toEqual([]);
    expect(screen.getByText(/No checks yet/)).toBeInTheDocument();
    expect(localStorage.getItem("history-enabled")).toBe("true");
  });
});

import { describe, expect, it } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { ALL_CLEAR, WITH_ERRORS, check, contentBox } from "./page.fixtures";

describe("Home — results with errors", () => {
  it("reports how many issues were found", async () => {
    await check("I have went there.", WITH_ERRORS);
    expect(await screen.findByText("1 issue found")).toBeInTheDocument();
  });

  it("arrives with every fix applied", async () => {
    await check("I have went there.", WITH_ERRORS);
    expect(await screen.findByText("1 of 1 applied")).toBeInTheDocument();
  });

  it("shows the corrected text on the Corrected tab", async () => {
    const { user } = await check("I have went there.", WITH_ERRORS);

    await user.click(await screen.findByRole("tab", { name: "Corrected" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("I have gone there.");
  });

  it("puts the original back when a fix is reverted", async () => {
    const { user } = await check("I have went there.", WITH_ERRORS);

    await user.click(await screen.findByRole("button", { name: /Grammar fix applied/i }));
    await user.click(await screen.findByRole("button", { name: /Revert this fix/i }));

    expect(await screen.findByText("0 of 1 applied")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Corrected" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("I have went there.");
  });

  it("reverts and re-applies everything from the card", async () => {
    const { user } = await check("I have went there.", WITH_ERRORS);

    await user.click(await screen.findByRole("button", { name: /Revert all/i }));
    expect(await screen.findByText("0 of 1 applied")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Apply all/i }));
    expect(await screen.findByText("1 of 1 applied")).toBeInTheDocument();
  });

  it("shows the change on the Diff tab", async () => {
    const { user } = await check("I have went there.", WITH_ERRORS);

    await user.click(await screen.findByRole("tab", { name: "Diff" }));
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("went")).toBeInTheDocument();
    expect(within(panel).getByText("gone")).toBeInTheDocument();
  });

  it("copies the corrected text", async () => {
    const { user } = await check("I have went there.", WITH_ERRORS);

    await user.click(await screen.findByRole("button", { name: /Copy corrected/i }));

    expect(await navigator.clipboard.readText()).toBe("I have gone there.");
    expect(await screen.findByRole("button", { name: /Copied/i })).toBeInTheDocument();
  });

  it("warns when the text was edited after the check", async () => {
    await check("I have went there.", WITH_ERRORS);
    await screen.findByText("1 issue found");

    fireEvent.change(contentBox(), { target: { value: "I have went there. More." } });

    expect(await screen.findByText(/edited the text since this check/)).toBeInTheDocument();
  });
});

describe("Home — results without errors", () => {
  it("celebrates clean text and offers the variants", async () => {
    await check("The report is attached.", ALL_CLEAR);

    expect(await screen.findByText("Looks good")).toBeInTheDocument();
    expect(
      screen.getByText("Please find the report attached."),
    ).toBeInTheDocument();
  });

  it("does not show the results tabs when there is nothing to fix", async () => {
    await check("The report is attached.", ALL_CLEAR);
    await screen.findByText("Looks good");

    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });
});

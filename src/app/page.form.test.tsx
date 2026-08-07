import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";
import { ALL_CLEAR, check, checkButton, contentBox, mockCheck } from "./page.fixtures";
import { MAX_CONTENT_LENGTH } from "@/lib/types";

describe("Home — the check form", () => {
  it("keeps Check disabled until there is something to check", async () => {
    render(<Home />);
    expect(checkButton()).toBeDisabled();

    fireEvent.change(contentBox(), { target: { value: "Some text." } });
    expect(checkButton()).toBeEnabled();
  });

  it("treats whitespace as empty", () => {
    render(<Home />);
    fireEvent.change(contentBox(), { target: { value: "   \n  " } });
    expect(checkButton()).toBeDisabled();
  });

  it("blocks the check when the text is over the limit and says why", () => {
    render(<Home />);
    fireEvent.change(contentBox(), {
      target: { value: "a".repeat(MAX_CONTENT_LENGTH + 1) },
    });

    expect(checkButton()).toBeDisabled();
    expect(contentBox()).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/trim it before checking/)).toBeInTheDocument();
  });

  it("runs the check on Ctrl+Enter without clicking", async () => {
    const fetchSpy = mockCheck(ALL_CLEAR);
    render(<Home />);
    fireEvent.change(contentBox(), { target: { value: "The report is attached." } });

    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
  });

  it("sends the optional context along with the text", async () => {
    const user = userEvent.setup();
    const fetchSpy = mockCheck(ALL_CLEAR);
    render(<Home />);

    fireEvent.change(screen.getByLabelText(/^Context/), {
      target: { value: "formal email" },
    });
    fireEvent.change(contentBox(), { target: { value: "The report is attached." } });
    await user.click(checkButton());

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toEqual({
      content: "The report is attached.",
      context: "formal email",
    });
  });

  it("omits an empty context rather than sending a blank string", async () => {
    const { fetchSpy } = await check("The report is attached.", ALL_CLEAR);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).not.toHaveProperty(
      "context",
    );
  });
});

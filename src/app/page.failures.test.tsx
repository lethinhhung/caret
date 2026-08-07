import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";
import { WITH_ERRORS, check, checkButton, contentBox } from "./page.fixtures";

describe("Home — failures", () => {
  it("shows the server's message, announces it, and offers a retry", async () => {
    await check("I have went there.", { error: "The free tier is rate limited." }, 429);

    expect(await screen.findByText("That check did not go through")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "The free tier is rate limited.",
    );
    expect(screen.getByRole("button", { name: /Try again/i })).toBeEnabled();
  });

  it("explains a network failure in plain language", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    render(<Home />);

    fireEvent.change(contentBox(), { target: { value: "Some text." } });
    await user.click(checkButton());

    expect(await screen.findByText("That check did not go through")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      /Could not reach the grammar service/,
    );
  });

  it("recovers on a successful retry", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Busy." }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(WITH_ERRORS), { status: 200 }));

    render(<Home />);
    fireEvent.change(contentBox(), { target: { value: "I have went there." } });
    await user.click(checkButton());

    await user.click(await screen.findByRole("button", { name: /Try again/i }));

    expect(await screen.findByText("1 issue found")).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

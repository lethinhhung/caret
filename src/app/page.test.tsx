import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";
import { MAX_CONTENT_LENGTH, type CheckResponse } from "@/lib/types";

const WITH_ERRORS: CheckResponse = {
  status: "has_errors",
  corrected: "I have gone there.",
  errors: [
    {
      original: "went",
      suggestion: "gone",
      category: "grammar",
      explanation: "Use the past participle after 'have'.",
      start: 7,
      end: 11,
    },
  ],
};

const ALL_CLEAR: CheckResponse = {
  status: "correct",
  corrected: "The report is attached.",
  errors: [],
  improvements: ["Please find the report attached."],
};

function mockCheck(body: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const contentBox = () => screen.getByLabelText("Your text");
const checkButton = () => screen.getByRole("button", { name: /^Check$/ });

/** Types into the content box and runs a check that resolves to `body`. */
async function check(text: string, body: unknown, status = 200) {
  const user = userEvent.setup();
  const fetchSpy = mockCheck(body, status);
  render(<Home />);
  fireEvent.change(contentBox(), { target: { value: text } });
  await user.click(checkButton());
  return { user, fetchSpy };
}

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

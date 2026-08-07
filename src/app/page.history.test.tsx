import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Home from "./page";
import { WITH_ERRORS, check, contentBox } from "./page.fixtures";
import { parse } from "@/lib/history";

const stored = () => parse(localStorage.getItem("history"));

/** A device where the writer has already turned history on. */
function optIn() {
  localStorage.setItem("history-enabled", "true");
}

beforeEach(() => {
  localStorage.clear();
});

describe("recording a check", () => {
  it("stores the check once history is on", async () => {
    optIn();
    await check("I have went there.", WITH_ERRORS);
    await screen.findByText("1 issue found");

    expect(stored()).toHaveLength(1);
    expect(stored()[0]).toMatchObject({
      content: "I have went there.",
      accepted: ["7-11-gone"],
    });
  });

  it("stores nothing while history is off", async () => {
    await check("I have went there.", WITH_ERRORS);
    await screen.findByText("1 issue found");

    expect(localStorage.getItem("history")).toBeNull();
  });

  it("stores nothing when the check does not go through", async () => {
    optIn();
    await check("I have went there.", { error: "Busy." }, 503);
    await screen.findByText("That check did not go through");

    expect(localStorage.getItem("history")).toBeNull();
  });

  it("follows the writer reverting a fix afterwards", async () => {
    optIn();
    const { user } = await check("I have went there.", WITH_ERRORS);
    await user.click(await screen.findByRole("button", { name: /Revert all/i }));

    await waitFor(() => expect(stored()[0].accepted).toEqual([]), {
      timeout: 2000,
    });
  });
});

describe("opening a stored check", () => {
  it("puts the text and its results back on the page", async () => {
    optIn();
    const { user } = await check("I have went there.", WITH_ERRORS);
    await screen.findByText("1 issue found");

    // Move on to something else, then go looking for the old one.
    fireEvent.change(contentBox(), { target: { value: "Something else." } });
    await user.click(screen.getByRole("button", { name: /^History/ }));
    await user.click(
      await screen.findByRole("button", { name: /I have went there\./ }),
    );

    expect(contentBox()).toHaveValue("I have went there.");
    expect(screen.getByText("1 issue found")).toBeInTheDocument();
    expect(screen.queryByText(/edited the text since this check/)).toBeNull();
  });
});

describe("the empty results copy", () => {
  it("promises nothing is stored while history is off", () => {
    render(<Home />);

    expect(screen.getByText(/Nothing you type is stored/)).toBeInTheDocument();
  });

  it("says where checks go once history is on", () => {
    optIn();
    render(<Home />);

    expect(screen.getByText(/saved in this browser/)).toBeInTheDocument();
  });
});

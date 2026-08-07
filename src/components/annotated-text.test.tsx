import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnnotatedText } from "./annotated-text";
import { CONTENT, ERRORS, WENT } from "./annotated-text.fixtures";
import { errorId } from "@/lib/errors";
import type { GrammarError } from "@/lib/types";

function renderAnnotated(applied: string[] = [], onToggle = vi.fn()) {
  render(
    <AnnotatedText
      content={CONTENT}
      errors={ERRORS}
      applied={new Set(applied)}
      onToggle={onToggle}
    />,
  );
  return onToggle;
}

describe("AnnotatedText", () => {
  it("renders one focusable control per error", () => {
    renderAnnotated();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("shows the original text while a fix is unapplied", () => {
    renderAnnotated();
    expect(screen.getByRole("button", { name: /Grammar issue/i })).toHaveTextContent(
      "went",
    );
  });

  it("shows the suggestion in place once the fix is applied", () => {
    renderAnnotated([errorId(WENT)]);
    expect(screen.getByRole("button", { name: /Grammar fix applied/i })).toHaveTextContent(
      "gone",
    );
  });

  it("names each control for screen readers without relying on colour", () => {
    renderAnnotated();
    expect(
      screen.getByRole("button", { name: /Spelling issue: “was'nt”/ }),
    ).toBeInTheDocument();
  });

  it("opens a popover with the reason and the replacement", async () => {
    const user = userEvent.setup();
    renderAnnotated();

    await user.click(screen.getByRole("button", { name: /Grammar issue/i }));

    expect(
      await screen.findByText("Use the past participle after 'have'."),
    ).toBeInTheDocument();
    expect(screen.getByText("Grammar")).toBeInTheDocument();
    expect(screen.getByText("gone")).toBeInTheDocument();
  });

  it("reports the toggled error when the popover action is used", async () => {
    const user = userEvent.setup();
    const onToggle = renderAnnotated();

    await user.click(screen.getByRole("button", { name: /Grammar issue/i }));
    await user.click(await screen.findByRole("button", { name: /Apply this fix/i }));

    expect(onToggle).toHaveBeenCalledWith(errorId(WENT));
  });

  it("offers a revert action for a fix that is already applied", async () => {
    const user = userEvent.setup();
    renderAnnotated([errorId(WENT)]);

    await user.click(screen.getByRole("button", { name: /Grammar fix applied/i }));

    expect(
      await screen.findByRole("button", { name: /Revert this fix/i }),
    ).toBeInTheDocument();
  });

  it("keeps a target for a fix that deletes text", () => {
    const deletion: GrammarError = {
      original: " very",
      suggestion: "",
      category: "style",
      explanation: "Drop the intensifier.",
      start: 0,
      end: 5,
    };
    render(
      <AnnotatedText
        content=" very good"
        errors={[deletion]}
        applied={new Set([errorId(deletion)])}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /Style fix applied/i })).toBeInTheDocument();
  });

  it("reproduces the original text when nothing is applied", () => {
    const { container } = render(
      <AnnotatedText
        content={CONTENT}
        errors={ERRORS}
        applied={new Set()}
        onToggle={vi.fn()}
      />,
    );
    expect(container.textContent).toBe(CONTENT);
  });
});

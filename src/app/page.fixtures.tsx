import { vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";
import type { CheckResponse } from "@/lib/types";

/** Two canned API replies and the shorthand for driving a check with them. */

export const WITH_ERRORS: CheckResponse = {
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

export const ALL_CLEAR: CheckResponse = {
  status: "correct",
  corrected: "The report is attached.",
  errors: [],
  improvements: ["Please find the report attached."],
};

export function mockCheck(body: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

export const contentBox = () => screen.getByLabelText("Your text");
export const checkButton = () => screen.getByRole("button", { name: /^Check$/ });

/** Types into the content box and runs a check that resolves to `body`. */
export async function check(text: string, body: unknown, status = 200) {
  const user = userEvent.setup();
  const fetchSpy = mockCheck(body, status);
  render(<Home />);
  fireEvent.change(contentBox(), { target: { value: text } });
  await user.click(checkButton());
  return { user, fetchSpy };
}

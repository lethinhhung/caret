import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryLegend } from "./category-legend";
import { WASNT, WENT } from "./annotated-text.fixtures";

describe("CategoryLegend", () => {
  it("lists only the categories present, with counts", () => {
    render(<CategoryLegend errors={[WENT, WASNT, { ...WENT, start: 0, end: 1 }]} />);

    expect(screen.getByText("Grammar").parentElement).toHaveTextContent("Grammar 2");
    expect(screen.getByText("Spelling").parentElement).toHaveTextContent("Spelling 1");
    expect(screen.queryByText("Punctuation")).not.toBeInTheDocument();
  });
});

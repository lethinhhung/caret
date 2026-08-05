import type { ErrorCategory } from "./types";

/**
 * Presentation for each error category.
 *
 * Every category carries two independent signals — a colour and an underline
 * style — so the distinction survives colour blindness, greyscale, and low
 * contrast displays. Colour alone never conveys the category.
 */
export interface CategoryStyle {
  label: string;
  /** Highlight applied to an inline span whose fix is not applied. */
  mark: string;
  /** Badge shown in the popover and the legend. */
  badge: string;
  /** Underline treatment on its own, for the legend swatch. */
  rule: string;
}

export const CATEGORY_STYLES: Record<ErrorCategory, CategoryStyle> = {
  grammar: {
    label: "Grammar",
    mark: "bg-grammar-tint decoration-grammar decoration-wavy",
    badge: "bg-grammar-tint text-grammar",
    rule: "decoration-grammar decoration-wavy",
  },
  spelling: {
    label: "Spelling",
    mark: "bg-spelling-tint decoration-spelling decoration-dotted",
    badge: "bg-spelling-tint text-spelling",
    rule: "decoration-spelling decoration-dotted",
  },
  punctuation: {
    label: "Punctuation",
    mark: "bg-punctuation-tint decoration-punctuation decoration-dashed",
    badge: "bg-punctuation-tint text-punctuation",
    rule: "decoration-punctuation decoration-dashed",
  },
  style: {
    label: "Style",
    mark: "bg-style-tint decoration-style decoration-double",
    badge: "bg-style-tint text-style",
    rule: "decoration-style decoration-double",
  },
};

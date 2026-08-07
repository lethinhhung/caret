import { CATEGORY_STYLES } from "@/lib/categories";
import type { GrammarError } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Explains the highlight treatments above the annotated text, listing only the
 * categories actually present so a clean run of spelling fixes is not sitting
 * under a legend for three colours that never appear.
 */
export function CategoryLegend({ errors }: { errors: GrammarError[] }) {
  const present = (Object.keys(CATEGORY_STYLES) as (keyof typeof CATEGORY_STYLES)[]).filter(
    (category) => errors.some((error) => error.category === category),
  );

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {present.map((category) => {
        const style = CATEGORY_STYLES[category];
        const count = errors.filter((error) => error.category === category).length;
        return (
          <li key={category} className="text-xs text-muted-foreground">
            <span
              className={cn(
                "underline decoration-2 underline-offset-4",
                style.rule,
              )}
            >
              {style.label}
            </span>{" "}
            <span className="tabular-nums">{count}</span>
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import { CATEGORY_STYLES } from "@/lib/categories";
import { diffFromErrors } from "@/lib/diff";
import type { GrammarError } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DiffViewProps {
  /** The text exactly as it was checked, which the errors index into. */
  content: string;
  errors: GrammarError[];
  applied: ReadonlySet<string>;
}

/**
 * The submitted text with every applied fix shown as what came out and what
 * went in, each coloured by its error category.
 *
 * `del`/`ins` carry the meaning semantically; the category tint and the
 * strike-through / underline repeat it visually, and the screen-reader-only
 * labels repeat it in speech — so nothing here depends on colour.
 */
export function DiffView({ content, errors, applied }: DiffViewProps) {
  const parts = diffFromErrors(content, errors, applied);

  if (parts.every((part) => part.op === "equal")) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing is applied right now, so the text is unchanged.
      </p>
    );
  }

  return (
    <p className="text-base leading-8 whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.op === "equal") return <span key={index}>{part.text}</span>;

        const style = CATEGORY_STYLES[part.error.category];

        if (part.op === "delete") {
          return (
            <del
              key={index}
              className={cn(
                "rounded-sm px-0.5 text-muted-foreground line-through decoration-2",
                style.badge,
              )}
            >
              <span className="sr-only">{style.label} fix removed: </span>
              {part.text}
            </del>
          );
        }

        return (
          <ins
            key={index}
            className={cn(
              "rounded-sm px-0.5 text-foreground underline decoration-2 underline-offset-4",
              style.mark,
            )}
          >
            <span className="sr-only">{style.label} fix added: </span>
            {part.text}
          </ins>
        );
      })}
    </p>
  );
}

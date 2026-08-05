"use client";

import { diffWords } from "@/lib/diff";

/**
 * Word-level diff between the submitted text and the current corrected text.
 *
 * `del`/`ins` carry the meaning semantically; the tint and the strike-through
 * repeat it visually, and the screen-reader-only labels repeat it in speech —
 * so nothing here depends on colour.
 */
export function DiffView({ before, after }: { before: string; after: string }) {
  const parts = diffWords(before, after);
  const unchanged = parts.every((part) => part.op === "equal");

  if (unchanged) {
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

        if (part.op === "delete") {
          return (
            <del
              key={index}
              className="rounded-sm bg-grammar-tint px-0.5 text-foreground decoration-grammar decoration-2"
            >
              <span className="sr-only">removed: </span>
              {part.text}
            </del>
          );
        }

        return (
          <ins
            key={index}
            className="rounded-sm bg-secondary px-0.5 text-secondary-foreground no-underline"
          >
            <span className="sr-only">added: </span>
            {part.text}
          </ins>
        );
      })}
    </p>
  );
}

"use client";

import { ErrorSpan } from "@/components/error-span";
import { errorId, segmentContent } from "@/lib/errors";
import type { GrammarError } from "@/lib/types";

interface AnnotatedTextProps {
  /** The text as the writer submitted it. */
  content: string;
  /** Verified, sorted, non-overlapping errors from the API. */
  errors: GrammarError[];
  /** Ids of the fixes currently substituted into the text. */
  applied: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

/**
 * The submitted text with each error rendered as a focusable span that opens
 * its own popover. Applied fixes are shown in place, so toggling one is
 * visible right where the writer is looking.
 */
export function AnnotatedText({
  content,
  errors,
  applied,
  onToggle,
}: AnnotatedTextProps) {
  const segments = segmentContent(content, errors);

  return (
    <p className="text-base leading-9 whitespace-pre-wrap">
      {segments.map((segment, index) =>
        segment.kind === "text" ? (
          <span key={index}>{segment.text}</span>
        ) : (
          <ErrorSpan
            key={index}
            error={segment.error}
            isApplied={applied.has(errorId(segment.error))}
            onToggle={() => onToggle(errorId(segment.error))}
          />
        ),
      )}
    </p>
  );
}

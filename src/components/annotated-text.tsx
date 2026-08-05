"use client";

import { Check, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CATEGORY_STYLES } from "@/lib/categories";
import { errorId, segmentContent } from "@/lib/errors";
import type { GrammarError } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AnnotatedTextProps {
  /** The text as the writer submitted it. */
  content: string;
  /** Verified, sorted, non-overlapping errors from the API. */
  errors: GrammarError[];
  /** Ids of the fixes currently substituted into the text. */
  applied: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

/** Placeholder for an empty original/suggestion, which would otherwise vanish. */
function Literal({ value }: { value: string }) {
  return value ? (
    <span className="font-mono">{value}</span>
  ) : (
    <span className="text-muted-foreground italic">nothing</span>
  );
}

function ErrorSpan({
  error,
  isApplied,
  onToggle,
}: {
  error: GrammarError;
  isApplied: boolean;
  onToggle: () => void;
}) {
  const style = CATEGORY_STYLES[error.category];
  const shown = isApplied ? error.suggestion : error.original;

  return (
    <Popover>
      <PopoverTrigger
        // `inline` (not inline-block) so a multi-word span still wraps with
        // the paragraph instead of being pushed to its own line.
        className={cn(
          "inline cursor-pointer rounded-sm px-0.5 underline decoration-2 underline-offset-4 transition-colors",
          "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-2 focus-visible:outline-ring",
          isApplied
            ? "bg-secondary text-secondary-foreground decoration-primary decoration-solid"
            : style.mark,
        )}
        aria-label={
          isApplied
            ? `${style.label} fix applied: “${error.original}” became “${error.suggestion}”. ${error.explanation}`
            : `${style.label} issue: “${error.original}”. ${error.explanation}`
        }
      >
        {shown === "" ? (
          // An applied deletion leaves no text, so leave a target behind.
          <span
            className="inline-block h-3 w-1 rounded-full bg-primary align-middle"
            aria-hidden
          />
        ) : (
          shown
        )}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80">
        <div className="flex items-center gap-2">
          <Badge className={cn("border-transparent", style.badge)}>
            {style.label}
          </Badge>
          {isApplied && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              <Check className="size-3" aria-hidden />
              Applied
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground">{error.explanation}</p>

        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-md bg-muted px-2 py-1.5 text-sm">
          <span className="text-muted-foreground line-through">
            <Literal value={error.original} />
          </span>
          <span aria-hidden className="text-muted-foreground">
            →
          </span>
          <span className="font-medium">
            <Literal value={error.suggestion} />
          </span>
        </p>

        <Button
          type="button"
          variant={isApplied ? "outline" : "default"}
          className="h-11 w-full"
          onClick={onToggle}
        >
          {isApplied ? (
            <>
              <RotateCcw aria-hidden />
              Revert this fix
            </>
          ) : (
            <>
              <Check aria-hidden />
              Apply this fix
            </>
          )}
        </Button>
      </PopoverContent>
    </Popover>
  );
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

/** Explains the four highlight treatments above the annotated text. */
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

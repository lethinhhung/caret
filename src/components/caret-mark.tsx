import { cn } from "@/lib/utils";

/**
 * The wordmark glyph: a caret in a rounded tile. The same shape is the favicon
 * (as an inline data URI in the layout) and the badge on the social card, so the
 * app is recognisable at 16px and at 1200px.
 */
export function CaretMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-[0.5rem] bg-primary text-primary-foreground",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 16 16" className="size-4" fill="none">
        <path
          d="M3.5 10.25 8 5.75l4.5 4.5"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

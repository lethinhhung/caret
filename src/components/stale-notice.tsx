import { CircleAlert } from "lucide-react";

/**
 * Shown on a results card once the writer has edited the text underneath it,
 * so a stale set of highlights is never mistaken for a current one.
 */
export function StaleNotice() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CircleAlert className="size-3.5 shrink-0" aria-hidden />
      You have edited the text since this check. Run it again to refresh.
    </p>
  );
}

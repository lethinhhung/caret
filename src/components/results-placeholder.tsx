"use client";

import { useHistory } from "@/hooks/use-history";

/**
 * What stands where the results will go, before anything has been checked.
 *
 * The promise it makes has to match the switch: claiming nothing is stored
 * while history is on would be the one lie the app tells.
 */
export function ResultsPlaceholder() {
  const { enabled } = useHistory();

  return (
    <p className="text-sm text-muted-foreground">
      Results appear here.{" "}
      {enabled
        ? "Each check is saved in this browser until you turn history off."
        : "Nothing you type is stored."}
    </p>
  );
}

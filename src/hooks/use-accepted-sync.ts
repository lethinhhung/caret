"use client";

import { useEffect } from "react";
import { updateAccepted } from "@/lib/history-store";

/** Long enough that working through a card's fixes writes storage once. */
const SETTLE_MS = 600;

/**
 * Mirrors the applied fixes back onto the stored check they came from.
 *
 * Which fixes a writer kept is the part of an entry worth having later — a
 * reverted fix is an active disagreement with the model, not a missing click —
 * so it has to survive the writer changing their mind after the check ran.
 *
 * Does nothing when there is no entry, which is the case whenever history is
 * off.
 */
export function useAcceptedSync(
  entryId: string | undefined,
  applied: ReadonlySet<string>,
) {
  useEffect(() => {
    if (!entryId) return;

    const timer = setTimeout(
      () => updateAccepted(entryId, [...applied]),
      SETTLE_MS,
    );
    return () => clearTimeout(timer);
  }, [entryId, applied]);
}

"use client";

import { HistoryEntryRow } from "@/components/history-entry-row";
import { Button } from "@/components/ui/button";
import type { HistoryEntry } from "@/lib/history";
import { clear } from "@/lib/history-store";

/** Every stored check, newest first, with the way out of all of them. */
export function HistoryList({
  entries,
  onOpen,
}: {
  entries: HistoryEntry[];
  onOpen: (entry: HistoryEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No checks yet. The next one you run will appear here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry.id}>
            <HistoryEntryRow entry={entry} onOpen={onOpen} />
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="ghost"
        className="h-10 self-start text-muted-foreground"
        onClick={() => clear()}
      >
        Clear all
      </Button>
    </div>
  );
}

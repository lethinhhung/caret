"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HistoryEntry } from "@/lib/history";
import { remove } from "@/lib/history-store";

const WHEN = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

/** One stored check: what was written, when, and how it went. */
export function HistoryEntryRow({
  entry,
  onOpen,
}: {
  entry: HistoryEntry;
  onOpen: (entry: HistoryEntry) => void;
}) {
  const issues = entry.errors.length;

  return (
    <div className="flex items-start gap-1 rounded-lg border border-border p-2">
      <button
        type="button"
        onClick={() => onOpen(entry)}
        className="min-w-0 flex-1 rounded-md px-2 py-1 text-left hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="line-clamp-2 text-sm">{entry.content}</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {WHEN.format(entry.createdAt)} ·{" "}
          {issues === 0 ? "No issues" : `${issues} ${issues === 1 ? "issue" : "issues"}`}
        </span>
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        aria-label="Delete this check"
        onClick={() => remove(entry.id)}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </div>
  );
}

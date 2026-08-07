"use client";

import { History } from "lucide-react";
import { useState } from "react";
import { HistoryList } from "@/components/history-list";
import { HistorySwitch } from "@/components/history-switch";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useHistory } from "@/hooks/use-history";
import type { HistoryEntry } from "@/lib/history";

/**
 * Past checks, and the switch that decides whether there are any.
 *
 * A slide-over rather than its own route, so an in-progress draft in the
 * composer is never unmounted to look something up. It is reachable whether
 * history is on or off — that is how the feature gets found at all.
 */
export function HistoryPanel({
  onRestore,
}: {
  onRestore: (entry: HistoryEntry) => void;
}) {
  const { enabled, entries } = useHistory();
  const [open, setOpen] = useState(false);

  // Reading an old check is the end of the visit to the panel, not the middle.
  function openEntry(entry: HistoryEntry) {
    onRestore(entry);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-11 gap-2 rounded-full px-4"
        >
          <History className="size-5" aria-hidden />
          History{" "}
          {entries.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
              {entries.length}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle>History</SheetTitle>
          <SheetDescription>
            {enabled
              ? "Kept in this browser. Nothing is uploaded."
              : "Off. Nothing is being stored."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <HistorySwitch enabled={enabled} count={entries.length} />

          {enabled && <HistoryList entries={entries} onOpen={openEntry} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

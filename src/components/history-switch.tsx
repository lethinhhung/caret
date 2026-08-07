"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { setEnabled } from "@/lib/history-store";

/**
 * The opt-in, and the one place that explains what opting in means.
 *
 * Turning it off asks first, because the answer deletes the writer's prose
 * rather than just stopping the next check from being kept.
 */
export function HistorySwitch({
  enabled,
  count,
}: {
  enabled: boolean;
  count: number;
}) {
  const [confirming, setConfirming] = useState(false);

  function change(next: boolean) {
    if (next) return setEnabled(true);
    setConfirming(true);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <label htmlFor="save-checks" className="text-sm font-medium">
          Save my checks
        </label>
        <Switch id="save-checks" checked={enabled} onCheckedChange={change} />
      </div>

      <p className="text-sm text-muted-foreground">
        Keeps the text you checked, its context, the issues found, and which
        fixes you kept — in this browser, on this device. Nothing is uploaded.
      </p>

      {confirming && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <p className="text-sm font-medium">
            {count > 0
              ? `Turning history off deletes the ${count} ${count === 1 ? "check" : "checks"} stored here.`
              : "Nothing is stored yet. History will stop recording."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              className="h-10"
              onClick={() => {
                setEnabled(false);
                setConfirming(false);
              }}
            >
              Delete and turn off
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => setConfirming(false)}
            >
              Keep history
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

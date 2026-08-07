"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * A check that did not complete. The server's own message is shown verbatim —
 * it is written for the writer — with a retry that is disabled for as long as
 * retrying would fail the same way.
 */
export function CheckFailure({
  message,
  canRetry,
  onRetry,
}: {
  message: string;
  canRetry: boolean;
  onRetry: () => void;
}) {
  return (
    <Card className="ring-destructive/30">
      <CardContent className="flex items-start gap-3">
        <TriangleAlert
          className="mt-0.5 size-5 shrink-0 text-destructive"
          aria-hidden
        />
        <div className="flex flex-col items-start gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">
              That check did not go through
            </h2>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={onRetry}
            disabled={!canRetry}
          >
            Try again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

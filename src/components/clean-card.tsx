"use client";

import { CircleCheck, Sparkles } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { StaleNotice } from "@/components/stale-notice";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import type { Clipboard } from "@/hooks/use-copy";

interface CleanCardProps {
  /** The text exactly as it was checked. */
  content: string;
  /** Whole-text rewrites, offered only when there was nothing to correct. */
  improvements?: string[];
  isStale: boolean;
  clipboard: Clipboard;
}

/** A check that found nothing, and the sharper ways to say it anyway. */
export function CleanCard({
  content,
  improvements,
  isStale,
  clipboard,
}: CleanCardProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <CircleCheck className="size-5 text-primary" aria-hidden />
          Looks good
        </h2>
        <CardDescription>
          No grammar, spelling, punctuation, or word-choice problems found.
        </CardDescription>
      </CardHeader>

      {(improvements?.length ?? 0) > 0 && (
        <CardContent className="flex flex-col gap-3">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-accent" aria-hidden />
            Sharper ways to say it
          </h3>
          <ul className="flex flex-col gap-2">
            {improvements?.map((improvement, index) => (
              <li
                key={index}
                className="flex items-start gap-2 rounded-lg bg-muted p-3"
              >
                <p className="flex-1 text-sm leading-6">{improvement}</p>
                <CopyButton
                  copied={clipboard.copiedKey === `variant-${index}`}
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0"
                  aria-label={`Copy variant ${index + 1}`}
                  onClick={() => void clipboard.copy(improvement, `variant-${index}`)}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      )}

      <CardFooter className="flex-col items-stretch gap-3 border-t pt-4">
        <div>
          <CopyButton
            copied={clipboard.copiedKey === "original"}
            label="Copy your text"
            variant="outline"
            onClick={() => void clipboard.copy(content, "original")}
          />
        </div>
        {clipboard.copyError && (
          <p className="text-xs text-destructive">{clipboard.copyError}</p>
        )}
        {isStale && <StaleNotice />}
      </CardFooter>
    </Card>
  );
}

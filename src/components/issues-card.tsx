"use client";

import { Check, RotateCcw } from "lucide-react";
import { AnnotatedText } from "@/components/annotated-text";
import { CategoryLegend } from "@/components/category-legend";
import { CopyButton } from "@/components/copy-button";
import { DiffView } from "@/components/diff-view";
import { StaleNotice } from "@/components/stale-notice";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Clipboard } from "@/hooks/use-copy";
import type { GrammarError } from "@/lib/types";

interface IssuesCardProps {
  /** The text exactly as it was checked, which the errors index into. */
  content: string;
  errors: GrammarError[];
  applied: ReadonlySet<string>;
  corrected: string;
  allApplied: boolean;
  isStale: boolean;
  clipboard: Clipboard;
  onToggleFix: (id: string) => void;
  onToggleAll: () => void;
}

/** A check that found something: the text three ways, and what to do with it. */
export function IssuesCard({
  content,
  errors,
  applied,
  corrected,
  allApplied,
  isStale,
  clipboard,
  onToggleFix,
  onToggleAll,
}: IssuesCardProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold">
          {errors.length} {errors.length === 1 ? "issue" : "issues"} found
        </h2>
        <CardDescription>
          Every fix is applied. Select a highlight to read the reason or put the
          original back.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="annotated" className="gap-4">
          <TabsList className="w-full">
            <TabsTrigger value="annotated">Annotated</TabsTrigger>
            <TabsTrigger value="corrected">Corrected</TabsTrigger>
            <TabsTrigger value="diff">Diff</TabsTrigger>
          </TabsList>

          <TabsContent value="annotated" className="flex flex-col gap-3">
            <CategoryLegend errors={errors} />
            <AnnotatedText
              content={content}
              errors={errors}
              applied={applied}
              onToggle={onToggleFix}
            />
          </TabsContent>

          <TabsContent value="corrected">
            <p className="text-base leading-8 whitespace-pre-wrap">{corrected}</p>
          </TabsContent>

          <TabsContent value="diff">
            <DiffView before={content} after={corrected} />
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-3 border-t pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton
            copied={clipboard.copiedKey === "corrected"}
            label="Copy corrected"
            onClick={() => void clipboard.copy(corrected, "corrected")}
          />
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={onToggleAll}
          >
            {allApplied ? (
              <RotateCcw className="size-4" aria-hidden />
            ) : (
              <Check className="size-4" aria-hidden />
            )}
            {allApplied ? "Revert all" : "Apply all"}
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground sm:ml-auto">
            {applied.size} of {errors.length} applied
          </span>
        </div>
        {clipboard.copyError && (
          <p className="text-xs text-destructive">{clipboard.copyError}</p>
        )}
        {isStale && <StaleNotice />}
      </CardFooter>
    </Card>
  );
}

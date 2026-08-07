"use client";

import { LoaderCircle, WandSparkles } from "lucide-react";
import { ShortcutHint } from "@/components/shortcut-hint";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_CONTENT_LENGTH, MAX_CONTEXT_LENGTH } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CheckFormProps {
  context: string;
  content: string;
  isChecking: boolean;
  canCheck: boolean;
  overLimit: boolean;
  onContextChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSubmit: () => void;
}

/** The composer: who the writing is for, the writing itself, and Check. */
export function CheckForm({
  context,
  content,
  isChecking,
  canCheck,
  overLimit,
  onContextChange,
  onContentChange,
  onSubmit,
}: CheckFormProps) {
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="context" className="text-sm font-medium">
          Context{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="context"
          rows={2}
          maxLength={MAX_CONTEXT_LENGTH}
          value={context}
          onChange={(event) => onContextChange(event.target.value)}
          placeholder="A formal email to a client"
          aria-describedby="context-help"
          className="max-h-32 text-base"
        />
        <p id="context-help" className="text-xs text-muted-foreground">
          Who you are writing for, so tone and word choice are judged against it.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="content" className="text-sm font-medium">
          Your text
        </label>
        <Textarea
          id="content"
          rows={8}
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          placeholder="Paste or write the text you want checked."
          aria-describedby="content-count"
          aria-invalid={overLimit || undefined}
          className="max-h-[55vh] min-h-48 text-base leading-7"
        />
        <p
          id="content-count"
          className={cn(
            "text-xs tabular-nums",
            overLimit ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          {content.length.toLocaleString()} /{" "}
          {MAX_CONTENT_LENGTH.toLocaleString()} characters
          {overLimit && " — trim it before checking"}
        </p>
      </div>

      <div className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-2">
        <Button type="submit" className="h-11 px-5 text-base" disabled={!canCheck}>
          {isChecking ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <WandSparkles className="size-4" aria-hidden />
          )}
          {isChecking ? "Checking…" : "Check"}
        </Button>
        <ShortcutHint />
      </div>
    </form>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Check,
  CircleAlert,
  CircleCheck,
  Copy,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  WandSparkles,
} from "lucide-react";
import { AnnotatedText, CategoryLegend } from "@/components/annotated-text";
import { DiffView } from "@/components/diff-view";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { applyFixes, errorId } from "@/lib/errors";
import {
  MAX_CONTENT_LENGTH,
  MAX_CONTEXT_LENGTH,
  type CheckErrorResponse,
  type CheckResponse,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * A completed check, paired with the exact text that produced it. Annotations
 * index into `content`, so editing the textarea afterwards can never shift the
 * highlights out from under the writer.
 */
interface Outcome {
  content: string;
  result: CheckResponse;
}

const GENERIC_FAILURE = "Something went wrong. Try again.";

/**
 * The modifier key label for the Check shortcut. It can only be read on the
 * client, so the server snapshot is `null` and the hint appears after
 * hydration — reserved space in the layout keeps that from shifting anything.
 */
const noopSubscribe = () => () => {};
const readShortcut = () =>
  /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
const noShortcut = () => null;

export default function Home() {
  const [context, setContext] = useState("");
  const [content, setContent] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [applied, setApplied] = useState<ReadonlySet<string>>(() => new Set());
  const [failure, setFailure] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const shortcut = useSyncExternalStore(noopSubscribe, readShortcut, noShortcut);

  const abortRef = useRef<AbortController | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const overLimit = content.length > MAX_CONTENT_LENGTH;
  const canCheck = content.trim().length > 0 && !overLimit && !isChecking;

  const errors = useMemo(() => outcome?.result.errors ?? [], [outcome]);
  const corrected = useMemo(
    () => (outcome ? applyFixes(outcome.content, outcome.result.errors, applied) : ""),
    [outcome, applied],
  );
  const isStale = outcome !== null && content !== outcome.content;
  const allApplied = errors.length > 0 && applied.size === errors.length;

  const runCheck = useCallback(async () => {
    if (!canCheck) return;

    // Held so an unmount can cancel the request instead of leaving it running.
    const controller = new AbortController();
    abortRef.current = controller;

    setIsChecking(true);
    setFailure(null);
    setCopyError(null);
    setCopiedKey(null);

    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, context: context.trim() || undefined }),
        signal: controller.signal,
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        const { error } = (payload ?? {}) as CheckErrorResponse;
        setFailure(error || GENERIC_FAILURE);
        setOutcome(null);
        return;
      }

      const result = payload as CheckResponse;
      setOutcome({ content, result });
      // Fixes arrive applied, so "copy the corrected text" is one click away.
      setApplied(new Set(result.errors.map(errorId)));
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setFailure(
        "Could not reach the grammar service. Check your connection and try again.",
      );
      setOutcome(null);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsChecking(false);
      }
    }
  }, [canCheck, content, context]);

  // Cmd/Ctrl+Enter from anywhere on the page, including inside the textareas.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void runCheck();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [runCheck]);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
      abortRef.current?.abort();
    },
    [],
  );

  // Bring the results into view; on mobile they land below the fold.
  useEffect(() => {
    if (!outcome) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "start",
    });
  }, [outcome]);

  const copy = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyError(null);
      setCopiedKey(key);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      setCopiedKey(null);
      setCopyError(
        "Your browser blocked the clipboard. Select the text and copy it manually.",
      );
    }
  }, []);

  function toggleFix(id: string) {
    setApplied((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
    setCopiedKey(null);
  }

  function toggleAll() {
    setApplied(allApplied ? new Set() : new Set(errors.map(errorId)));
    setCopiedKey(null);
  }

  const status = isChecking
    ? "Checking your text."
    : failure
      ? failure
      : outcome
        ? outcome.result.status === "has_errors"
          ? `${errors.length} ${errors.length === 1 ? "issue" : "issues"} found.`
          : "No issues found."
        : "";

  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Caret
            </h1>
            <p className="text-sm text-muted-foreground">
              Paste your text, inspect every fix, keep the ones you want.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void runCheck();
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
              onChange={(event) => setContext(event.target.value)}
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
              onChange={(event) => setContent(event.target.value)}
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
            {shortcut && (
              <span className="text-xs text-muted-foreground">
                or press{" "}
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[0.7rem] font-medium">
                  {shortcut}
                </kbd>{" "}
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[0.7rem] font-medium">
                  ↵
                </kbd>
              </span>
            )}
          </div>
        </form>

        {/* Announced to screen readers; the visual result is rendered below. */}
        <p role="status" aria-live="polite" className="sr-only">
          {status}
        </p>

        <div ref={resultsRef} className="mt-8 scroll-mt-6">
          {isChecking && <ResultsSkeleton />}

          {!isChecking && failure && (
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
                    <p className="text-sm text-muted-foreground">{failure}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={() => void runCheck()}
                    disabled={!canCheck}
                  >
                    Try again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!isChecking &&
            !failure &&
            outcome &&
            (outcome.result.status === "has_errors" ? (
              <Card>
                <CardHeader>
                  <h2 className="text-base font-semibold">
                    {errors.length} {errors.length === 1 ? "issue" : "issues"} found
                  </h2>
                  <CardDescription>
                    Every fix is applied. Select a highlight to read the reason or put
                    the original back.
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
                        content={outcome.content}
                        errors={errors}
                        applied={applied}
                        onToggle={toggleFix}
                      />
                    </TabsContent>

                    <TabsContent value="corrected">
                      <p className="text-base leading-8 whitespace-pre-wrap">
                        {corrected}
                      </p>
                    </TabsContent>

                    <TabsContent value="diff">
                      <DiffView before={outcome.content} after={corrected} />
                    </TabsContent>
                  </Tabs>
                </CardContent>

                <CardFooter className="flex-col items-stretch gap-3 border-t pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      className="h-11"
                      onClick={() => void copy(corrected, "corrected")}
                    >
                      {copiedKey === "corrected" ? (
                        <Check className="size-4" aria-hidden />
                      ) : (
                        <Copy className="size-4" aria-hidden />
                      )}
                      {copiedKey === "corrected" ? "Copied" : "Copy corrected"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11"
                      onClick={toggleAll}
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
                  {copyError && <p className="text-xs text-destructive">{copyError}</p>}
                  {isStale && <StaleNotice />}
                </CardFooter>
              </Card>
            ) : (
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

                {(outcome.result.improvements?.length ?? 0) > 0 && (
                  <CardContent className="flex flex-col gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="size-4 text-accent" aria-hidden />
                      Sharper ways to say it
                    </h3>
                    <ul className="flex flex-col gap-2">
                      {outcome.result.improvements?.map((improvement, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 rounded-lg bg-muted p-3"
                        >
                          <p className="flex-1 text-sm leading-6">{improvement}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-11 shrink-0"
                            onClick={() => void copy(improvement, `variant-${index}`)}
                            aria-label={`Copy variant ${index + 1}`}
                          >
                            {copiedKey === `variant-${index}` ? (
                              <Check className="size-4" aria-hidden />
                            ) : (
                              <Copy className="size-4" aria-hidden />
                            )}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                )}

                <CardFooter className="flex-col items-stretch gap-3 border-t pt-4">
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11"
                      onClick={() => void copy(outcome.content, "original")}
                    >
                      {copiedKey === "original" ? (
                        <Check className="size-4" aria-hidden />
                      ) : (
                        <Copy className="size-4" aria-hidden />
                      )}
                      {copiedKey === "original" ? "Copied" : "Copy your text"}
                    </Button>
                  </div>
                  {copyError && <p className="text-xs text-destructive">{copyError}</p>}
                  {isStale && <StaleNotice />}
                </CardFooter>
              </Card>
            ))}

          {!isChecking && !failure && !outcome && (
            <p className="text-sm text-muted-foreground">
              Results appear here. Nothing you type is stored.
            </p>
          )}
        </div>
      </main>
    </>
  );
}

function StaleNotice() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CircleAlert className="size-3.5 shrink-0" aria-hidden />
      You have edited the text since this check. Run it again to refresh.
    </p>
  );
}

/** Reserves the shape of the results card so nothing jumps when they land. */
function ResultsSkeleton() {
  return (
    <Card aria-hidden>
      <CardHeader className="gap-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Skeleton className="h-8 w-full" />
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[92%]" />
          <Skeleton className="h-4 w-[96%]" />
          <Skeleton className="h-4 w-[64%]" />
        </div>
      </CardContent>
      <CardFooter className="gap-2 border-t pt-4">
        <Skeleton className="h-11 w-40" />
        <Skeleton className="h-11 w-28" />
      </CardFooter>
    </Card>
  );
}

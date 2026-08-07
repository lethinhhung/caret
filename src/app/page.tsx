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
  Copy,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  WandSparkles,
} from "lucide-react";
import { AnnotatedText, CategoryLegend } from "@/components/annotated-text";
import { CaretMark } from "@/components/caret-mark";
import { DiffView } from "@/components/diff-view";
import { SegmentedTabs } from "@/components/segmented-tabs";
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
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { applyFixes, errorId } from "@/lib/errors";
import { SITE_TAGLINE } from "@/lib/site";
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

const VIEWS = [
  { value: "annotated", label: "Annotated" },
  { value: "corrected", label: "Corrected" },
  { value: "diff", label: "Diff" },
];

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
  const [view, setView] = useState(VIEWS[0].value);
  /** Bumped per check so each result animates in as a new object. */
  const [runId, setRunId] = useState(0);

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
    setView(VIEWS[0].value);

    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, context: context.trim() || undefined }),
        signal: controller.signal,
      });

      const payload: unknown = await response.json();
      setRunId((current) => current + 1);

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
      setRunId((current) => current + 1);
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
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-8 pb-12 sm:px-6 sm:pt-12">
        <div className="mb-7 flex flex-col gap-2.5 sm:mb-9">
          <h1 className="text-display text-balance">
            Grammar, spelling, and style — checked in place.
          </h1>
          <p className="text-pretty text-muted-foreground sm:text-[1.0625rem]">
            {SITE_TAGLINE}
          </p>
        </div>

        {/*
         * One surface, two fields and the action — the composer is the page's
         * centre of gravity, so nothing else competes with it for weight.
         */}
        <form
          className="surface overflow-hidden rounded-2xl"
          onSubmit={(event) => {
            event.preventDefault();
            void runCheck();
          }}
        >
          <div className="flex flex-col gap-1 px-4 pt-3.5 pb-3 sm:px-5">
            <label htmlFor="context" className="text-label text-muted-foreground">
              Context <span className="font-normal">(optional)</span>
            </label>
            <Textarea
              id="context"
              rows={1}
              maxLength={MAX_CONTEXT_LENGTH}
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="A formal email to a client"
              aria-describedby="context-help"
              className="max-h-24 min-h-0 resize-none rounded-none border-0 bg-transparent p-0 text-base md:text-base focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
            />
            <p id="context-help" className="text-caption text-muted-foreground">
              Who you are writing for, so tone and word choice are judged against it.
            </p>
          </div>

          <div className="hairline-t flex flex-col gap-1.5 px-4 pt-3.5 pb-4 sm:px-5">
            <label htmlFor="content" className="text-label text-muted-foreground">
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
              className="max-h-[50vh] min-h-44 resize-none rounded-none border-0 bg-transparent p-0 text-base md:text-base leading-7 focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
            />
          </div>

          {/*
           * The action bar is a floating layer, not another band of the form:
           * the text scrolls up to it and it stays legible over whatever lands
           * underneath.
           */}
          <div className="hairline-t material-chrome flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-5">
            <p
              id="content-count"
              className={cn(
                "text-caption flex items-center gap-2 tabular-nums",
                overLimit ? "font-medium text-destructive" : "text-muted-foreground",
              )}
            >
              <CountRing used={content.length / MAX_CONTENT_LENGTH} />
              <span>
                {content.length.toLocaleString()} /{" "}
                {MAX_CONTENT_LENGTH.toLocaleString()}
                {overLimit && " — trim it before checking"}
              </span>
            </p>

            <div className="ml-auto flex items-center gap-3">
              {shortcut && (
                <span className="text-caption hidden items-center gap-1 text-muted-foreground sm:flex">
                  <Kbd>{shortcut}</Kbd>
                  <Kbd>↵</Kbd>
                </span>
              )}
              <Button
                type="submit"
                className="h-11 rounded-full px-5 text-[0.9375rem]"
                disabled={!canCheck}
              >
                {isChecking ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                ) : (
                  <WandSparkles className="size-4" aria-hidden />
                )}
                {isChecking ? "Checking…" : "Check"}
              </Button>
            </div>
          </div>
        </form>

        {/* Announced to screen readers; the visual result is rendered below. */}
        <p role="status" aria-live="polite" className="sr-only">
          {status}
        </p>

        <div ref={resultsRef} className="mt-8 scroll-mt-20" key={runId}>
          {isChecking && <ResultsSkeleton />}

          {!isChecking && failure && (
            <Card className="materialize">
              <CardContent className="flex items-start gap-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <TriangleAlert
                    className="size-[1.125rem] text-destructive"
                    aria-hidden
                  />
                </span>
                <div className="flex flex-col items-start gap-3.5">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-title">That check did not go through</h2>
                    <p className="text-sm text-muted-foreground">{failure}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-full px-4"
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
              <Card className="materialize">
                <CardHeader>
                  <h2 className="text-title">
                    {errors.length} {errors.length === 1 ? "issue" : "issues"} found
                  </h2>
                  <CardDescription>
                    Every fix is applied. Select a highlight to read the reason or put
                    the original back.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <Tabs value={view} onValueChange={setView} className="gap-4">
                    <SegmentedTabs
                      segments={VIEWS}
                      value={view}
                      onValueChange={setView}
                    />

                    <TabsContent value="annotated" className="flex flex-col gap-3.5">
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

                <CardFooter className="flex-col items-stretch gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      className="h-11 rounded-full px-4"
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
                      className="h-11 rounded-full px-4"
                      onClick={toggleAll}
                    >
                      {allApplied ? (
                        <RotateCcw className="size-4" aria-hidden />
                      ) : (
                        <Check className="size-4" aria-hidden />
                      )}
                      {allApplied ? "Revert all" : "Apply all"}
                    </Button>
                    <span className="text-caption tabular-nums text-muted-foreground sm:ml-auto">
                      {applied.size} of {errors.length} applied
                    </span>
                  </div>
                  {copyError && (
                    <p className="text-caption text-destructive">{copyError}</p>
                  )}
                  {isStale && <StaleNotice />}
                </CardFooter>
              </Card>
            ) : (
              <Card className="materialize">
                <CardHeader className="gap-2.5">
                  <span className="pop-in flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-5.5" strokeWidth={2.5} aria-hidden />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-title">Looks good</h2>
                    <CardDescription>
                      No grammar, spelling, punctuation, or word-choice problems found.
                    </CardDescription>
                  </div>
                </CardHeader>

                {(outcome.result.improvements?.length ?? 0) > 0 && (
                  <CardContent className="flex flex-col gap-2.5">
                    <h3 className="text-label flex items-center gap-1.5 text-muted-foreground">
                      <Sparkles className="size-3.5 text-style" aria-hidden />
                      Sharper ways to say it
                    </h3>
                    <ul className="flex flex-col gap-2">
                      {outcome.result.improvements?.map((improvement, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 rounded-xl bg-muted/70 p-3 pl-3.5"
                        >
                          <p className="flex-1 text-sm leading-6">{improvement}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-9 shrink-0 rounded-full"
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

                <CardFooter className="flex-col items-stretch gap-3">
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-full px-4"
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
                  {copyError && (
                    <p className="text-caption text-destructive">{copyError}</p>
                  )}
                  {isStale && <StaleNotice />}
                </CardFooter>
              </Card>
            ))}

          {!isChecking && !failure && !outcome && (
            <p className="text-caption px-1 text-muted-foreground">
              Results appear here. Nothing you type is stored.
            </p>
          )}
        </div>
      </main>
    </>
  );
}

/**
 * Floating chrome: translucent, with the page passing underneath it. The
 * hairline exists only while there is content beneath the bar to separate it
 * from — a sentinel at the top of the document decides when.
 */
function SiteHeader() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 1 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden className="absolute top-0 h-px w-px" />
      <header
        className="material-chrome scroll-edge sticky top-0 z-40"
        data-scrolled={scrolled}
      >
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <span className="flex items-center gap-2.5">
            <CaretMark />
            <span className="text-title">Caret</span>
          </span>
          <ThemeToggle />
        </div>
      </header>
    </>
  );
}

/**
 * How full the box is, as a ring. It carries no information the count beside it
 * does not, but it answers "am I close?" without anyone reading two numbers.
 */
function CountRing({ used }: { used: number }) {
  const radius = 6;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.min(1, Math.max(0, used));

  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0 -rotate-90" aria-hidden>
      <circle
        cx="8"
        cy="8"
        r={radius}
        fill="none"
        strokeWidth="2"
        className="stroke-current opacity-20"
      />
      <circle
        cx="8"
        cy="8"
        r={radius}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - filled)}
        className="stroke-current transition-[stroke-dashoffset] duration-spring-snappy ease-spring"
      />
    </svg>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="flex h-5 min-w-5 items-center justify-center rounded-[0.3rem] bg-muted px-1 font-sans text-[0.6875rem] font-medium text-muted-foreground ring-1 ring-border">
      {children}
    </kbd>
  );
}

function StaleNotice() {
  return (
    <p className="text-caption flex items-center gap-1.5 text-muted-foreground">
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
        <Skeleton className="h-10 w-full rounded-full" />
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[92%]" />
          <Skeleton className="h-4 w-[96%]" />
          <Skeleton className="h-4 w-[64%]" />
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Skeleton className="h-11 w-40 rounded-full" />
        <Skeleton className="h-11 w-28 rounded-full" />
      </CardFooter>
    </Card>
  );
}

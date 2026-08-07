"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckForm } from "@/components/check-form";
import { CheckResults } from "@/components/check-results";
import { CheckStatus } from "@/components/check-status";
import { SiteHeader } from "@/components/site-header";
import { useCopy } from "@/hooks/use-copy";
import { useGrammarCheck } from "@/hooks/use-grammar-check";

export default function Home() {
  const [context, setContext] = useState("");
  const [content, setContent] = useState("");

  const check = useGrammarCheck(content, context);
  const clipboard = useCopy();
  const resultsRef = useRef<HTMLDivElement>(null);

  const { isChecking, outcome, failure, run } = check;
  const { clear } = clipboard;

  // A new check makes any standing "Copied" confirmation stale.
  const submit = useCallback(() => {
    clear();
    void run();
  }, [clear, run]);

  // Cmd/Ctrl+Enter from anywhere on the page, including inside the textareas.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        submit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [submit]);

  // Bring the results into view; on mobile they land below the fold.
  useEffect(() => {
    if (!outcome) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "start",
    });
  }, [outcome]);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <CheckForm
          context={context}
          content={content}
          isChecking={isChecking}
          canCheck={check.canCheck}
          overLimit={check.overLimit}
          onContextChange={setContext}
          onContentChange={setContent}
          onSubmit={submit}
        />

        <CheckStatus isChecking={isChecking} failure={failure} outcome={outcome} />

        <div ref={resultsRef} className="mt-8 scroll-mt-6">
          <CheckResults
            check={check}
            clipboard={clipboard}
            isStale={outcome !== null && content !== outcome.content}
            onRetry={submit}
          />
        </div>
      </main>
    </>
  );
}

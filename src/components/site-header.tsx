import { HistoryPanel } from "@/components/history-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { SITE_TAGLINE } from "@/lib/site";

/** The app's name, what it does, and the controls that apply to the whole page. */
export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Caret
          </h1>
          <p className="text-sm text-muted-foreground">{SITE_TAGLINE}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <HistoryPanel />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

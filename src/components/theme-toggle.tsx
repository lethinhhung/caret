"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Long enough to cover the eased colour change in globals.css. */
const THEME_SHIFT_MS = 300;

/**
 * Flips the `dark` class and remembers the choice.
 *
 * The icons swap in CSS rather than from React state, so the button renders
 * identically on the server and the client — the inline script in the layout
 * has already set the class by the time this hydrates. The page eases across
 * the brightness change instead of cutting to it, which is jarring at night.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");

    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.add("theme-shift");
      window.setTimeout(() => root.classList.remove("theme-shift"), THEME_SHIFT_MS);
    }

    root.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Private browsing; the theme just won't persist.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative size-10 rounded-full"
      onClick={toggle}
      aria-label="Switch between light and dark theme"
    >
      <Sun
        className="size-[1.15rem] scale-100 rotate-0 transition-transform duration-spring-snappy ease-spring-bounce dark:scale-0 dark:-rotate-90"
        aria-hidden
      />
      <Moon
        className="absolute size-[1.15rem] scale-0 rotate-90 transition-transform duration-spring-snappy ease-spring-bounce dark:scale-100 dark:rotate-0"
        aria-hidden
      />
    </Button>
  );
}

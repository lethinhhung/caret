"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Flips the `dark` class and remembers the choice.
 *
 * The icons swap in CSS rather than from React state, so the button renders
 * identically on the server and the client — the inline script in the layout
 * has already set the class by the time this hydrates.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
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
      className="size-11 rounded-full"
      onClick={toggle}
      aria-label="Switch between light and dark theme"
    >
      <Sun className="size-5 dark:hidden" aria-hidden />
      <Moon className="hidden size-5 dark:block" aria-hidden />
    </Button>
  );
}

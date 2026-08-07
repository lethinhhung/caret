"use client";

import { useSyncExternalStore, type ReactNode } from "react";

/**
 * The modifier key label for the Check shortcut. It can only be read on the
 * client, so the server snapshot is `null` and the hint appears after
 * hydration — reserved space in the layout keeps that from shifting anything.
 */
const noopSubscribe = () => () => {};
const readShortcut = () =>
  /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
const noShortcut = () => null;

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[0.7rem] font-medium">
      {children}
    </kbd>
  );
}

/** Names the platform's own modifier, or renders nothing until it can. */
export function ShortcutHint() {
  const shortcut = useSyncExternalStore(noopSubscribe, readShortcut, noShortcut);
  if (!shortcut) return null;

  return (
    <span className="text-xs text-muted-foreground">
      or press <Kbd>{shortcut}</Kbd> <Kbd>↵</Kbd>
    </span>
  );
}

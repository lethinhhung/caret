"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CLEAR_AFTER_MS = 2500;
const BLOCKED =
  "Your browser blocked the clipboard. Select the text and copy it manually.";

/**
 * Copying to the clipboard, with a brief acknowledgement on the control that
 * was pressed.
 *
 * One key is confirmed at a time, so a page with several copy buttons can
 * never claim two of them succeeded. The caller clears the confirmation when
 * the text underneath changes, since "Copied" would then be a lie.
 */
export function useCopy() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setCopiedKey(null);
    setCopyError(null);
  }, []);

  const copy = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyError(null);
      setCopiedKey(key);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiedKey(null), CLEAR_AFTER_MS);
    } catch {
      setCopiedKey(null);
      setCopyError(BLOCKED);
    }
  }, []);

  return { copiedKey, copyError, copy, clear };
}

/** What a results card needs to offer a copy action. */
export type Clipboard = ReturnType<typeof useCopy>;

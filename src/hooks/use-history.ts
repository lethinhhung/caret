"use client";

import { useSyncExternalStore } from "react";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  type History,
} from "@/lib/history-store";

/**
 * The history on this device, re-reading whenever it changes — including when
 * another tab is the one that changed it.
 *
 * The server snapshot is empty, so the first client render matches the HTML
 * and the real state arrives once mounted.
 */
export function useHistory(): History {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

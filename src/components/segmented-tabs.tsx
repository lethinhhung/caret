"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spring, project, withRubberband } from "@/lib/spring";
import { cn } from "@/lib/utils";

export interface Segment {
  value: string;
  label: string;
}

interface SegmentedTabsProps {
  segments: Segment[];
  /** The selected value. `Tabs` must be controlled with the same one. */
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

/** How far the pointer must travel before this counts as a drag, in px. */
const DRAG_THRESHOLD = 3;
/** Velocity is read from the tail of the gesture, not its whole length. */
const VELOCITY_WINDOW_MS = 80;
/** Snappier than a scroll view — this is a short throw across a small control. */
const DECELERATION = 0.99;

/**
 * A segmented control whose selection can be dragged, the way the iOS one can.
 *
 * The thumb tracks the finger 1:1 from wherever it was grabbed, resists past
 * either end instead of stopping dead, and on release continues at the exact
 * speed of the gesture into the segment the throw was heading for — so there is
 * no seam between dragging and animating. Tapping a segment or arrowing to it
 * with the keyboard moves the same thumb, without the overshoot, because
 * nothing physical preceded it.
 *
 * The hit area for the drag is an invisible overlay sitting on top of the
 * selected segment only. Pointer events never reach the tab triggers during a
 * drag, so the selection changes exactly once, when the gesture resolves.
 */
export function SegmentedTabs({
  segments,
  value,
  onValueChange,
  className,
}: SegmentedTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const handleRef = useRef<HTMLSpanElement>(null);
  /**
   * One spring for the life of the control: every gesture, tap and keypress
   * re-targets the same object, so motion is never cut off and restarted.
   */
  const springRef = useRef<Spring | null>(null);
  /** Left offset and width of each trigger, relative to the list. */
  const rectsRef = useRef<{ left: number; width: number }[]>([]);
  const dragRef = useRef<{
    pointerId: number;
    /** Distance from the pointer to the thumb's left edge when it was grabbed. */
    grabOffset: number;
    moved: boolean;
    history: { x: number; time: number }[];
  } | null>(null);

  const index = Math.max(
    0,
    segments.findIndex((segment) => segment.value === value),
  );

  const paint = useCallback((x: number) => {
    const transform = `translate3d(${x}px, 0, 0)`;
    if (thumbRef.current) thumbRef.current.style.transform = transform;
    if (handleRef.current) handleRef.current.style.transform = transform;
  }, []);

  /** Re-reads the trigger geometry and parks the thumb on the selection. */
  const measure = useCallback(() => {
    const list = listRef.current;
    const spring = springRef.current;
    if (!list || !spring) return;

    const triggers = Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]'));
    rectsRef.current = triggers.map((trigger) => ({
      left: trigger.offsetLeft,
      width: trigger.offsetWidth,
    }));

    const rect = rectsRef.current[index];
    if (!rect) return;

    for (const element of [thumbRef.current, handleRef.current]) {
      if (element) element.style.width = `${rect.width}px`;
    }
    // A resize is not a state change: land on the new geometry, don't fly to it.
    if (!dragRef.current) spring.jumpTo(rect.left);
  }, [index]);

  useLayoutEffect(() => {
    // Built here rather than during render: it owns a rAF loop and paints the
    // DOM, and it must survive every re-render of this component.
    springRef.current ??= new Spring(0, {
      damping: 1,
      response: 0.35,
      onChange: paint,
    });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    if (listRef.current) observer.observe(listRef.current);
    return () => observer.disconnect();
  }, [measure, paint]);

  // A selection made by tap or keyboard — moved, not thrown, so no overshoot.
  useEffect(() => {
    const spring = springRef.current;
    const rect = rectsRef.current[index];
    if (!spring || !rect || dragRef.current) return;
    if (spring.value === rect.left) return;

    if (prefersReducedMotion()) {
      spring.jumpTo(rect.left);
      return;
    }
    spring.animateTo(rect.left, undefined, { damping: 1, response: 0.35 });
  }, [index]);

  useEffect(() => () => springRef.current?.stop(), []);

  function onPointerDown(event: React.PointerEvent<HTMLSpanElement>) {
    const spring = springRef.current;
    const list = listRef.current;
    if (!spring || !list || event.button !== 0) return;

    // Interrupting a spring mid-flight is normal: keep the value it is showing
    // right now, not the one it was heading for.
    spring.stop();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      grabOffset: event.clientX - list.getBoundingClientRect().left - spring.value,
      moved: false,
      history: [{ x: event.clientX, time: event.timeStamp }],
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLSpanElement>) {
    const drag = dragRef.current;
    const spring = springRef.current;
    const list = listRef.current;
    const rects = rectsRef.current;
    if (!drag || !spring || !list || drag.pointerId !== event.pointerId) return;

    const wanted = event.clientX - list.getBoundingClientRect().left - drag.grabOffset;
    if (Math.abs(wanted - spring.value) > DRAG_THRESHOLD) drag.moved = true;

    const min = rects[0]?.left ?? 0;
    const max = rects[rects.length - 1]?.left ?? 0;
    spring.jumpTo(withRubberband(wanted, min, max));

    drag.history.push({ x: event.clientX, time: event.timeStamp });
    drag.history = drag.history.filter(
      (sample) => event.timeStamp - sample.time <= VELOCITY_WINDOW_MS,
    );
  }

  function onPointerUp(event: React.PointerEvent<HTMLSpanElement>) {
    const drag = dragRef.current;
    const spring = springRef.current;
    const rects = rectsRef.current;
    if (!drag || !spring || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;

    const velocity = drag.moved
      ? readVelocity(drag.history, event.clientX, event.timeStamp)
      : 0;
    // Land where the throw was going, not where the finger let go.
    const projected = spring.value + project(velocity, DECELERATION);
    const target = nearestIndex(rects, projected);
    const rect = rects[target];

    if (rect) {
      if (prefersReducedMotion()) {
        spring.jumpTo(rect.left);
      } else {
        // Momentum preceded this one, so a little overshoot is honest.
        spring.animateTo(rect.left, velocity, { damping: 0.8, response: 0.35 });
      }
    }
    if (segments[target] && segments[target].value !== value) {
      onValueChange(segments[target].value);
    }
  }

  return (
    <TabsList
      ref={listRef}
      className={cn(
        "relative h-10 w-full rounded-full bg-muted/80 p-[3px]",
        className,
      )}
    >
      {/* Below the labels: the pill the labels sit on. */}
      <span
        ref={thumbRef}
        aria-hidden
        className="pointer-events-none absolute top-[3px] bottom-[3px] left-0 rounded-full bg-card shadow-e1 dark:bg-input/60"
      />
      {segments.map((segment) => (
        <TabsTrigger
          key={segment.value}
          value={segment.value}
          className="z-10 h-full rounded-full text-[0.8125rem] data-active:bg-transparent data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-transparent"
        >
          {segment.label}
        </TabsTrigger>
      ))}
      {/*
       * Above the labels: an invisible handle covering the selected segment
       * only. Pressing it is a no-op (that segment is already selected), so it
       * can own the drag without ever competing with a tap on another one.
       */}
      <span
        ref={handleRef}
        aria-hidden
        className="absolute top-[3px] bottom-[3px] left-0 z-20 touch-pan-y"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </TabsList>
  );
}

/** px/s over the tail of the gesture, so a pause before release reads as a stop. */
function readVelocity(
  history: { x: number; time: number }[],
  x: number,
  time: number,
) {
  const oldest = history[0];
  if (!oldest) return 0;
  const elapsed = time - oldest.time;
  if (elapsed <= 0) return 0;
  return ((x - oldest.x) / elapsed) * 1000;
}

function nearestIndex(rects: { left: number }[], x: number) {
  let best = 0;
  let bestDistance = Infinity;
  rects.forEach((rect, index) => {
    const distance = Math.abs(rect.left - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

function prefersReducedMotion() {
  return (
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

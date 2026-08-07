import { describe, expect, it, vi } from "vitest";
import { Spring, project, rubberband, withRubberband } from "./spring";

/** Runs the spring to rest at a fixed 60fps, returning every value it passed through. */
function settle(spring: Spring, maxFrames = 600) {
  const values: number[] = [];
  for (let frame = 0; frame < maxFrames; frame++) {
    const atRest = spring.step(1 / 60);
    values.push(spring.value);
    if (atRest) break;
  }
  return values;
}

describe("Spring", () => {
  it("settles on the target without overshooting when critically damped", () => {
    const spring = new Spring(0, { damping: 1, response: 0.4, onChange: () => {} });
    spring.target = 100;

    const values = settle(spring);

    expect(Math.max(...values)).toBeLessThanOrEqual(100);
    expect(spring.value).toBe(100);
  });

  it("overshoots and comes back when under-damped", () => {
    const spring = new Spring(0, { damping: 0.8, response: 0.4, onChange: () => {} });
    spring.target = 100;

    const values = settle(spring);

    expect(Math.max(...values)).toBeGreaterThan(100);
    expect(spring.value).toBe(100);
  });

  it("reaches the target sooner with a shorter response", () => {
    const slow = new Spring(0, { damping: 1, response: 0.4, onChange: () => {} });
    const fast = new Spring(0, { damping: 1, response: 0.2, onChange: () => {} });
    slow.target = 100;
    fast.target = 100;

    expect(settle(fast).length).toBeLessThan(settle(slow).length);
  });

  it("carries the release velocity into the motion", () => {
    const thrown = new Spring(0, { damping: 1, response: 0.4, onChange: () => {} });
    const still = new Spring(0, { damping: 1, response: 0.4, onChange: () => {} });
    thrown.target = 100;
    thrown.velocity = 600;
    still.target = 100;

    thrown.step(1 / 60);
    still.step(1 / 60);

    expect(thrown.value).toBeGreaterThan(still.value);
  });

  it("keeps its speed when the target changes mid-flight", () => {
    const spring = new Spring(0, { damping: 1, response: 0.4, onChange: () => {} });
    spring.target = 100;
    for (let frame = 0; frame < 6; frame++) spring.step(1 / 60);

    const speedBefore = spring.velocity;
    spring.animateTo(200);
    spring.stop(); // only the re-target is under test, not the rAF loop

    expect(spring.velocity).toBe(speedBefore);
    expect(spring.target).toBe(200);
  });

  it("does not explode when a frame is dropped", () => {
    const spring = new Spring(0, { damping: 1, response: 0.4, onChange: () => {} });
    spring.target = 100;

    spring.step(4); // four seconds between frames — a backgrounded tab

    expect(Number.isFinite(spring.value)).toBe(true);
    expect(Math.abs(spring.value)).toBeLessThan(200);
  });

  it("reports the value it was driven to directly", () => {
    const onChange = vi.fn();
    const spring = new Spring(0, { damping: 1, response: 0.4, onChange });

    spring.jumpTo(42);

    expect(spring.value).toBe(42);
    expect(spring.velocity).toBe(0);
    expect(onChange).toHaveBeenCalledWith(42);
  });
});

describe("project", () => {
  it("throws further the faster the flick", () => {
    expect(project(1000)).toBeGreaterThan(project(200));
  });

  it("follows the direction of the gesture", () => {
    expect(project(-500)).toBe(-project(500));
  });

  it("goes nowhere without velocity", () => {
    expect(project(0)).toBe(0);
  });

  it("travels less with a lower deceleration rate", () => {
    expect(project(500, 0.99)).toBeLessThan(project(500, 0.998));
  });
});

describe("rubberband", () => {
  it("resists rather than stopping dead", () => {
    expect(rubberband(50, 300)).toBeGreaterThan(0);
    expect(rubberband(50, 300)).toBeLessThan(50);
  });

  it("resists harder the further past the edge you pull", () => {
    const near = rubberband(20, 300) / 20;
    const far = rubberband(200, 300) / 200;

    expect(far).toBeLessThan(near);
  });

  it("stays put at the boundary", () => {
    expect(rubberband(0, 300)).toBe(0);
  });
});

describe("withRubberband", () => {
  it("tracks the pointer exactly inside the bounds", () => {
    expect(withRubberband(120, 0, 300)).toBe(120);
  });

  it("falls behind the pointer past either end", () => {
    expect(withRubberband(-100, 0, 300)).toBeGreaterThan(-100);
    expect(withRubberband(-100, 0, 300)).toBeLessThan(0);
    expect(withRubberband(400, 0, 300)).toBeLessThan(400);
    expect(withRubberband(400, 0, 300)).toBeGreaterThan(300);
  });
});

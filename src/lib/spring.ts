/**
 * A spring, described the way a designer thinks about one.
 *
 * `damping` is the damping ratio: 1 settles without overshoot, below 1 bounces.
 * `response` is roughly how long the value takes to reach the target, in
 * seconds. Neither is mass/stiffness — those are physics, not intent.
 *
 * The point of using a spring rather than a keyframed curve is interruption. A
 * spring always animates from wherever the value currently is, at whatever
 * speed it is currently moving, so re-targeting mid-flight is continuous: no
 * jump back to a logical start value, no velocity discontinuity when a gesture
 * reverses.
 */

export interface SpringOptions {
  /** Damping ratio. 1 = critically damped (no overshoot). */
  damping?: number;
  /** Response time in seconds — lower is snappier. */
  response?: number;
  /**
   * Called with the value on every step, including the final resting one. It
   * can also be assigned after construction, so the spring can outlive the
   * closure that paints it.
   */
  onChange?: (value: number) => void;
}

/** Below this distance and speed the motion is finished, in px and px/s. */
const REST_DISTANCE = 0.15;
const REST_VELOCITY = 0.15;
/** A tab switch or a stalled frame must not integrate a huge time step. */
const MAX_STEP = 1 / 30;

export class Spring {
  value: number;
  velocity = 0;
  target: number;

  onChange: ((value: number) => void) | undefined;

  private damping: number;
  private response: number;
  private frame: number | null = null;
  private lastTime = 0;

  constructor(value: number, options: SpringOptions = {}) {
    this.value = value;
    this.target = value;
    this.damping = options.damping ?? 1;
    this.response = options.response ?? 0.4;
    this.onChange = options.onChange;
  }

  get isAnimating() {
    return this.frame !== null;
  }

  /**
   * Aims at a new target from the current value *and* the current velocity.
   * Calling this mid-flight is the normal case, not an edge case.
   *
   * `tuning` retunes the spring for this motion — the same value can be moved
   * bluntly by a click and bouncily by a flick, and only the flick earned the
   * overshoot.
   */
  animateTo(
    target: number,
    initialVelocity?: number,
    tuning?: { damping?: number; response?: number },
  ) {
    if (tuning?.damping !== undefined) this.damping = tuning.damping;
    if (tuning?.response !== undefined) this.response = tuning.response;
    this.target = target;
    if (initialVelocity !== undefined) this.velocity = initialVelocity;
    if (this.frame === null) {
      this.lastTime = now();
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  /** Drives the value directly — used while a pointer is tracking it 1:1. */
  jumpTo(value: number) {
    this.stop();
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.onChange?.(value);
  }

  stop() {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }

  /**
   * Integrates one step of a damped harmonic oscillator. Exposed so the motion
   * can be exercised without a display refresh.
   *
   * @param dt seconds
   * @returns true once the spring has come to rest
   */
  step(dt: number): boolean {
    const w0 = (2 * Math.PI) / this.response;
    const displacement = this.value - this.target;
    const acceleration = -w0 * w0 * displacement - 2 * this.damping * w0 * this.velocity;

    this.velocity += acceleration * Math.min(dt, MAX_STEP);
    this.value += this.velocity * Math.min(dt, MAX_STEP);

    if (
      Math.abs(this.value - this.target) < REST_DISTANCE &&
      Math.abs(this.velocity) < REST_VELOCITY
    ) {
      this.value = this.target;
      this.velocity = 0;
      return true;
    }
    return false;
  }

  private tick = () => {
    const time = now();
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;

    const atRest = this.step(dt);
    this.onChange?.(this.value);

    if (atRest) {
      this.frame = null;
      return;
    }
    this.frame = requestAnimationFrame(this.tick);
  };
}

function now() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

/**
 * Where a flick would come to rest on its own, given the velocity it was
 * released at. Snapping to the nearest target from the *release point* ignores
 * the throw; snapping to the nearest target from the projected point is what
 * makes a small flick travel a long way.
 *
 * This is the exponential-decay form scroll views use — not the textbook
 * v² / 2a, which decelerates too abruptly to feel like scrolling.
 *
 * @param velocity px/s at release
 * @param decelerationRate 0.998 matches normal scroll feel; lower is snappier
 * @returns the distance still to travel, in px
 */
export function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Progressive resistance past a boundary. A hard stop reads as frozen; falling
 * further and further behind the finger reads as "responsive, but there is
 * nothing more here".
 *
 * @param overshoot how far past the boundary the pointer has travelled, in px
 * @param dimension the size of the draggable area, in px
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  if (dimension <= 0) return 0;
  return (
    (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))
  );
}

/**
 * Clamps a value to a range, replacing the part outside it with rubber-banded
 * resistance rather than a hard stop.
 */
export function withRubberband(value: number, min: number, max: number) {
  const span = max - min;
  if (value < min) return min + rubberband(value - min, span);
  if (value > max) return max + rubberband(value - max, span);
  return value;
}

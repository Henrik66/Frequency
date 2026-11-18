/** Simulation rate. All sim code assumes this fixed step. */
export const SIM_HZ = 120;
export const SIM_DT = 1 / SIM_HZ;

/** Cap on steps per frame so a long stall cannot snowball (spiral of death). */
export const MAX_STEPS_PER_FRAME = 5;

export interface FixedStepper {
  /**
   * Advance by a real frame delta in seconds, calling step() zero or more times.
   * Returns the interpolation alpha (0 to 1) for rendering between sim states.
   */
  advance(frameDt: number, step: (dt: number) => void): number;
  /** Total sim steps taken. Replays index input by this. */
  readonly steps: number;
}

export function createFixedStepper(dt = SIM_DT, maxSteps = MAX_STEPS_PER_FRAME): FixedStepper {
  let acc = 0;
  let steps = 0;
  return {
    advance(frameDt, step) {
      acc += Math.max(0, frameDt);
      let n = 0;
      while (acc >= dt && n < maxSteps) {
        step(dt);
        acc -= dt;
        steps++;
        n++;
      }
      // Drop backlog we could not simulate instead of carrying it forever.
      if (n === maxSteps && acc >= dt) acc = acc % dt;
      return acc / dt;
    },
    get steps() {
      return steps;
    },
  };
}

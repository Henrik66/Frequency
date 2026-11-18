import { describe, expect, it } from 'vitest';
import { createFixedStepper, SIM_DT } from '../../src/sim/fixedStep';

describe('createFixedStepper', () => {
  it('takes whole steps and returns the leftover as alpha', () => {
    const s = createFixedStepper();
    let calls = 0;
    const alpha = s.advance(SIM_DT * 2.5, () => calls++);
    expect(calls).toBe(2);
    expect(alpha).toBeCloseTo(0.5);
    expect(s.steps).toBe(2);
  });

  it('caps steps per frame after a long stall', () => {
    const s = createFixedStepper(SIM_DT, 5);
    let calls = 0;
    const alpha = s.advance(1, () => calls++);
    expect(calls).toBe(5);
    expect(alpha).toBeGreaterThanOrEqual(0);
    expect(alpha).toBeLessThan(1);
  });

  it('ignores negative deltas', () => {
    const s = createFixedStepper();
    let calls = 0;
    s.advance(-1, () => calls++);
    expect(calls).toBe(0);
  });
});

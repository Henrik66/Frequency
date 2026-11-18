import { describe, expect, it } from 'vitest';
import { blendPhysics, isStatic, signalStrength, strengths } from '../../src/sim/signal';
import { STATIONS } from '../../src/sim/stations';

describe('signalStrength', () => {
  it('is 1 when tuned exactly and 0 at one width away', () => {
    expect(signalStrength(88.3, 88.3)).toBe(1);
    expect(signalStrength(89.3, 88.3)).toBe(0);
    expect(signalStrength(87.3, 88.3)).toBe(0);
  });

  it('falls off linearly', () => {
    expect(signalStrength(88.8, 88.3)).toBeCloseTo(0.5);
  });
});

describe('static', () => {
  it('is static between stations and not on one', () => {
    expect(isStatic(strengths(91.0, STATIONS))).toBe(true);
    expect(isStatic(strengths(93.7, STATIONS))).toBe(false);
  });
});

describe('blendPhysics', () => {
  it('returns base physics in static', () => {
    expect(blendPhysics(strengths(91.0, STATIONS), STATIONS).gravity).toBe(1);
  });

  it('returns full station physics when tuned exactly', () => {
    expect(blendPhysics(strengths(88.3, STATIONS), STATIONS).gravity).toBeCloseTo(0.45);
  });

  it('gives half the effect when half tuned', () => {
    // Velvet gravity 0.45: half way from 1 is 0.725.
    expect(blendPhysics(strengths(88.8, STATIONS), STATIONS).gravity).toBeCloseTo(0.725);
  });
});

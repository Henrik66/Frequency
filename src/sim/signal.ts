import {
  BASE_PHYSICS,
  SIGNAL_WIDTH,
  SOLID_THRESHOLD,
  type PhysicsModifiers,
  type Station,
  type StationId,
} from './stations';

/** Strength of a station at dial frequency f: 1 when exact, 0 at SIGNAL_WIDTH away. */
export function signalStrength(f: number, stationFreq: number, width = SIGNAL_WIDTH): number {
  return Math.max(0, 1 - Math.abs(f - stationFreq) / width);
}

export type Strengths = Record<StationId, number>;

/** Strength of every station at dial frequency f. */
export function strengths(f: number, stations: readonly Station[]): Strengths {
  const out = { velvet: 0, riot: 0, forecast: 0, rewind: 0 } satisfies Strengths;
  for (const s of stations) out[s.id] = signalStrength(f, s.freq);
  return out;
}

export function isSolid(strength: number): boolean {
  return strength >= SOLID_THRESHOLD;
}

/** True when no station is strong enough to be solid, so the static layer is. */
export function isStatic(all: Strengths): boolean {
  return !Object.values(all).some(isSolid);
}

/**
 * Blended physics: value = base + sum of s_i * (station value - base).
 * Half-tuned to a station gives half its effect.
 */
export function blendPhysics(all: Strengths, stations: readonly Station[]): PhysicsModifiers {
  const out: PhysicsModifiers = { ...BASE_PHYSICS };
  const keys = Object.keys(BASE_PHYSICS) as (keyof PhysicsModifiers)[];
  for (const s of stations) {
    const w = all[s.id];
    if (w === 0) continue;
    for (const k of keys) out[k] += w * (s.physics[k] - BASE_PHYSICS[k]);
  }
  return out;
}

// Station definitions. Values come from the PRD's Stations table.
// sim/ is pure TypeScript: no DOM, no three.js, no wall-clock time, no Math.random.

export type StationId = 'velvet' | 'riot' | 'forecast' | 'rewind';

export interface PhysicsModifiers {
  /** Gravity multiplier. Negative inverts gravity. */
  gravity: number;
  /** Simulation time multiplier. */
  timeScale: number;
  /** Horizontal run speed multiplier. */
  runSpeed: number;
  /** Jump velocity multiplier. */
  jump: number;
}

export interface Station {
  id: StationId;
  name: string;
  /** Frequency in MHz on the 88.0 to 108.0 band. */
  freq: number;
  physics: PhysicsModifiers;
}

export const BAND_MIN = 88.0;
export const BAND_MAX = 108.0;

/** Signal falls from 1 to 0 over this distance (MHz) from a station. */
export const SIGNAL_WIDTH = 1.0;

/** A station's tiles are solid at or above this strength. */
export const SOLID_THRESHOLD = 0.6;

export const BASE_PHYSICS: Readonly<PhysicsModifiers> = {
  gravity: 1,
  timeScale: 1,
  runSpeed: 1,
  jump: 1,
};

export const STATIONS: readonly Station[] = [
  {
    id: 'velvet',
    name: 'Velvet',
    freq: 88.3,
    physics: { gravity: 0.45, timeScale: 0.8, runSpeed: 0.8, jump: 1 },
  },
  {
    id: 'riot',
    name: 'Riot',
    freq: 93.7,
    physics: { gravity: 1.4, timeScale: 1, runSpeed: 1.5, jump: 0.8 },
  },
  {
    id: 'forecast',
    name: 'Forecast',
    freq: 99.1,
    physics: { gravity: 1, timeScale: 1, runSpeed: 1, jump: 1 },
  },
  {
    id: 'rewind',
    name: 'Rewind',
    freq: 104.5,
    physics: { gravity: -1, timeScale: 1, runSpeed: 1, jump: 1 },
  },
];

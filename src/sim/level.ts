// Level files: one ASCII grid per layer, rows listed top to bottom.
// In the sim, y points up: row r of a level with height H is y = H - 1 - r.
import type { StationId } from './stations';

export type LayerId = 'always' | StationId | 'static';
export const STATION_LAYERS: readonly StationId[] = ['velvet', 'riot', 'forecast', 'rewind'];

export interface LevelFile {
  id: string;
  title: string;
  hint?: string;
  dialStart: number;
  stations?: StationId[];
  layers: Partial<Record<LayerId, string[]>>;
  par?: { dialTurns: number };
}

export interface Tile {
  x: number;
  y: number;
}

export interface Level {
  id: string;
  title: string;
  hint: string;
  width: number;
  height: number;
  dialStart: number;
  /** Solid tiles per layer, indexed y * width + x. */
  solid: Record<LayerId, Uint8Array>;
  hazards: Uint8Array;
  start: Tile;
  exit: Tile;
  tapes: Tile[];
}

const LAYERS: readonly LayerId[] = ['always', ...STATION_LAYERS, 'static'];

export function parseLevel(file: LevelFile): Level {
  const rowsOf = (id: LayerId) => file.layers[id];
  const always = rowsOf('always');
  if (!always || always.length === 0) throw new Error(`${file.id}: missing "always" layer`);
  const height = always.length;
  const width = always[0]?.length ?? 0;

  const solid = {} as Record<LayerId, Uint8Array>;
  for (const id of LAYERS) solid[id] = new Uint8Array(width * height);
  const hazards = new Uint8Array(width * height);
  const tapes: Tile[] = [];
  let start: Tile | undefined;
  let exit: Tile | undefined;

  for (const id of LAYERS) {
    const rows = rowsOf(id);
    if (!rows) continue;
    if (rows.length !== height) throw new Error(`${file.id}: layer "${id}" has ${rows.length} rows, expected ${height}`);
    rows.forEach((row, r) => {
      if (row.length !== width) throw new Error(`${file.id}: layer "${id}" row ${r} is ${row.length} wide, expected ${width}`);
      const y = height - 1 - r;
      for (let x = 0; x < width; x++) {
        const c = row[x];
        if (c === '.' || c === undefined) continue;
        const i = y * width + x;
        if (c === 'S') start = { x, y };
        else if (c === 'E') exit = { x, y };
        else if (c === 'T') tapes.push({ x, y });
        else if (c === '^') hazards[i] = 1;
        else solid[id][i] = 1;
      }
    });
  }

  if (!start) throw new Error(`${file.id}: no start (S)`);
  if (!exit) throw new Error(`${file.id}: no exit (E)`);
  return {
    id: file.id,
    title: file.title,
    hint: file.hint ?? '',
    width,
    height,
    dialStart: file.dialStart,
    solid,
    hazards,
    start,
    exit,
    tapes,
  };
}

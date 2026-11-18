import { describe, expect, it } from 'vitest';
import { SIM_DT } from '../../src/sim/fixedStep';
import { parseLevel, type LevelFile } from '../../src/sim/level';
import { EMPTY_INPUT, TUNING, World, type InputFrame } from '../../src/sim/world';
import spike01 from '../../levels/spike-01.level.json';
import spike02 from '../../levels/spike-02.level.json';
import spike03 from '../../levels/spike-03.level.json';

const FILES: Record<string, LevelFile> = {
  'spike-01': spike01 as LevelFile,
  'spike-02': spike02 as LevelFile,
  'spike-03': spike03 as LevelFile,
};
const load = (id: string) => parseLevel(FILES[id]!);

const flat = (dialStart: number, extra: LevelFile['layers'] = {}): LevelFile => ({
  id: 'test',
  title: 'test',
  dialStart,
  layers: {
    always: ['..........', '..........', '..........', '..........', '.S......E.', '##########'],
    ...extra,
  },
});

function run(world: World, input: Partial<InputFrame>, steps: number) {
  for (let i = 0; i < steps; i++) world.step({ ...EMPTY_INPUT, ...input }, SIM_DT);
}

describe('levels', () => {
  it('parses every spike level', () => {
    for (const id of ['spike-01', 'spike-02', 'spike-03']) expect(() => load(id)).not.toThrow();
  });

  it('rejects rows of the wrong width', () => {
    expect(() => parseLevel({ ...flat(91), layers: { always: ['S.', 'E'] } })).toThrow(/wide/);
  });
});

describe('player', () => {
  it('stands on the floor', () => {
    const w = new World(parseLevel(flat(91)));
    run(w, {}, 60);
    expect(w.player.grounded).toBe(true);
    expect(w.player.y).toBeCloseTo(1);
  });

  it('jumps about v^2 / 2g tiles at base gravity', () => {
    const w = new World(parseLevel(flat(91)));
    run(w, {}, 10);
    let peak = 0;
    w.step({ ...EMPTY_INPUT, jumpPressed: true, jumpHeld: true }, SIM_DT);
    for (let i = 0; i < 120; i++) {
      w.step({ ...EMPTY_INPUT, jumpHeld: true }, SIM_DT);
      peak = Math.max(peak, w.player.y - 1);
    }
    const expected = TUNING.jumpVelocity ** 2 / (2 * TUNING.gravity);
    expect(peak).toBeGreaterThan(expected * 0.95);
    expect(peak).toBeLessThan(expected * 1.05);
  });

  it('jumps higher on Velvet', () => {
    const heightAt = (dial: number) => {
      const w = new World(parseLevel(flat(dial)));
      run(w, {}, 10);
      w.step({ ...EMPTY_INPUT, jumpPressed: true, jumpHeld: true }, SIM_DT);
      let peak = 0;
      for (let i = 0; i < 300; i++) {
        w.step({ ...EMPTY_INPUT, jumpHeld: true }, SIM_DT);
        peak = Math.max(peak, w.player.y - 1);
      }
      return peak;
    };
    expect(heightAt(88.3)).toBeGreaterThan(heightAt(91) * 2);
  });
});

describe('dial', () => {
  it('turns no faster than its max speed', () => {
    const w = new World(parseLevel(flat(91)));
    run(w, { tune: 1 }, 120);
    expect(w.dial.freq - 91).toBeLessThanOrEqual(TUNING.dialMaxSpeed + 1e-6);
    expect(w.dial.freq - 91).toBeGreaterThan(TUNING.dialMaxSpeed * 0.7);
  });

  it('refuses to make a tile solid inside the player when there is nowhere to go', () => {
    // A Velvet tile on the player's spot, walled in so there is no room to push out.
    const level = parseLevel({
      id: 'crush',
      title: 'crush',
      dialStart: 91,
      layers: {
        always: ['#####', '##.##', '#ES.#', '#####'],
        velvet: ['.....', '..v..', '.v.v.', '.....'],
      },
    });
    const w = new World(level);
    // Put Velvet tiles over the player's whole neighbourhood.
    level.solid.velvet[1 * 5 + 2] = 1;
    run(w, { wheel: -1 }, 1);
    run(w, { tune: -1 }, 240);
    expect(w.dial.freq).toBeGreaterThan(88.3 + 0.39);
  });

  it('pushes the player up out of a tile that appears under their feet', () => {
    const w = new World(parseLevel(flat(91, { static: ['..........', '..........', '..........', '..........', '..........', '..........'] })));
    run(w, {}, 30);
    const level = w.level;
    // A Velvet tile at the player's feet level.
    level.solid.velvet[1 * level.width + 1] = 1;
    run(w, { tune: -1 }, 240);
    expect(w.dial.freq).toBeLessThan(88.6);
    expect(w.player.y).toBeGreaterThanOrEqual(2 - 1e-6);
  });
});

describe('spike-01 solution', () => {
  it('reaches the exit by tuning to Velvet and walking right', () => {
    const w = new World(load('spike-01'));
    run(w, { wheel: -27 }, 1); // 27 notches: 91.0 down to Velvet at 88.3
    run(w, {}, 180);
    expect(w.dial.freq).toBeCloseTo(88.3, 2);
    let won = false;
    for (let i = 0; i < 1200 && !won; i++) {
      w.step({ ...EMPTY_INPUT, right: true }, SIM_DT);
      won = w.won;
    }
    expect(won).toBe(true);
    expect(w.deaths).toBe(0);
  });
});

/** Run a scripted controller until the level is won or time runs out. */
function play(w: World, control: (w: World) => Partial<InputFrame>, maxSteps = 120 * 30) {
  let prevJump = false;
  for (let i = 0; i < maxSteps && !w.won; i++) {
    const c = control(w);
    const jump = c.jumpHeld ?? false;
    w.step({ ...EMPTY_INPUT, ...c, jumpPressed: jump && !prevJump }, SIM_DT);
    prevJump = jump;
  }
  return w.won;
}

describe('spike-02 solution', () => {
  it('clears the wall on Velvet, then crosses the pit on Riot', () => {
    const w = new World(load('spike-02'));
    let phase = 0;
    const won = play(w, (w) => {
      const x = w.player.x;
      const f = w.dial.freq;
      if (phase === 0) {
        phase = 1;
        return { wheel: -27 }; // to Velvet
      }
      if (phase === 1) {
        if (Math.abs(f - 88.3) > 0.01) return {};
        if (x > 17.2 && w.player.grounded) {
          phase = 2;
          return { wheel: 54 }; // to Riot, standing clear of the static pillar
        }
        return { right: true, jumpHeld: x > 9.5 && x < 12 };
      }
      if (Math.abs(f - 93.7) > 0.01) return {};
      return { right: true };
    });
    expect(won).toBe(true);
    expect(w.deaths).toBe(0);
  });
});

describe('spike-03 solution', () => {
  it('needs a half-tuned dial to reach the ledge without hitting the spikes', () => {
    const w = new World(load('spike-03'));
    let tuned = false;
    const won = play(w, (w) => {
      if (!tuned) {
        tuned = true;
        return { wheel: 4 }; // 88.7: Velvet at 60%
      }
      if (Math.abs(w.dial.freq - 88.7) > 0.01) return {};
      return { right: true, jumpHeld: w.player.x > 12.3 && w.player.x < 14 };
    });
    expect(won).toBe(true);
    expect(w.deaths).toBe(0);
  });

  it('kills a full-Velvet jump on the ceiling spikes', () => {
    const w = new World(load('spike-03'));
    play(w, (w) => ({ right: true, jumpHeld: w.player.x > 12.3 && w.player.x < 14 }), 120 * 4);
    expect(w.deaths).toBeGreaterThan(0);
  });
});

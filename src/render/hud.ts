// Spike HUD: the radio band at the bottom, level info at the top.
// The finished HUD moves to src/ui/ (Devin A) once the look is decided.
import type { Level } from '../sim/level';
import { BAND_MAX, BAND_MIN, STATIONS } from '../sim/stations';
import type { World } from '../sim/world';
import { STATION_COLORS } from './view';

export interface Hud {
  load(level: Level, index: number, total: number): void;
  update(world: World): void;
  flash(text: string): void;
}

const pct = (f: number) => ((f - BAND_MIN) / (BAND_MAX - BAND_MIN)) * 100;

export function createHud(root: HTMLElement): Hud {
  root.innerHTML = `
    <div class="hud-top"><div class="hud-title"></div><div class="hud-hint"></div></div>
    <div class="hud-flash"></div>
    <div class="radio">
      <div class="readout"><span class="freq"></span><span class="station"></span><span class="phys"></span></div>
      <div class="band">
        ${STATIONS.map((s) => `<div class="marker" style="left:${pct(s.freq)}%;--c:${STATION_COLORS[s.id]}"><span>${s.name}</span></div>`).join('')}
        <div class="needle"></div>
      </div>
      <div class="keys">Scroll or Q / E tune · Shift fine-tune · Space jump · R restart · N / P level</div>
    </div>`;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const title = q('.hud-title');
  const hint = q('.hud-hint');
  const flashEl = q('.hud-flash');
  const freq = q('.freq');
  const station = q('.station');
  const phys = q('.phys');
  const needle = q('.needle');
  let flashTimer: ReturnType<typeof setTimeout> | undefined;

  return {
    load(level, index, total) {
      title.textContent = `${index + 1} / ${total} · ${level.title}`;
      hint.textContent = level.hint;
    },
    update(world) {
      const f = world.dial.freq;
      freq.textContent = `${f.toFixed(2)} MHz`;
      let best = STATIONS[0]!;
      for (const s of STATIONS) if (world.strengths[s.id] > world.strengths[best.id]) best = s;
      const sBest = world.strengths[best.id];
      station.textContent = world.staticOn ? (sBest > 0 ? `static · ${best.name} ${Math.round(sBest * 100)}%` : 'static') : `${best.name} ${Math.round(sBest * 100)}%`;
      station.style.color = world.staticOn ? '#9a9aa6' : STATION_COLORS[best.id];
      phys.textContent = `gravity ×${world.physics.gravity.toFixed(2)}`;
      needle.style.left = `${pct(f)}%`;
    },
    flash(text) {
      flashEl.textContent = text;
      flashEl.classList.add('on');
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => flashEl.classList.remove('on'), 900);
    },
  };
}

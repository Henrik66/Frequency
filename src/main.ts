// Boot and frame loop for the week 1 spike.
import { createPlaceholderAudio } from './audio/placeholder';
import { createKeyboard } from './input/keyboard';
import { createHud } from './render/hud';
import { createView } from './render/view';
import { createFixedStepper } from './sim/fixedStep';
import { parseLevel, type LevelFile } from './sim/level';
import { World } from './sim/world';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const hudEl = document.querySelector<HTMLDivElement>('#hud');
const boot = document.querySelector<HTMLDivElement>('#boot');
if (!canvas || !hudEl || !boot) throw new Error('Missing #game, #hud or #boot in index.html');

const files = import.meta.glob<LevelFile>('../levels/*.level.json', { eager: true, import: 'default' });
const levels = Object.keys(files)
  .sort()
  .map((k) => parseLevel(files[k]!));
if (levels.length === 0) throw new Error('No levels found in levels/');

const view = createView(canvas);
const hud = createHud(hudEl);
const keyboard = createKeyboard(window);
const audio = createPlaceholderAudio();
keyboard.onFirstInput(() => audio.resume());

let index = 0;
let world = new World(levels[0]!);
let winTimer = -1;

function loadLevel(i: number) {
  index = (i + levels.length) % levels.length;
  const level = levels[index]!;
  world = new World(level);
  view.load(level);
  hud.load(level, index, levels.length);
  winTimer = -1;
}

window.addEventListener('resize', view.resize);
view.resize();
loadLevel(0);

const stepper = createFixedStepper();
let last = performance.now();

function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  for (const cmd of keyboard.takeCommands()) loadLevel(cmd === 'KeyN' ? index + 1 : index - 1);

  const alpha = stepper.advance(dt, (step) => {
    world.step(keyboard.sample(), step);
    for (const e of world.events) {
      audio.event(e);
      if (e === 'win') {
        hud.flash('Clear');
        winTimer = 0.8;
      } else if (e === 'tape') hud.flash('Lost tape found');
    }
  });

  if (winTimer > 0) {
    winTimer -= dt;
    if (winTimer <= 0) loadLevel(index + 1);
  }

  audio.update(world);
  hud.update(world);
  view.render(world, alpha, dt);
  requestAnimationFrame(frame);
}

requestAnimationFrame((t) => {
  last = t;
  frame(t);
  boot.classList.add('hidden');
});

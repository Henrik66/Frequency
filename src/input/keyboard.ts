// Keyboard and mouse wheel into one InputFrame per sim step.
import type { InputFrame } from '../sim/world';

const LEFT = ['KeyA', 'ArrowLeft'];
const RIGHT = ['KeyD', 'ArrowRight'];
const JUMP = ['Space', 'KeyW', 'ArrowUp'];
const BLOCK_DEFAULT = new Set([...JUMP, 'ArrowDown', ...LEFT, ...RIGHT]);

/** Wheel pixels per notch. Mouse wheels send about 100; trackpads send many small deltas. */
const WHEEL_PX_PER_NOTCH = 60;

export interface Keyboard {
  /** Input for one sim step. Consumes pressed edges and wheel notches. */
  sample(): InputFrame;
  /** Keys pressed since the last call that are not game inputs (level select etc.). */
  takeCommands(): string[];
  onFirstInput(cb: () => void): void;
}

export function createKeyboard(target: Window): Keyboard {
  const held = new Set<string>();
  let jumpEdge = false;
  let restartEdge = false;
  let wheelPx = 0;
  let commands: string[] = [];
  let firstInput: (() => void) | undefined;
  const fireFirst = () => {
    firstInput?.();
    firstInput = undefined;
  };

  target.addEventListener('keydown', (e) => {
    fireFirst();
    if (BLOCK_DEFAULT.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    held.add(e.code);
    if (JUMP.includes(e.code)) jumpEdge = true;
    if (e.code === 'KeyR') restartEdge = true;
    if (e.code === 'KeyN' || e.code === 'KeyP') commands.push(e.code);
  });
  target.addEventListener('keyup', (e) => held.delete(e.code));
  target.addEventListener('blur', () => held.clear());
  target.addEventListener('pointerdown', fireFirst);
  target.addEventListener(
    'wheel',
    (e) => {
      fireFirst();
      e.preventDefault();
      // Scrolling up tunes up.
      wheelPx -= e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
    },
    { passive: false },
  );

  const any = (codes: string[]) => codes.some((c) => held.has(c));

  return {
    sample() {
      const notches = Math.trunc(wheelPx / WHEEL_PX_PER_NOTCH);
      wheelPx -= notches * WHEEL_PX_PER_NOTCH;
      const frame: InputFrame = {
        left: any(LEFT),
        right: any(RIGHT),
        jumpHeld: any(JUMP),
        jumpPressed: jumpEdge,
        tune: (held.has('KeyE') ? 1 : 0) - (held.has('KeyQ') ? 1 : 0),
        wheel: notches,
        fine: held.has('ShiftLeft') || held.has('ShiftRight'),
        restart: restartEdge,
      };
      jumpEdge = false;
      restartEdge = false;
      return frame;
    },
    takeCommands() {
      const out = commands;
      commands = [];
      return out;
    },
    onFirstInput(cb) {
      firstInput = cb;
    },
  };
}

// The whole simulation: dial, player, collision, hazards, exit.
// Pure and deterministic: same level + same input frames = same result.
import { STATION_LAYERS, type Level } from './level';
import { blendPhysics, isSolid, isStatic, strengths, type Strengths } from './signal';
import { BAND_MAX, BAND_MIN, STATIONS, type PhysicsModifiers } from './stations';

export interface InputFrame {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  /** True only on the step the jump key went down. */
  jumpPressed: boolean;
  /** Held tuning direction, -1, 0 or 1. */
  tune: number;
  /** Wheel notches this step (positive tunes up). */
  wheel: number;
  fine: boolean;
  restart: boolean;
}

export const EMPTY_INPUT: Readonly<InputFrame> = {
  left: false,
  right: false,
  jumpHeld: false,
  jumpPressed: false,
  tune: 0,
  wheel: 0,
  fine: false,
  restart: false,
};

export type WorldEvent = 'jump' | 'land' | 'die' | 'win' | 'thud' | 'tick' | 'tape' | 'lock';

// Feel constants, in tiles and seconds. Tune these in the spike.
export const TUNING = {
  run: 7,
  groundAccel: 70,
  airAccel: 40,
  gravity: 40,
  jumpVelocity: 14,
  jumpCut: 0.5,
  maxFall: 20,
  coyote: 0.1,
  jumpBuffer: 0.12,
  playerW: 0.6,
  playerH: 0.9,
  dialMaxSpeed: 5.5,
  dialFineSpeed: 0.8,
  dialAccel: 40,
  dialStiffness: 12,
  wheelStep: 0.1,
  wheelFineStep: 0.02,
  heldLead: 0.5,
};

const EPS = 1e-6;

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  jumping: boolean;
  coyote: number;
  buffer: number;
}

export interface Dial {
  freq: number;
  target: number;
  v: number;
}

export class World {
  readonly level: Level;
  readonly player: Player;
  readonly dial: Dial;
  /** Previous player position, for render interpolation. */
  prevX = 0;
  prevY = 0;
  strengths: Strengths;
  staticOn: boolean;
  physics: PhysicsModifiers;
  won = false;
  deaths = 0;
  tapesFound = new Set<number>();
  steps = 0;
  readonly events: WorldEvent[] = [];
  private thudCooldown = 0;
  private wasLocked = false;

  constructor(level: Level) {
    this.level = level;
    this.player = { x: 0, y: 0, vx: 0, vy: 0, grounded: false, jumping: false, coyote: 0, buffer: 0 };
    this.dial = { freq: level.dialStart, target: level.dialStart, v: 0 };
    this.strengths = strengths(this.dial.freq, STATIONS);
    this.staticOn = isStatic(this.strengths);
    this.physics = blendPhysics(this.strengths, STATIONS);
    this.respawn();
  }

  respawn(): void {
    const p = this.player;
    p.x = this.level.start.x + 0.5 - TUNING.playerW / 2;
    p.y = this.level.start.y;
    p.vx = p.vy = 0;
    p.grounded = p.jumping = false;
    p.coyote = p.buffer = 0;
    this.prevX = p.x;
    this.prevY = p.y;
    this.dial.freq = this.dial.target = this.level.dialStart;
    this.dial.v = 0;
    this.applyDial(this.dial.freq);
  }

  /** Is tile (tx, ty) solid at the given signal state? Outside left/right is wall. */
  solidAt(tx: number, ty: number, s: Strengths = this.strengths, staticOn = this.staticOn): boolean {
    const { width, height, solid } = this.level;
    if (tx < 0 || tx >= width) return true;
    if (ty < 0 || ty >= height) return false;
    const i = ty * width + tx;
    if (solid.always[i]) return true;
    for (const id of STATION_LAYERS) if (solid[id][i] && isSolid(s[id])) return true;
    return staticOn && solid.static[i] === 1;
  }

  private overlapsSolid(x: number, y: number, s?: Strengths, staticOn?: boolean): boolean {
    const x0 = Math.floor(x + EPS);
    const x1 = Math.floor(x + TUNING.playerW - EPS);
    const y0 = Math.floor(y + EPS);
    const y1 = Math.floor(y + TUNING.playerH - EPS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.solidAt(tx, ty, s, staticOn)) return true;
    return false;
  }

  private overlapsTile(t: { x: number; y: number }, shrink: number): boolean {
    const p = this.player;
    return (
      p.x + shrink < t.x + 1 && p.x + TUNING.playerW - shrink > t.x && p.y + shrink < t.y + 1 && p.y + TUNING.playerH - shrink > t.y
    );
  }

  private applyDial(freq: number): void {
    this.strengths = strengths(freq, STATIONS);
    this.staticOn = isStatic(this.strengths);
    this.physics = blendPhysics(this.strengths, STATIONS);
  }

  step(input: InputFrame, dt: number): void {
    this.events.length = 0;
    this.steps++;
    if (this.won) return;
    if (input.restart) {
      this.deaths++;
      this.respawn();
      return;
    }
    this.prevX = this.player.x;
    this.prevY = this.player.y;
    this.stepDial(input, dt);
    this.stepPlayer(input, dt * this.physics.timeScale);
    this.checkTiles();
  }

  private stepDial(input: InputFrame, dt: number): void {
    const d = this.dial;
    const T = TUNING;
    const maxSpeed = input.fine ? T.dialFineSpeed : T.dialMaxSpeed;
    if (input.wheel !== 0) d.target += input.wheel * (input.fine ? T.wheelFineStep : T.wheelStep);
    if (input.tune !== 0) {
      d.target += input.tune * maxSpeed * dt;
      // Keep the target close so releasing the key stops the dial quickly.
      d.target = Math.min(d.freq + T.heldLead, Math.max(d.freq - T.heldLead, d.target));
    }
    d.target = Math.min(BAND_MAX, Math.max(BAND_MIN, d.target));

    const desired = Math.max(-maxSpeed, Math.min(maxSpeed, (d.target - d.freq) * T.dialStiffness));
    const dv = desired - d.v;
    const maxDv = T.dialAccel * dt;
    d.v += Math.max(-maxDv, Math.min(maxDv, dv));
    let next = d.freq + d.v * dt;
    if (next <= BAND_MIN || next >= BAND_MAX) {
      next = Math.min(BAND_MAX, Math.max(BAND_MIN, next));
      d.v = 0;
    }
    if (Math.abs(next - d.freq) < 1e-9) return;

    // No-crush rule: if the new frequency puts a tile inside the player,
    // push the player out within 1 tile, or refuse to turn.
    const s = strengths(next, STATIONS);
    const st = isStatic(s);
    const p = this.player;
    if (this.overlapsSolid(p.x, p.y, s, st)) {
      const up = this.physics.gravity >= 0 ? 1 : -1;
      let moved = false;
      for (const dist of [0.25, 0.5, 0.75, 1]) {
        const tries: [number, number][] = [
          [0, dist * up],
          [-dist, 0],
          [dist, 0],
          [-dist, dist * up],
          [dist, dist * up],
          [0, -dist * up],
        ];
        for (const [ox, oy] of tries) {
          if (!this.overlapsSolid(p.x + ox, p.y + oy, s, st)) {
            p.x += ox;
            p.y += oy;
            moved = true;
            break;
          }
        }
        if (moved) break;
      }
      if (!moved) {
        d.v = 0;
        d.target = d.freq;
        if (this.thudCooldown <= 0) {
          this.events.push('thud');
          this.thudCooldown = 0.3;
        }
        this.thudCooldown -= dt;
        return;
      }
    }
    this.thudCooldown -= dt;

    if (Math.floor(next * 10) !== Math.floor(d.freq * 10)) this.events.push('tick');
    d.freq = next;
    this.applyDial(next);
    const locked = STATIONS.some((st2) => this.strengths[st2.id] > 0.98);
    if (locked && !this.wasLocked) this.events.push('lock');
    this.wasLocked = locked;
  }

  private stepPlayer(input: InputFrame, dt: number): void {
    const p = this.player;
    const T = TUNING;
    const mods = this.physics;
    const down = mods.gravity >= 0 ? -1 : 1;
    const g = T.gravity * Math.max(0.05, Math.abs(mods.gravity));

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const targetVx = dir * T.run * mods.runSpeed;
    const accel = (p.grounded ? T.groundAccel : T.airAccel) * mods.runSpeed;
    const dvx = targetVx - p.vx;
    p.vx += Math.max(-accel * dt, Math.min(accel * dt, dvx));

    p.coyote = p.grounded ? T.coyote : p.coyote - dt;
    p.buffer = input.jumpPressed ? T.jumpBuffer : p.buffer - dt;
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -down * T.jumpVelocity * mods.jump;
      p.jumping = true;
      p.grounded = false;
      p.buffer = p.coyote = 0;
      this.events.push('jump');
    }
    const rising = p.vy * -down > 0;
    if (p.jumping && !input.jumpHeld && rising) {
      p.vy *= T.jumpCut;
      p.jumping = false;
    }
    if (!rising) p.jumping = false;

    p.vy += down * g * dt;
    if (p.vy * down > T.maxFall) p.vy = down * T.maxFall;

    // Move X, then Y, snapping out of tiles.
    p.x += p.vx * dt;
    if (this.overlapsSolid(p.x, p.y)) {
      if (p.vx > 0) p.x = Math.floor(p.x + T.playerW - EPS) - T.playerW;
      else if (p.vx < 0) p.x = Math.floor(p.x + EPS) + 1;
      p.vx = 0;
    }

    const wasGrounded = p.grounded;
    p.grounded = false;
    const dy = p.vy * dt;
    p.y += dy;
    if (this.overlapsSolid(p.x, p.y)) {
      if (dy < 0) {
        p.y = Math.floor(p.y + EPS) + 1;
        if (down < 0) p.grounded = true;
      } else if (dy > 0) {
        p.y = Math.floor(p.y + T.playerH - EPS) - T.playerH;
        if (down > 0) p.grounded = true;
      }
      p.vy = 0;
    }
    if (p.grounded && !wasGrounded) this.events.push('land');
  }

  private checkTiles(): void {
    const p = this.player;
    const { level } = this;
    if (p.y < -3 || p.y > level.height + 3) return this.die();

    const x0 = Math.floor(p.x);
    const x1 = Math.floor(p.x + TUNING.playerW);
    const y0 = Math.floor(p.y);
    const y1 = Math.floor(p.y + TUNING.playerH);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (tx < 0 || ty < 0 || tx >= level.width || ty >= level.height) continue;
        if (level.hazards[ty * level.width + tx] && this.overlapsTile({ x: tx, y: ty }, 0.15)) return this.die();
      }
    }

    level.tapes.forEach((t, i) => {
      if (!this.tapesFound.has(i) && this.overlapsTile(t, 0)) {
        this.tapesFound.add(i);
        this.events.push('tape');
      }
    });

    if (this.overlapsTile(level.exit, 0.1)) {
      this.won = true;
      this.events.push('win');
    }
  }

  private die(): void {
    this.deaths++;
    this.events.push('die');
    this.respawn();
  }
}

# Frequency: agent guide

Read this before any task. It applies to Claude Code, Devin and any other agent.

## What this is

Frequency is a 2.5D puzzle platformer for OpenGame Jam #1 (entries close 2026-12-18, 11:59 pm PT; our final deploy is 2026-12-17). The player climbs a radio tower and turns a dial on an 88.0 to 108.0 MHz band. The dial blends between versions of each level ("stations"), each with its own physics, art and music.

The full PRD is `docs/PRD.md`. If it is missing, ask the human; do not invent design. OpenGame platform docs: https://docs.opengame.io/engines/threejs

## Commands

```
npm ci              install
npm run dev         local dev server
npm run typecheck   tsc, strict
npm test            Vitest unit and replay tests
npm run build       static build into dist/
npm run check       all three above
npx opengame check --build   OpenGame's own build check
```

Node version is in `.nvmrc`. Dependencies are pinned exactly (`.npmrc` has `save-exact`). Add a dependency only when the ticket needs it, and say why in the PR.

## Working copy

Several agents work on this repo at the same time. Never work in a checkout you did not create.

1. Start every ticket in its own worktree from the latest main:
   `git fetch origin && git worktree add ../Frequency-<ticket-id> -b <branch> origin/main`
2. Work, commit and push only from that folder. Never switch branches in any other folder.
3. Commit as you go and push before you finish. Never leave work uncommitted at the end of a session.
4. Open a PR when done; the human merges.

## Folder ownership

One ticket touches one folder. Do not edit another owner's folder; open an issue or note it in the PR instead.

| Folder | Owner | Contents |
| --- | --- | --- |
| `src/sim/` | Claude Code | Pure game logic: physics, dial, signal, entities, level state |
| `src/render/` | Claude Code | three.js scene, station materials, blend shader, post-processing, camera |
| `src/audio/` | Claude Code | Music bus, static, SFX, voice queue, ducking |
| `src/input/` | Claude Code | Keyboard, mouse wheel, gamepad, remapping, replay recorder |
| `src/levels/` | Devin B | Level loader and validator |
| `src/ui/` | Devin A | HTML menus, HUD text, subtitles, settings |
| `src/platform/` | Devin A | OpenGame SDK, save, analytics events |
| `levels/` | Devin A and B by chapter | `*.level.json` plus solution replays |
| `tools/`, `manifests/` | Devin B | Asset generation and processing scripts, prompt manifests |
| `.github/`, `tests/browser/` | Devin A | CI and Playwright |
| `src/main.ts` | Claude Code | Boot and frame loop |

## Hard rules

1. **`src/sim/` is pure and deterministic.** No DOM, no three.js, no `Date`, no `performance.now()`, no `Math.random()`. It steps at a fixed 120 Hz (`src/sim/fixedStep.ts`). Randomness comes from one seeded generator per level. Replays depend on this.
2. **No secrets anywhere in the repo or build.** API keys live only in the human's local `.env`. Agents never receive keys. Generation scripts must support `--dry-run` with mocked APIs.
3. **No runtime AI or network calls.** Every voice line, track and image is generated ahead of time and shipped as a file. The game must work offline after load.
4. **Relative paths only.** OpenGame rejects absolute paths, `../` and symlinks in the build. Vite `base` is `./`; keep it.
5. **Fill the window.** The game must fill 1920x1080, 1366x768, 2560x1440, 3440x1440 and 1024x640 with no letterboxing.
6. **Desktop, keyboard and mouse.** Gamepad optional. No touch-only input.
7. **Banned in the build:** ads, tracking pixels, payments, login, portal SDKs (Poki, CrazyGames and similar).
8. **Performance budgets:** under 25 MB before the first playable frame, time to playable under 4 s, peak memory under 600 MB, 60 fps on Intel integrated graphics at 1080p, under 150 draw calls. Allocate up front; no per-frame object creation in hot loops.
9. **Every PR passes `npm run check`** and explains what it changed and how to see it working (test, screenshot or steps).
10. **Never push to `main` directly.** Open a PR; the human merges.

## Core numbers (from the PRD)

- Stations: Velvet 88.3 MHz, Riot 93.7, Forecast 99.1, Rewind 104.5. Definitions live in `src/sim/stations.ts`.
- Signal strength: `s = max(0, 1 - |f - f_station| / 1.0)`. A station's tiles are solid at `s >= 0.6`. When no station is solid, the static layer is.
- Physics blend: `value = base + sum(s_i * (station_value - base))`.

## Level files

`levels/<chapter>-<nn>.level.json`, one ASCII grid per layer. Legend: `#` always solid, `v` `r` `f` `w` station tiles (Velvet, Riot, Forecast, Rewind), `s` static tiles, `S` start, `E` exit, `T` lost tape, `^` hazard. Every level ships with a recorded solution replay that CI runs headless.

## Commits

Small commits with plain messages. Commit history is the jam's evidence of original work, so never squash away history on `main`.

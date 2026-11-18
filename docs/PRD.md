# Frequency PRD

Nov 18, 2026 · @henrik

Frequency is a 2.5D puzzle platformer where you climb a radio tower and turn a dial that blends between versions of each level, each with its own physics, art and music. It enters OpenGame Jam #1 in the Platformer track plus the ElevenLabs and fal sponsor tracks, aims for Best Overall, and ships by Dec 17, 2026, one day before entries close (Dec 18, 11:59 pm PT).

## Goals and non-goals

The goal is a top-3 Platformer finish ($2,500 for 1st) plus at least one sponsor win, with a real shot at Best Overall ($25,000 for 1st). Every entry is judged for Best Overall automatically, and sponsor prizes stack on top of cash.

**Prize targets**

| Prize | How we enter | Why we can win it |
| --- | --- | --- |
| Best Overall | Automatic | A mechanic judges have not played, with polish on all five criteria |
| Platformer track | Primary genre | Less crowded than Puzzle & casual, which also takes match-3, idle and hypercasual |
| ElevenLabs | Sponsor track | Sound is the mechanic: tuning literally changes the music and the physics |
| fal | Sponsor track | Each station has its own fal-generated art set, blended live |
| Chroma Awards S2 | Submit link by Jan 7, 2027 | Puzzle & strategy or Music & rhythm category, $3,500 each |

**Success looks like**

- A judge understands the dial within 30 seconds, with no text tutorial.
- A judge is still finding new combinations at minute 30.
- Zero warnings from OpenGame's automated checks (download, load time, memory, fps, window sizes).
- Five playtesters finish chapter 1 unassisted.

**Non-goals**

- Multiplayer. It earns no points and judges play alone.
- Live AI calls at runtime. Every voice line, track and image is generated ahead of time and baked into the build.
- Mobile or touch support. The jam is desktop only.
- A level editor for players.
- Optimizing for the Meshy track. Its brief wants models seen under a free camera, and our camera is fixed. You model the player yourself, so we skip Meshy and its track.

**Anti-goals** (failure even if it works)

- Tuning feels like a menu toggle instead of a physical dial.
- Puzzles that need trial and error because the player cannot see what each station will do.
- More than 20 levels that are each mediocre. Fewer, better levels win.

## Core mechanic: the dial

The player carries a radio tuned anywhere on an 88.0 to 108.0 MHz band, and the dial position decides which parts of the level are solid and how physics behaves. Every rule below must be readable from the screen alone.

**Signal strength.** Each station sits at a fixed frequency. Its strength is 1 when tuned exactly and falls to 0 at 1.0 MHz away:

```latex
s_i = \max\left(0,\ 1 - \frac{|f - f_i|}{w}\right), \quad w = 1.0\ \text{MHz}
```

**Rules**

1. **Presence.** Every tile and entity belongs to one station or to "always". It is solid when its station's strength is 0.6 or more. Below that it shows as a ghost whose opacity follows strength, so players preview a station before committing to it.
2. **Blended physics.** Gravity, run speed, jump height and time scale blend by strength: value = base + sum of s\_i × (station value − base). Half-tuned to the jazz station means half its low gravity. Players learn to park between stations on purpose.
3. **Static.** When no station reaches 0.6, the static layer becomes solid. It holds hidden paths and the optional collectibles (lost tapes).
4. **No crushing.** If tuning would make a tile solid inside the player, the player is pushed to the nearest free spot within 1 tile. If there is none, the dial refuses to move further and plays a dull thud.
5. **The dial has weight.** It turns at most 4 MHz per second with momentum. Mouse wheel and Q/E turn it; Shift fine-tunes. Tuning is a physical skill, never an instant swap.
6. **Interference zones** (chapter 2 on). Marked areas cap one station's strength at 0.5, so it cannot go solid there.
7. **Presets** (chapter 3 on). Number keys 1 to 4 jump the dial to saved stations at the same max speed, so speed puzzles become routing puzzles.
8. **Transmitters** (chapter 4). Carryable objects that force one station to full strength inside a 4-tile radius. Two stations can now be solid at once, in different places. This is where depth peaks.

**Design rule:** each chapter adds exactly one rule, and the last two or three levels of a chapter combine it with everything before.

## Stations

Four stations plus static, each changing physics, look and music at once so players read a station by ear and eye together. All music shares one key (D minor) and one tempo grid (90 BPM, punk at double time) so blends between stations stay musical.

| Station | Freq (MHz) | Physics | Unique objects | Look | Music |
| --- | --- | --- | --- | --- | --- |
| Velvet (late jazz) | 88.3 | Gravity 0.45×, time 0.8×, run 0.8× | Lanterns that rise slowly when stood on | Warm amber noir, rain on glass | Brushed drums, upright bass, muted trumpet |
| Riot (punk) | 93.7 | Gravity 1.4×, run 1.5×, short jump | Crumble blocks that break when landed on at speed | Red and black, photocopy grain, neon | Distorted guitars, 180 BPM |
| Forecast (weather and news) | 99.1 | Normal gravity, wind push | Wind that changes direction on each spoken bulletin | Overcast blue-gray, storm clouds | Synth pad under a calm newsreader voice |
| Rewind (backmasked) | 104.5 | Gravity inverted | Moving platforms run in reverse | Inverted palette, VHS tracking lines | The other stations' tracks played backward |
| Static | Between stations | Base physics | Hidden paths, lost tapes | Monochrome noise, scanlines | Band-passed white noise |

Forecast is the ElevenLabs showcase: the newsreader's spoken bulletins are gameplay cues, so a judge has to listen to play well.

## Structure and progression

The game is a climb up a radio tower: 22 levels across five chapters, about 45 to 70 minutes for a first clear. A stairwell hub doubles as level select.

| Chapter | Floors | Levels | New rule | Stations available |
| --- | --- | --- | --- | --- |
| 0. Ground floor | Lobby | 2 | Move, jump, tune between one station and static | Velvet |
| 1. Lower floors | 1 to 5 | 5 | Presence and blended physics | Velvet, Riot |
| 2. Middle floors | 6 to 10 | 5 | Interference zones, spoken wind bulletins | + Forecast |
| 3. Upper floors | 11 to 15 | 5 | Presets, inverted gravity | + Rewind |
| 4. Antenna | 16 to 19 | 4 | Transmitters | All four |
| Finale | Broadcast booth | 1 | Everything, against a timer as the DJ signs off | All four |

**Reasons to keep playing** (the Depth criterion)

- **Lost tapes:** one per level, hidden in the static layer. Each is a 15 to 25 second voiced call-in. Finding all of them unlocks the true ending.
- **Chapter timers** with OpenGame leaderboards. Leaderboards do not affect judging, but they give judges a reason to replay.
- **Par routes:** each level shows a dial-turn count to beat, rewarding clever tuning over brute force.

**Level length:** 1 to 3 minutes each. A checkpoint every 30 to 45 seconds of play, and instant respawn under 0.5 seconds.

## Story and the DJ

At 3 am every station in the city has gone silent except one: a late-night host called Nightjar, broadcasting from the top of an abandoned radio tower. You climb toward the booth to find out who is still on air.

**Arc**

1. Nightjar talks to you between floors like a caller who wandered into the show: warm, funny, a little evasive.
2. The lost tapes are call-ins from decades of listeners. They hint the show never stopped, even after the station closed.
3. In the booth, you learn Nightjar is a recording the transmitter has looped for years. Standard ending: you switch it off and the city's radios fill with the other stations again.
4. True ending (every tape): you take the mic and become the next voice of the station.

**Script budget**

| Voice | Lines | Use |
| --- | --- | --- |
| Nightjar (DJ) | About 60 | Between floors, on deaths (rarely), in the finale |
| Forecast newsreader | About 40 | Wind bulletins that are also gameplay cues |
| Callers (lost tapes) | One per shipped level | One per tape, 15 to 25 seconds each |
| Station idents | 8 | Two per station, played when you lock on |

**Rules:** every line is subtitled, every voice is designed from a text description (no cloned real voices), and no line blocks play. The player is never stopped for dialogue.

## Controls and UX

Keyboard and mouse play the whole game; a gamepad is optional. The dial lives on screen as a physical radio so the player always sees where they are on the band.

| Action | Keyboard and mouse | Gamepad |
| --- | --- | --- |
| Move | A / D or arrows | Left stick |
| Jump (hold for higher) | Space or W | A / Cross |
| Tune | Mouse wheel or Q / E | Triggers |
| Fine-tune | Hold Shift | Hold a bumper |
| Preset 1 to 4 (chapter 3+) | Keys 1 to 4 | D-pad |
| Pick up / drop transmitter | F | X / Square |
| Restart from checkpoint | R | Y / Triangle |
| Pause | Esc | Start |

**HUD:** a radio at the bottom center with the frequency readout, a needle on the band, station markers, and a signal meter per nearby station. Nothing else stays on screen.

**Readability:** each station has a color and a pattern (stripes, dots, waves, chevrons) on its tiles, so the game works for colorblind players. Ghost tiles always outline the shape they will take.

**Feel:** coyote time 100 ms, jump buffer 120 ms, variable jump height, respawn under 0.5 s.

**Accessibility and settings:** subtitles on by default, separate volume for music, voice and effects, reduced motion (disables screen shake and VHS distortion), remappable keys, and an assist mode that slows the dial's max speed requirement in timed sections.

**Window:** fills every size OpenGame tests (1024×640 up to 3440×1440) with no letterboxing. Wider screens see more of the level; levels are built with padding art so 21:9 never shows empty space.

## Look and sound

The signature moment is the blend: as the dial moves, art, lighting and music cross over together, so a judge sees and hears the mechanic in the same instant.

**Art direction**

- **2.5D:** gameplay is strictly 2D on one plane; the world is rendered in 3D with a slight perspective camera, real lights and depth. This earns Visual fidelity points without 3D platforming complexity.
- **Tiles:** simple extruded shapes with per-station materials. One geometry set, four looks, swapped by shader.
- **Blend shader:** each station material dissolves in and out with a noise mask driven by its strength. Ghost tiles render as a glowing outline plus faint fill.
- **Backgrounds:** three parallax layers per station per chapter, painted with fal, so the city skyline changes mood as you tune.
- **Player:** a small courier in a raincoat with a backpack radio. A low-poly 3D model you make in Blender, rigged and animated (idle, run, jump, fall, land, death), lit by the scene like everything else.
- **Post-processing:** bloom, vignette and film grain always; chromatic aberration and scanlines scale with static.
- **Juice:** squash and stretch on jump and land, dust puffs, screen shake on crumble blocks, a tuning "lock-on" pulse when a station hits full strength.

**Audio direction** ("sound matters most", per OpenGame's own guide)

- **Synced music bus:** all four station loops start together and run sample-locked; their gains follow signal strength. Static noise fills whatever strength is missing, through a band-pass filter that sweeps with the dial.
- **Lock-on sting:** a short station ident plays when strength reaches 1.
- **Dial sound:** mechanical clicks per 0.1 MHz, a heavier detent at each station.
- **SFX set:** about 60 effects (footsteps per surface, jumps, lands, crumble, wind, transmitter hum, tape pickup, death, checkpoint).
- **Mix:** voice ducks music by 6 dB; nothing clips; a limiter on the master bus.

## Judging criteria

The five criteria weigh the same, so the weakest one caps the score. The plan below covers each, and Performance is treated as a feature, not a final pass.

| Criterion | Judge's wording (short) | How Frequency earns it | Proof before submit |
| --- | --- | --- | --- |
| Creativity | "Something we have not played before" | Continuous blending between level versions, with physics, art and music moving together | 5 playtesters say they have not seen it |
| Depth | "More to find the longer you play" | One new rule per chapter, transmitters late, tapes, par routes, true ending | Chapter 4 levels need 3+ rules at once |
| Fun | "First minute makes you want a second" | Tuning is tactile; first puzzle solved in under 60 s; instant respawn | Testers keep playing past chapter 1 unprompted |
| Performance | "Runs well on an ordinary laptop" | Budgets in the compliance section, enforced in CI | Steady 60 fps on an Intel integrated GPU at 1080p |
| Visual fidelity | "Look good together and look right in play" | One art direction per station, 2.5D lighting, blend shader, post-processing | Screenshot at any dial position looks intentional |

## Tech stack

TypeScript, Vite and three.js with hand-written physics and raw Web Audio. Everything is plain text and code, which is what Claude Code and Devin work best with, and three.js is OpenGame's own recommendation. Pin exact versions on day 1.

| Layer | Choice | Why |
| --- | --- | --- |
| Language | TypeScript, strict mode | Agents make fewer mistakes with types; refactors stay safe |
| Build | Vite | Fast hot reload; static output with index.html at the root, as OpenGame requires |
| Rendering | three.js on WebGL2 | Mature, small, runs on every desktop browser; WebGPU adds risk for no gain here |
| Post-processing | pmndrs postprocessing | Bloom, vignette, grain, chromatic aberration in one merged pass |
| Physics | Custom fixed-step tile physics (120 Hz, AABB vs grid) | Tight platformer feel and full determinism for replay tests; no engine needed |
| Audio | Web Audio API directly | Sample-locked looping and per-station gain need low-level control |
| Menus and HUD text | HTML and CSS over the canvas | Crisp text at every size, easy to make accessible |
| Levels | Text level files (JSON with ASCII layers), hot reloaded | Agents can write and diff levels; see Levels and testing |
| Save | localStorage wrapped in try/catch | Game still runs if storage is blocked |
| Platform | OpenGame CLI and SDK | Deploy, build checks, leaderboards, achievements |
| Unit and replay tests | Vitest | Physics and signal math plus input replays run headless |
| Browser tests | Playwright | Boot time, five window sizes, fps sampling |
| CI | GitHub Actions | Runs tests and `opengame check --build` on every PR |
| Asset generation | Node scripts using the ElevenLabs and fal SDKs | Prompts live in versioned manifests; keys stay in .env |
| Audio processing | ffmpeg | Loudness normalize, trim loops, encode Opus with an AAC fallback |
| Image processing | sharp | Resize, WebP export, texture atlases |
| 3D cleanup | Blender, gltfpack | Export the player as glTF and compress it with gltfpack |
| Agents | Claude Code (Opus 5.5, High reasoning) and Devin | OpenGame's guide names Opus 5.5 at High as its top pick |

## Code layout and runtime

One repo, one folder per area, so a human, Claude Code and Devin can each own an area without merge conflicts. The simulation is pure TypeScript with no DOM or three.js imports, so it runs headless in tests.

```
frequency/
  src/
    sim/        pure game logic: physics, dial, signal, entities, level state
    render/     three.js scene, station materials, blend shader, post-processing, camera
    audio/      music bus, static, SFX, voice queue, ducking
    input/      keyboard, mouse wheel, gamepad, remapping, replay recorder
    levels/     level loader and validator
    ui/         HTML menus, HUD, subtitles, settings
    platform/   OpenGame SDK, save, analytics events
    main.ts     boot, loading screen, frame loop
  levels/       *.level.json, one per level, plus solution replays
  assets/       processed, shipped assets (audio, textures, models)
  manifests/    prompts for every generated asset (yaml)
  tools/        gen-audio, gen-art, gen-voice, process, budget-report scripts
  tests/        unit, replay, browser (Playwright)
  docs/         this PRD exported, style guide, level briefs
```

**Frame loop**

1. Read input and record it to the replay buffer.
2. Step the simulation at a fixed 120 Hz (accumulator, max 5 steps per frame to avoid spiral of death).
3. Update audio gains from the dial's signal strengths.
4. Render once per display frame, interpolating positions between sim steps.

**Loading:** the boot screen draws within 1 second from a tiny inline script. Chapter 0 and 1 assets load first (under 25 MB); later chapters stream in the background while the player plays.

## Asset pipeline

Every generated asset comes from a prompt in a versioned manifest, is generated by a script, picked by you, then processed and committed. Nothing calls an AI service at runtime.

**Flow:** manifest (yaml) → `tools/gen-*` script generates 2 to 4 variants into `assets-raw/` (git-ignored) → you pick one in a small review page → `tools/process` normalizes and encodes it into `assets/` → commit.

| Tool | What it makes | Volume | Budget |
| --- | --- | --- | --- |
| ElevenLabs Music | 4 station loops, title theme, finale, credits | About 8 tracks | Free Creator month (131,000 credits); upgrade if music eats it |
| ElevenLabs Sound Effects | Footsteps, jumps, crumble, wind, dial clicks, stings | About 60 effects | Same pool |
| ElevenLabs TTS + Voice Design | Nightjar, newsreader, 22 callers, idents | About 130 lines | Same pool |
| fal (image models) | Parallax backgrounds, tile textures, key art, tape labels, title card | About 120 images after picks | $50 free credit, top up to about $100 |
| You, in Blender | Player model (rigged, 6 animations) and radio prop | 2 to 3 models | Free; Blender or Mixamo for rigging |

**Keeping the look consistent**

- A style guide per station (palette hex codes, lighting, texture words) is pasted into every prompt for that station.
- Fixed seeds and a reference image per station. If outputs drift, train a small style LoRA on fal from the first 15 to 20 approved images.
- Backgrounds are generated wide (21:9 or wider) so ultrawide screens never stretch.

**Keeping the music blendable**

- Every loop is prompted at 90 BPM in D minor (Riot at 180), then trimmed in ffmpeg to an exact 32-bar length so all loops share one length.
- If generated tempo drifts, time-stretch in ffmpeg (`rubberband` filter) rather than regenerate.
- Loudness normalized to -16 LUFS integrated; voice to -18 LUFS.

**Licensing:** confirm before week 3 that each plan's terms allow commercial use and publishing of outputs, and list every tool in the credits screen. The jam rules require that you own or license every asset.

## Levels and testing

Levels are plain text files with one ASCII grid per station, and every level ships with a recorded solution that CI replays headless. This lets agents author levels in bulk without anyone hand-checking that each one is still beatable.

**Level file** (`levels/1-03.level.json`, shortened)

```json
{
  "id": "1-03",
  "title": "Fire Escape",
  "stations": ["velvet", "riot"],
  "dialStart": 88.3,
  "layers": {
    "always": ["#........E", "#....#####", "#S..######"],
    "velvet": ["..........", "..vvv.....", ".........."],
    "riot":   ["......rr..", "..........", ".........."],
    "static": ["...T......", "..........", ".........."]
  },
  "entities": [{ "type": "checkpoint", "x": 5, "y": 1 }],
  "par": { "dialTurns": 3 }
}
```

Legend: `#` solid always, `v` `r` `f` `w` station tiles, `s` static tiles, `S` start, `E` exit, `T` lost tape, `^` hazard.

**Determinism rules** (required for replays)

- The simulation steps at a fixed 120 Hz and never reads wall-clock time.
- All randomness in `sim/` comes from one seeded generator per level.
- Input is recorded per sim step, so a replay is a list of step numbers and key states.

**Tests**

| Test | Tool | Runs on |
| --- | --- | --- |
| Signal math, physics blend, collision, no-crush rule | Vitest unit | Every PR |
| Level validator: legend, sizes, start and exit not inside solid tiles | Vitest | Every PR |
| Every level's solution replay reaches the exit | Vitest, headless sim | Every PR |
| Boots and draws a frame under 5 s; fills 5 window sizes; median fps | Playwright, Chromium | Every PR to main |
| Build size vs budget report | tools/budget-report | Every PR |
| OpenGame build check | `opengame check --build` | Every PR to main |

**Level workflow:** you or Claude write a one-paragraph brief per level (what it teaches, the "aha"). An agent drafts the level file and records a solution replay. You play it, and it merges only if it is fun, not just solvable.

## Performance and OpenGame compliance

Our budgets sit well inside OpenGame's warning thresholds, so a slow judge laptop still gets a clean run. The hard rule is a rendered frame within 30 seconds; everything else is a warning that sends the entry to manual review.

| Metric | OpenGame threshold | Our budget |
| --- | --- | --- |
| Download before first playable frame | Under 50 MB | Under 25 MB |
| Time to playable | Under 10 s | Under 4 s on a fast connection |
| Peak memory | Under 1.2 GB | Under 600 MB |
| Median frame rate at 1080p | 45 fps or better | 60 fps on Intel integrated graphics |
| First frame drawn | Within 30 s (hard fail) | Within 1 s (boot screen) |
| Draw calls per frame | None | Under 150 (instanced tiles) |

**Pre-submit checklist**

- [ ] `index.html` at the build root, left uncompressed
- [ ] No absolute paths, no `../`, no symlinks in the build
- [ ] Fills 1920×1080, 1366×768, 2560×1440, 3440×1440 and 1024×640 with no letterboxing
- [ ] Playable with keyboard and mouse only
- [ ] No login, ads, payments, tracking pixels or portal SDKs
- [ ] Works fully offline after load (no runtime AI or API calls)
- [ ] No API keys anywhere in the build (grep the dist folder)
- [ ] Declared engine on OpenGame matches the bundle (three.js)
- [ ] Credits screen lists ElevenLabs, fal and every library license
- [ ] Primary genre set to Platformer; ElevenLabs and fal sponsor tracks ticked
- [ ] Description written; screenshots and a short trailer captured
- [ ] `opengame check --build` passes with zero warnings
- [ ] Final deploy done by Dec 17; tested live on the OpenGame URL in Chrome, Firefox and Safari
- [ ] Chroma Awards link submitted by Jan 7, 2027, with OpenGame listed under Community Awards

**Originality evidence:** commit early and often from day 1 and keep the manifests. The rules let organizers ask for development history.

## Who builds what

You own taste and decisions, Claude Code owns the game's feel and core systems with you in the loop, and Devin runs well-specified tickets in parallel and returns pull requests. Splitting by folder keeps the three from colliding.

| Area | Owner | Why this owner |
| --- | --- | --- |
| Design calls, asset picks, level approval, playtests, merges, deploys | You | Judgment and accountability; only you push and deploy |
| `sim/` physics, dial, signal, blend rules | Claude Code | Needs tight back-and-forth on feel |
| `render/` blend shader, lighting, post-processing | Claude Code | Visual iteration with you watching |
| `audio/` music bus and static | Claude Code | Sync bugs need fast debug loops |
| `tools/` asset generation and processing scripts | Devin | Clear spec, testable output |
| CI, Playwright, budget report | Devin | Self-contained, easy to verify |
| `ui/` menus, settings, subtitles, save | Devin | Standard work with clear acceptance criteria |
| `platform/` OpenGame SDK, leaderboards, achievements | Devin | Documented API, isolated folder |
| Level drafts plus solution replays, from your briefs | Devin (batches of 3 to 5) | Parallel content; CI proves solvable |
| Perf audits and playtest bug tickets | Devin | Measurable outcomes |

**Rules for Devin tickets**

- One ticket touches one folder. Each has acceptance criteria and a test or a screenshot that proves it.
- Run 2 Devin sessions at once (A and B in the runbook). Add a third only if you are merging their PRs within a day.
- Devin never holds the ElevenLabs or fal keys. It writes the generation scripts; you run them locally. This keeps keys out of shared systems and keeps you in control of credit spend.
- Every Devin PR gets a Claude Code review pass, then your playtest, before merge.

**Daily rhythm**

1. Morning: play last night's build for 15 minutes, write notes.
2. Turn notes into tickets: feel issues to Claude Code, the rest to Devin.
3. Work with Claude Code on core feel while Devin sessions run.
4. Evening: review and merge Devin PRs, deploy a test build to OpenGame (week 2 on).

## Schedule

Four one-week phases with two gates, a first live deploy on Dec 1, and the final deploy on Dec 17 so Dec 18 is pure buffer.

&#91;embedded content: build plan · 4 phases, 2 gates, final deploy Dec 17\]

**Gate 1 (Nov 24):** five testers understand the dial with no text and ask to keep playing. If not, rework the mechanic before building any content. **Gate 2 (Dec 8):** the 12 Must-ship levels are approved. If not, freeze scope at the Must-ship tier and spend week 4 on polish only.

## Runbook

Devin A owns infrastructure, menus and the middle chapters; Devin B owns tooling, art integration and the outer chapters; Claude Code builds the core with you; you play, decide, generate assets and deploy. Expect about 10 hours from you in week 1 and 12 to 15 hours in each later week.

### Devin tickets

Start each ticket as a new Devin session. Paste the ticket text plus a link to this doc, and name the folder it may touch. Start a ticket only when the one before it in that session is merged.

| ID | Session | Start | Ticket | Done when | Needs first |
| --- | --- | --- | --- | --- | --- |
| A1 | A | Nov 19 | CI: GitHub Actions runs typecheck, Vitest, build and `opengame check --build` on every PR | A PR with a failing test is blocked from merge | Repo scaffold pushed |
| A2 | A | Nov 21 | Browser tests: Playwright boot test, 5 window sizes, fps sampling, build size report against budget | Each PR gets a report comment | A1 |
| A3 | A | Nov 25 | Menus in `ui/`: title, pause, settings (volumes, key remap, reduced motion, subtitles), credits | Every screen works by keyboard alone; settings persist | A2 |
| A4 | A | Nov 28 | Save and platform: localStorage save in try/catch, OpenGame SDK leaderboards and achievements, chapter asset streaming behind a loading screen | Game runs with storage blocked; first frame under 1 s | A3 |
| A5 | A | Dec 2 | Levels: chapter 2 (5 levels) from your briefs, each with a solution replay | Replays pass in CI and you approve each in play | B3, your briefs |
| A6 | A | Dec 5 | Levels: chapter 3 (5 levels) | Same as A5 | Rewind and presets in `sim/` |
| A7 | A | Dec 9 | Perf audit: fps, memory and download size; fix the top 5 hotspots | Every budget in the Performance section met | Most content merged |
| A8 | A | Dec 13 | Compliance pass: run the pre-submit checklist, grep the build for keys, check sizes and paths; fix findings | Checklist done except the deploy items | A7 |
| B1 | B | Nov 19 | Asset tooling: yaml manifest schema, `gen-audio` (ElevenLabs music, SFX, TTS), `gen-art` (fal), with a dry-run mode that uses mocked APIs | `--dry-run` writes a placeholder for every manifest entry, with no keys present | Repo scaffold pushed |
| B2 | B | Nov 22 | Review page and processing: a local page to pick variants; ffmpeg loudness, loop trim, Opus with AAC fallback; sharp WebP; gltfpack for models | Picked files land in `assets/` within budget | B1 |
| B3 | B | Nov 26 | Level tooling: validator, replay recorder in the dev build, headless replay runner in Vitest | A broken or unsolvable level fails CI with a clear message | Deterministic sim from week 1 |
| B4 | B | Nov 28 | Levels: chapter 0 and chapter 1 (7 levels) from your briefs | Replays pass and you approve each | B3, your briefs |
| B5 | B | Dec 3 | Art integration: parallax layers, station textures, key art in menus | Each station looks distinct at all 5 window sizes | Your art picks |
| B6 | B | Dec 5 | Levels: chapter 4 (4 levels) and the finale; place a lost tape in every level | All replays pass, including tape routes | Transmitters in `sim/` |
| B7 | B | Dec 9 | Playtest fixes: level tweaks, par routes, credits list | Each fix links to a playtest note | Playtest notes |

### Claude Code with you

| Week | Focus |
| --- | --- |
| 1 (Nov 18 to 24) | Scaffold and push on day 1, deterministic sim, movement feel, the dial, Velvet and Riot, greybox test levels |
| 2 (Nov 25 to Dec 1) | Forecast and Rewind, blend shader, synced music bus and static, interference, presets, transmitters, player animation controller (on a placeholder capsule until your model lands) |
| 3 (Dec 2 to 8) | Juice, post-processing, voice queue and subtitles, finale and both endings |
| 4 (Dec 9 to 16) | Feel tuning from playtests, bug fixes, a review pass on every Devin PR |

### Your checklist

**Nov 18 to 19: setup (about 3 h)**

- [ ] Create a private GitHub repo and connect Devin to it
- [ ] Claim your OpenGame handle; run `npm i -g @opengamehq/cli` and `opengame setup`
- [ ] Claim the ElevenLabs and fal offers (done Nov 18; Meshy skipped)
- [ ] Put the API keys in a local `.env` only
- [ ] Session with Claude Code: scaffold the repo and push it
- [ ] Start Devin A1 and B1

**Nov 20 to 23: spike (about 6 h)**

- [ ] Two or three Claude Code sessions on movement and dial feel
- [ ] Write the four station style guides and the Nightjar character brief with Claude
- [ ] Review and merge A1, A2, B1 and B2

**Nov 24: Gate 1 (about 2 h)**

- [ ] Five people play the spike while you watch without explaining. Pass means they understand the dial and want to keep playing.

**Nov 25 to Dec 1: systems (about 12 h)**

- [ ] Model, rig and animate the player in Blender (6 animations); hand Claude Code a .glb by Nov 28
- [ ] Generate and pick the 4 station loops and the title theme
- [ ] Write the 12 level briefs for chapters 0 to 2 by Nov 27, and the 10 for chapters 3, 4 and the finale by Dec 1
- [ ] Review A3, A4, B3 and B4; play every new level the day its PR opens
- [ ] Dec 1: first deploy to OpenGame; fix whatever automated review flags

**Dec 2 to 8: content (about 15 h)**

- [ ] Write the voice script with Claude; generate Nightjar, newsreader, callers and idents
- [ ] Generate fal backgrounds and textures per station; pick
- [ ] Generate the SFX set
- [ ] Approve or reject every level within a day of its PR
- [ ] Dec 8: Gate 2, the 12 Must-ship levels approved

**Dec 9 to 16: polish (about 15 h)**

- [ ] Dec 10 and Dec 14: outside playtests with 3 to 5 people each; turn notes into tickets the same day
- [ ] Deploy every evening
- [ ] Capture screenshots and a 30 to 60 second trailer; write the description
- [ ] Dec 16 evening: feature freeze

**Dec 17: ship (about 3 h)**

- [ ] Final deploy; play start to finish on the OpenGame URL in Chrome, Firefox and Safari
- [ ] Submit the entry: Platformer, plus the ElevenLabs and fal tracks

**After**

- [ ] Dec 18: buffer only, no new features
- [ ] Dec 30: winners announced; a provisional winner has 14 days to return the declaration and tax form
- [ ] By Jan 7, 2027: submit to the Chroma Awards and list OpenGame under Community Awards

## Scope cut lines

The full design is the target. If a gate fails or week 3 ends behind, cut from Stretch first, then Target, never Must ship. A complete short game beats a long unfinished one, and only complete games can win.

| Tier | Content |
| --- | --- |
| Must ship | Velvet, Riot, Forecast plus static; chapters 0 to 2 (12 levels); hand-made 3D player with idle, run, jump, fall, land and death; Nightjar intro and ending; title, pause, settings, credits; save; all compliance checks |
| Target | Rewind and presets; chapters 3 and 4 (22 levels total); transmitters; lost tapes and true ending; leaderboards |
| Stretch | Par routes per level; photo mode; a hard-mode remix of chapter 1; gamepad rumble on lock-on; trailer with fal video |

## Risks and fallbacks

The biggest risk is that blending is confusing rather than delightful, so the week 1 spike exists to prove it before any content is built.

| Risk | Signal it is happening | Fallback |
| --- | --- | --- |
| Blending confuses players | Testers tune randomly instead of reading ghosts | Stronger ghost outlines, a preview sound, snap-assist near stations |
| Music blends sound muddy | Two loops clash at the midpoint | Static covers the midpoint more; filter the off-station loop harder |
| Generated music won't hold tempo | Loops drift out of sync | Time-stretch in ffmpeg; worst case, generate stems and loop shorter |
| AI art looks inconsistent | Backgrounds clash within a chapter | Style LoRA on fal; reduce to fewer, stronger backgrounds |
| Level content runs late | Fewer than 12 approved levels by Dec 8 | Ship Must-ship tier; polish over count |
| Devin PRs pile up unreviewed | More than 5 open PRs | Pause new tickets until merged |
| Performance on weak laptops | Under 45 fps in Playwright on CI | Drop post-processing tier, lower shadow resolution, halve particles |
| Automated review flags something late | A warning on the first deploy | Deploy from week 2 so issues surface early |
| Upload still running at the close | Any deploy on Dec 18 | Final deploy Dec 17; Dec 18 is buffer only |
| Originality questioned | Organizers request history | Commit history from day 1, manifests, dated design docs |

## Open questions

**Decided on Nov 18**

| Question | Decision | Effect on the plan |
| --- | --- | --- |
| Hours per week | 7 at minimum, likely 10 to 15 | Full design is the target (22 levels); 2 Devin sessions, A and B, as in the runbook |
| Player model | 3D, modeled by you in Blender | You model, rig and animate it; no Meshy, so no Meshy track |
| Second entry | Maybe later | Not planned; revisit only if Gate 2 passes early |

**Still open**

- [ ] Is the name "Frequency" free of conflicts on OpenGame and in common game listings? Check before key art.
- [ ] Do the ElevenLabs Creator and fal terms cover publishing outputs in a free web game? Confirm by week 3.
- [ ] Tickets in GitHub Issues or Linear for Devin?

## Sources

- [OpenGame Jam #1 page](https://opengame.io/jam): tracks, prizes, sponsor offers, judges, Chroma Awards
- [OpenGame official rules](https://opengame.io/rules): eligibility, technical requirements, judging criteria (last updated Nov 16, 2026)
- [OpenGame create guide](https://opengame.io/create): recommended engines, models and workflow

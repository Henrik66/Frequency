# Asset manifests

Prompt manifests for the generation tools in `tools/`. Every generated asset
comes from an entry here: prompt in a versioned manifest, generated into
`assets-raw/` (gitignored), picked, then processed into `assets/`.

- `audio.yaml` - music, sfx, tts via ElevenLabs (`tools/gen-audio.ts`)
- `art.yaml` - images via fal (`tools/gen-art.ts`)
- `ledger.jsonl` - append-only spend log, one line per paid call, written by
  the tools before each request (do not edit by hand)

## Commands

```
node tools/gen-audio.ts              # dry run: placeholders, no keys needed
node tools/gen-audio.ts --live       # real paid calls, reads .env
node tools/gen-audio.ts --only velvet --cap 5
node tools/gen-art.ts --dry-run
```

Tools run dry unless `--live` is passed. Keys live only in `.env`
(`ELEVENLABS_API_KEY`, `FAL_KEY`); never commit them.

## Schema

```yaml
version: 1

voices:                  # optional, tts only: name -> provider voice id
  nightjar: "abc123"

entries:
  - id: music/velvet-loop      # unique, lowercase path-like
    kind: music                # music | sfx | tts (audio.yaml), image (art.yaml)
    model: music_v1            # provider model id, pinned; required
    out: assets-raw/...        # output file; must be relative, under assets-raw/
    prompt: "..."              # music, sfx, image
    text: "..."                # tts: the spoken line
    voice: nightjar            # tts: key into voices map
    seconds: 85                # music 3-600, sfx 0.5-30 (optional)
    loop: true                 # sfx only (optional)
    size: 3440x1440            # image, required: "WxH"
    variants: 2                # 1-8, default 1; writes out as name.vN.ext
    seed: 883                  # optional int
    estCostUsd: 0.30           # estimate per file; feeds dry-run report and --cap
    options: {}                # provider request fields; allow-listed per kind
```

Option allow-lists (other keys are ignored with a warning, so a typo cannot
silently cost money):

- `music`: `forceInstrumental`, `outputFormat`, `finetuneId`, `storeForInpainting`, `signWithC2Pa`
- `sfx`: `promptInfluence`, `outputFormat`
- `tts`: `voiceSettings`, `languageCode`, `outputFormat`, `applyTextNormalization`, `previousText`, `nextText`, `audioEffects`
- `image`: `num_inference_steps`, `guidance_scale`, `negative_prompt`, `enable_safety_checker`, `safety_tolerance`, `sync_mode`, `output_format`, `acceleration`

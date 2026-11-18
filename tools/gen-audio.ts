// gen-audio: generate music, sfx and tts from manifests/*.yaml via ElevenLabs.
//
// Runs dry by default: --dry-run (or no flags) mocks the API and writes a
// placeholder file per manifest entry, needing no keys. --live makes real
// paid calls with ELEVENLABS_API_KEY from .env and logs each call to
// manifests/ledger.jsonl before it starts.

/// <reference types="node" />
import type { ElevenLabs, ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { AUDIO_KINDS, loadManifest, type ManifestEntry, type Manifest } from "#lib/manifest";
import {
  fail,
  ledgerBefore,
  ledgerError,
  ledgerResult,
  ledgerSpend,
  loadEnvFile,
  parseCli,
  requireKey,
  selectEntries,
  writePlaceholder,
  writeResult,
} from "#lib/run";

const TOOL = "gen-audio";
const PROVIDER = "elevenlabs";
const DEFAULT_MANIFEST = "manifests/audio.yaml";
const OUTPUT_FORMAT = "mp3_44100_128";

// Allow-listed passthrough fields per kind (a misspelt parameter is silently
// ignored and you pay full price, so only these may reach the request).
const OPTION_ALLOW_LIST: Record<string, string[]> = {
  music: ["forceInstrumental", "outputFormat", "finetuneId", "storeForInpainting", "signWithC2Pa"],
  sfx: ["promptInfluence", "outputFormat"],
  tts: ["voiceSettings", "languageCode", "outputFormat", "applyTextNormalization", "previousText", "nextText", "audioEffects"],
};

function pickOptions(entry: ManifestEntry): Record<string, unknown> {
  const allowed = new Set(OPTION_ALLOW_LIST[entry.kind] ?? []);
  const picked: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(entry.options)) {
    if (allowed.has(k)) picked[k] = v;
    else console.warn(`  ${entry.id}: ignoring unknown option "${k}"`);
  }
  return picked;
}

function buildRequest(entry: ManifestEntry, manifest: Manifest): Record<string, unknown> {
  const options = pickOptions(entry);
  switch (entry.kind) {
    case "music":
      return {
        prompt: entry.prompt,
        ...(entry.seconds !== undefined ? { musicLengthMs: Math.round(entry.seconds * 1000) } : {}),
        modelId: entry.model,
        ...(entry.seed !== undefined ? { seed: entry.seed } : {}),
        outputFormat: OUTPUT_FORMAT,
        forceInstrumental: true,
        ...options,
      };
    case "sfx":
      return {
        text: entry.prompt,
        ...(entry.seconds !== undefined ? { durationSeconds: entry.seconds } : {}),
        ...(entry.loop ? { loop: true } : {}),
        modelId: entry.model,
        outputFormat: OUTPUT_FORMAT,
        ...options,
      };
    case "tts": {
      const voiceId = entry.voice ? manifest.voices[entry.voice] : undefined;
      return {
        voice: entry.voice,
        voiceId: voiceId || undefined,
        text: entry.text,
        modelId: entry.model,
        ...(entry.seed !== undefined ? { seed: entry.seed } : {}),
        outputFormat: OUTPUT_FORMAT,
        ...options,
      };
    }
    default:
      fail(`${entry.id}: kind "${entry.kind}" is not handled by ${TOOL}`);
  }
}

async function callApi(client: ElevenLabsClient, entry: ManifestEntry, request: Record<string, unknown>): Promise<unknown> {
  switch (entry.kind) {
    case "music":
      return client.music.compose(request as ElevenLabs.BodyComposeMusicV1MusicPost);
    case "sfx":
      return client.textToSoundEffects.convert(request as unknown as ElevenLabs.CreateSoundEffectRequest);
    case "tts": {
      const { voice, voiceId, ...body } = request;
      if (typeof voiceId !== "string" || !voiceId) {
        fail(`${entry.id}: voice "${String(voice)}" has no provider voice id in the manifest's voices map. Create the voice, then fill it in.`);
      }
      return client.textToSpeech.convert(voiceId, body as unknown as ElevenLabs.BodyTextToSpeechFull);
    }
    default:
      fail(`${entry.id}: kind "${entry.kind}" is not handled by ${TOOL}`);
  }
}

async function main(): Promise<void> {
  const cli = parseCli(process.argv.slice(2), DEFAULT_MANIFEST, "tools/gen-audio.ts");
  loadEnvFile();
  const manifest = loadManifest(cli.manifestPath, AUDIO_KINDS);
  const entries = selectEntries(manifest.entries, cli.only).filter((e) => AUDIO_KINDS.includes(e.kind as (typeof AUDIO_KINDS)[number]));
  if (entries.length === 0) fail("no manifest entries selected");

  const calls = entries.reduce((n, e) => n + e.variants, 0);
  const estTotal = entries.reduce((n, e) => n + e.variants * (e.estCostUsd ?? 0), 0);

  if (!cli.live) {
    console.log(`${TOOL}: dry run (${calls} file${calls === 1 ? "" : "s"}, est $${estTotal.toFixed(2)} at list prices)`);
    for (const entry of entries) {
      const request = buildRequest(entry, manifest);
      for (let v = 0; v < entry.variants; v++) {
        const rel = writePlaceholder(entry, v, request);
        console.log(`  wrote ${rel}`);
      }
    }
    console.log("dry run complete. Re-run with --live to make paid calls.");
    return;
  }

  // Live: real paid calls.
  const apiKey = requireKey("ELEVENLABS_API_KEY");
  const { ElevenLabsClient } = await import("@elevenlabs/elevenlabs-js");
  const client = new ElevenLabsClient({ apiKey });

  let spent = ledgerSpend(PROVIDER);
  console.log(`${TOOL}: live (${calls} calls, ${PROVIDER} spend so far $${spent.toFixed(2)}${cli.capUsd ? `, cap $${cli.capUsd.toFixed(2)}` : ""})`);

  for (const entry of entries) {
    const request = buildRequest(entry, manifest);
    for (let v = 0; v < entry.variants; v++) {
      const call = { entry, variant: v, provider: PROVIDER, tool: TOOL };
      ledgerBefore(call, request, spent, cli.capUsd);
      try {
        const data = await callApi(client, entry, request);
        const result = await writeResult(entry, v, data);
        ledgerResult(call, result);
        spent += entry.estCostUsd ?? 0;
        console.log(`  ${result.rel} (${result.bytes} bytes)`);
      } catch (e) {
        ledgerError(call, e);
        fail(`${entry.id} variant ${v + 1}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }
  console.log(`done. Session spend est $${estTotal.toFixed(2)}; ${PROVIDER} total $${spent.toFixed(2)}.`);
}

await main();

// gen-art: generate images from manifests/*.yaml via fal (@fal-ai/client).
//
// Runs dry by default: --dry-run (or no flags) mocks the API and writes a
// placeholder file per manifest entry, needing no keys. --live makes real
// paid calls with FAL_KEY from .env and logs each call to
// manifests/ledger.jsonl before it starts.

/// <reference types="node" />
import { ART_KINDS, loadManifest, type ManifestEntry, type Manifest } from "#lib/manifest";
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

const TOOL = "gen-art";
const PROVIDER = "fal";
const DEFAULT_MANIFEST = "manifests/art.yaml";

// Allow-listed passthrough fields (a misspelt parameter is silently ignored
// and you pay full price, so only these may reach the request).
const OPTION_ALLOW_LIST: Record<string, string[]> = {
  image: [
    "num_inference_steps",
    "guidance_scale",
    "negative_prompt",
    "enable_safety_checker",
    "safety_tolerance",
    "sync_mode",
    "output_format",
    "acceleration",
  ],
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

function imageSize(size: string): { width: number; height: number } {
  const [w, h] = size.split("x").map(Number);
  if (!w || !h) fail(`bad size "${size}" (manifest validation should have caught this)`);
  return { width: w, height: h };
}

function buildRequest(entry: ManifestEntry): Record<string, unknown> {
  return {
    prompt: entry.prompt,
    image_size: imageSize(entry.size ?? "1024x1024"),
    num_images: 1,
    ...(entry.seed !== undefined ? { seed: entry.seed } : {}),
    ...pickOptions(entry),
  };
}

interface FalImageResult {
  images?: { url: string }[];
}

async function callApi(fal: { subscribe: (id: string, o: { input: Record<string, unknown> }) => Promise<{ data: unknown; requestId: string }> }, entry: ManifestEntry, request: Record<string, unknown>): Promise<{ data: Buffer; jobId: string }> {
  const result = await fal.subscribe(entry.model, { input: request });
  const data = result.data as FalImageResult;
  const url = data.images?.[0]?.url;
  if (!url) fail(`${entry.id}: fal returned no image url`);
  const res = await fetch(url);
  if (!res.ok) fail(`${entry.id}: downloading result failed: HTTP ${res.status}`);
  return { data: Buffer.from(await res.arrayBuffer()), jobId: result.requestId };
}

async function main(): Promise<void> {
  const cli = parseCli(process.argv.slice(2), DEFAULT_MANIFEST, "tools/gen-art.ts");
  loadEnvFile();
  const manifest: Manifest = loadManifest(cli.manifestPath, ART_KINDS);
  const entries = selectEntries(manifest.entries, cli.only);
  if (entries.length === 0) fail("no manifest entries selected");

  const calls = entries.reduce((n, e) => n + e.variants, 0);
  const estTotal = entries.reduce((n, e) => n + e.variants * (e.estCostUsd ?? 0), 0);

  if (!cli.live) {
    console.log(`${TOOL}: dry run (${calls} file${calls === 1 ? "" : "s"}, est $${estTotal.toFixed(2)} at list prices)`);
    for (const entry of entries) {
      const request = buildRequest(entry);
      for (let v = 0; v < entry.variants; v++) {
        const rel = writePlaceholder(entry, v, request);
        console.log(`  wrote ${rel}`);
      }
    }
    console.log("dry run complete. Re-run with --live to make paid calls.");
    return;
  }

  // Live: real paid calls.
  const credentials = requireKey("FAL_KEY");
  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials });

  let spent = ledgerSpend(PROVIDER);
  console.log(`${TOOL}: live (${calls} calls, ${PROVIDER} spend so far $${spent.toFixed(2)}${cli.capUsd ? `, cap $${cli.capUsd.toFixed(2)}` : ""})`);

  for (const entry of entries) {
    const request = buildRequest(entry);
    for (let v = 0; v < entry.variants; v++) {
      const call = { entry, variant: v, provider: PROVIDER, tool: TOOL };
      ledgerBefore(call, request, spent, cli.capUsd);
      try {
        const { data, jobId } = await callApi(fal, entry, request);
        const result = await writeResult(entry, v, data);
        ledgerResult(call, result, jobId);
        spent += entry.estCostUsd ?? 0;
        console.log(`  ${result.rel} (${result.bytes} bytes, job ${jobId})`);
      } catch (e) {
        ledgerError(call, e);
        fail(`${entry.id} variant ${v + 1}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }
  console.log(`done. Session spend est $${estTotal.toFixed(2)}; ${PROVIDER} total $${spent.toFixed(2)}.`);
}

await main();

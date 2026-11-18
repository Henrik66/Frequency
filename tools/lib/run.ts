// Shared runtime for gen-* tools: CLI flags, .env loading, placeholder
// files, and the spend ledger. Generation tools spend money, so they run
// dry unless --live is passed and log every paid call before it starts.

/// <reference types="node" />
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import type { ManifestEntry } from "#lib/manifest";

export const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const LEDGER_PATH = join(REPO_ROOT, "manifests", "ledger.jsonl");

export interface Cli {
  live: boolean;
  manifestPath: string;
  only: string[];
  capUsd?: number;
}

export function parseCli(argv: string[], defaultManifest: string, tool: string): Cli {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    options: {
      live: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      manifest: { type: "string", default: defaultManifest },
      only: { type: "string" },
      cap: { type: "string" },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(
      [
        `usage: node ${tool} [flags]`,
        "",
        "Runs dry by default: mocks the API and writes a placeholder file",
        "per manifest entry. --live makes real paid calls.",
        "",
        "  --dry-run          mock the API (default)",
        "  --live             make real paid API calls",
        `  --manifest <path>  manifest yaml (default ${defaultManifest})`,
        "  --only <substr>    only entries whose id contains this (repeatable via commas)",
        "  --cap <usd>        stop before a call would push the provider total past this",
      ].join("\n"),
    );
    process.exit(0);
  }
  const only = (values.only ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const capUsd = values.cap === undefined ? undefined : Number(values.cap);
  if (capUsd !== undefined && (!Number.isFinite(capUsd) || capUsd <= 0)) {
    fail(`--cap must be a positive number, got "${values.cap}"`);
  }
  return {
    live: values.live && !values["dry-run"],
    manifestPath: values.manifest,
    only,
    capUsd,
  };
}

export function fail(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(1);
}

/** Load repo .env into process.env if present. Absent file is fine: dry-run needs no keys. */
export function loadEnvFile(): void {
  try {
    process.loadEnvFile(join(REPO_ROOT, ".env"));
  } catch {
    // no .env: ok for --dry-run, --live will fail when it asks for the key
  }
}

export function requireKey(name: string): string {
  const v = process.env[name];
  if (!v) fail(`${name} is not set. Copy .env.example to .env and fill it in (keys never enter the repo).`);
  return v;
}

export function selectEntries<T extends { id: string }>(entries: T[], only: string[]): T[] {
  if (only.length === 0) return entries;
  return entries.filter((e) => only.some((o) => e.id.includes(o)));
}

/** Out path for a variant: out as-is for a single variant, name.vN.ext for batches. */
export function variantOut(out: string, variant: number, variants: number): string {
  if (variants <= 1) return out;
  const ext = extname(out);
  return `${out.slice(0, -ext.length)}.v${variant + 1}${ext}`;
}

function absOut(rel: string): string {
  // Manifest validation already guarantees repo-relative paths under assets-raw/.
  return join(REPO_ROOT, rel);
}

export function writePlaceholder(entry: ManifestEntry, variant: number, request: Record<string, unknown>): string {
  const rel = variantOut(entry.out, variant, entry.variants);
  const abs = absOut(rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(
    abs,
    [
      "FREQUENCY DRY-RUN PLACEHOLDER",
      `id: ${entry.id}`,
      `kind: ${entry.kind}`,
      `variant: ${variant + 1}/${entry.variants}`,
      `model: ${entry.model}`,
      "request:",
      JSON.stringify(request, null, 2),
      "",
    ].join("\n"),
  );
  return rel;
}

export async function writeResult(entry: ManifestEntry, variant: number, data: unknown): Promise<{ rel: string; bytes: number; sha256: string }> {
  const rel = variantOut(entry.out, variant, entry.variants);
  const abs = absOut(rel);
  const buf = await toBuffer(data);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, buf);
  return { rel, bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex") };
}

async function toBuffer(data: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (typeof data === "object" && data !== null && Symbol.asyncIterator in data) {
    const chunks: Buffer[] = [];
    for await (const chunk of data as AsyncIterable<Uint8Array>) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }
  throw new Error(`unexpected payload type: ${typeof data}`);
}

interface LedgerRecord {
  ts: string;
  event: "request" | "result" | "error";
  tool: string;
  provider: string;
  id: string;
  variant: number;
  kind: string;
  model: string;
  out?: string;
  estCostUsd?: number;
  request?: Record<string, unknown>;
  bytes?: number;
  sha256?: string;
  jobId?: string;
  error?: string;
}

function ledgerAppend(rec: LedgerRecord): void {
  mkdirSync(dirname(LEDGER_PATH), { recursive: true });
  appendFileSync(LEDGER_PATH, JSON.stringify(rec) + "\n");
}

/** Sum of estCostUsd already logged for a provider, across all sessions. */
export function ledgerSpend(provider: string): number {
  if (!existsSync(LEDGER_PATH)) return 0;
  let total = 0;
  for (const line of readFileSync(LEDGER_PATH, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const rec = JSON.parse(line) as LedgerRecord;
      if (rec.provider === provider && rec.event === "request") total += rec.estCostUsd ?? 0;
    } catch {
      // ignore malformed lines; the ledger is append-only diagnostics
    }
  }
  return total;
}

export interface LiveCall {
  entry: ManifestEntry;
  variant: number;
  provider: string;
  tool: string;
}

/** Log a paid call before it starts; enforce --cap against the ledger total. */
export function ledgerBefore(call: LiveCall, request: Record<string, unknown>, spent: number, capUsd?: number): void {
  const est = call.entry.estCostUsd ?? 0;
  if (capUsd !== undefined && spent + est > capUsd) {
    fail(
      `cap reached: ${call.provider} spend $${spent.toFixed(2)} + next call ~$${est.toFixed(2)} would exceed --cap $${capUsd.toFixed(2)}. ` +
        `Raise the cap or trim the manifest.`,
    );
  }
  ledgerAppend({
    ts: new Date().toISOString(),
    event: "request",
    tool: call.tool,
    provider: call.provider,
    id: call.entry.id,
    variant: call.variant,
    kind: call.entry.kind,
    model: call.entry.model,
    out: variantOut(call.entry.out, call.variant, call.entry.variants),
    estCostUsd: est,
    request,
  });
}

export function ledgerResult(call: LiveCall, result: { rel: string; bytes: number; sha256: string }, jobId?: string): void {
  ledgerAppend({
    ts: new Date().toISOString(),
    event: "result",
    tool: call.tool,
    provider: call.provider,
    id: call.entry.id,
    variant: call.variant,
    kind: call.entry.kind,
    model: call.entry.model,
    out: result.rel,
    bytes: result.bytes,
    sha256: result.sha256,
    jobId,
  });
}

export function ledgerError(call: LiveCall, error: unknown): void {
  ledgerAppend({
    ts: new Date().toISOString(),
    event: "error",
    tool: call.tool,
    provider: call.provider,
    id: call.entry.id,
    variant: call.variant,
    kind: call.entry.kind,
    model: call.entry.model,
    error: error instanceof Error ? error.message : String(error),
  });
}

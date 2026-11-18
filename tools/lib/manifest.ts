// Manifest schema and loader for asset generation.
// Manifests are yaml files in manifests/; see manifests/README.md for the schema.

/// <reference types="node" />
import { readFileSync } from "node:fs";
import { parse } from "yaml";

export const AUDIO_KINDS = ["music", "sfx", "tts"] as const;
export const ART_KINDS = ["image"] as const;
export type AudioKind = (typeof AUDIO_KINDS)[number];
export type ArtKind = (typeof ART_KINDS)[number];
export type EntryKind = AudioKind | ArtKind;

export interface ManifestEntry {
  /** Unique id, lowercase path-like: "music/velvet-loop", "bg/riot/ch1-far". */
  id: string;
  kind: EntryKind;
  /** Generation prompt (music, sfx, image). */
  prompt?: string;
  /** Spoken text (tts only). */
  text?: string;
  /** Voice name, resolved via the manifest's voices map (tts only). */
  voice?: string;
  /** Provider model id, pinned per entry (e.g. "music_v2_5", "fal-ai/flux/schnell"). */
  model: string;
  /** Output file, repo-relative, must live under assets-raw/. */
  out: string;
  /** Number of candidate files to produce, 1-8. Default 1. */
  variants: number;
  seed?: number;
  /** Duration in seconds (music 3-600, sfx 0.5-30). */
  seconds?: number;
  /** Loopable sfx (sfx only). */
  loop?: boolean;
  /** Image size "WxH" (image only). */
  size?: string;
  /** Estimated cost of one generated file, for the spend log and dry-run report. */
  estCostUsd?: number;
  /** Provider request fields, restricted to a per-kind allow-list. */
  options: Record<string, unknown>;
}

export interface Manifest {
  path: string;
  /** tts voice name -> provider voice id. Empty string = not yet created. */
  voices: Record<string, string>;
  entries: ManifestEntry[];
}

export class ManifestError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(`invalid manifest:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
    this.name = "ManifestError";
    this.errors = errors;
  }
}

const ID_RE = /^[a-z0-9][a-z0-9/_-]*$/;
const SIZE_RE = /^[1-9]\d{2,4}x[1-9]\d{2,4}$/;
const ALL_KINDS = new Set<string>([...AUDIO_KINDS, ...ART_KINDS]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export function loadManifest(path: string, kinds?: readonly string[]): Manifest {
  let doc: unknown;
  try {
    doc = parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new ManifestError([`${path}: ${e instanceof Error ? e.message : e}`]);
  }
  if (!isRecord(doc)) throw new ManifestError([`${path}: top level must be a map`]);

  const errors: string[] = [];
  const allowed = kinds ? new Set(kinds) : ALL_KINDS;
  const where = (id: unknown, i: number) => (str(id) ?? `entry[${i}]`);

  if (doc.version !== 1) errors.push(`version must be 1, got ${JSON.stringify(doc.version)}`);

  const voices: Record<string, string> = {};
  if (doc.voices !== undefined) {
    if (!isRecord(doc.voices)) {
      errors.push("voices must be a map of name -> provider voice id");
    } else {
      for (const [name, id] of Object.entries(doc.voices)) {
        if (typeof id !== "string") errors.push(`voices.${name} must be a string`);
        else voices[name] = id;
      }
    }
  }

  const raw = doc.entries;
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push("entries must be a non-empty array");
    throw new ManifestError(errors);
  }

  const seen = new Set<string>();
  const entries: ManifestEntry[] = [];

  raw.forEach((item, i) => {
    const at = `entry[${i}]`;
    if (!isRecord(item)) {
      errors.push(`${at}: must be a map`);
      return;
    }
    const id = str(item.id);
    const label = id ?? at;
    if (!id) errors.push(`${at}: missing id`);
    else {
      if (!ID_RE.test(id)) errors.push(`${id}: id must match ${ID_RE}`);
      if (seen.has(id)) errors.push(`${id}: duplicate id`);
      seen.add(id);
    }

    const kind = str(item.kind);
    if (!kind || !ALL_KINDS.has(kind)) {
      errors.push(`${label}: kind must be one of ${[...ALL_KINDS].join(", ")}`);
      return;
    }
    if (!allowed.has(kind)) {
      errors.push(`${label}: kind "${kind}" is not handled by this tool`);
      return;
    }

    if (kind === "tts") {
      if (!str(item.text)) errors.push(`${label}: tts needs text`);
      const voice = str(item.voice);
      if (!voice) errors.push(`${label}: tts needs a voice name`);
      else if (!(voice in voices)) errors.push(`${label}: voice "${voice}" is not in the voices map`);
    } else if (!str(item.prompt)) {
      errors.push(`${label}: ${kind} needs a prompt`);
    }

    const model = str(item.model);
    if (!model) errors.push(`${label}: model is required (pin the model id, do not rely on defaults)`);

    const out = str(item.out);
    if (out) {
      if (out.startsWith("/") || /^[a-zA-Z]:/.test(out)) errors.push(`${label}: out must be repo-relative, got "${out}"`);
      else if (out.split("/").includes("..")) errors.push(`${label}: out must not contain "..", got "${out}"`);
      else if (!out.startsWith("assets-raw/")) errors.push(`${label}: out must live under assets-raw/, got "${out}"`);
    } else {
      errors.push(`${label}: missing out`);
    }

    let variants = 1;
    if (item.variants !== undefined) {
      const v = num(item.variants);
      if (!v || !Number.isInteger(v) || v < 1 || v > 8) errors.push(`${label}: variants must be an integer 1-8`);
      else variants = v;
    }

    const seconds = num(item.seconds);
    if (seconds !== undefined) {
      if (kind === "music" && (seconds < 3 || seconds > 600)) errors.push(`${label}: music seconds must be 3-600`);
      if (kind === "sfx" && (seconds < 0.5 || seconds > 30)) errors.push(`${label}: sfx seconds must be 0.5-30`);
      if (kind === "image" || kind === "tts") errors.push(`${label}: seconds only applies to music and sfx`);
    }

    const size = str(item.size);
    if (size && !SIZE_RE.test(size)) errors.push(`${label}: size must be "WxH", got "${size}"`);
    if (kind === "image" && !size) errors.push(`${label}: image needs size "WxH"`);
    if (size && kind !== "image") errors.push(`${label}: size only applies to image`);

    if (item.loop !== undefined && kind !== "sfx") errors.push(`${label}: loop only applies to sfx`);

    const seed = num(item.seed);
    if (seed !== undefined && !Number.isInteger(seed)) errors.push(`${label}: seed must be an integer`);

    const estCostUsd = num(item.estCostUsd);
    if (estCostUsd !== undefined && estCostUsd < 0) errors.push(`${label}: estCostUsd must be >= 0`);

    let options: Record<string, unknown> = {};
    if (item.options !== undefined) {
      if (!isRecord(item.options)) errors.push(`${label}: options must be a map`);
      else options = item.options;
    }

    entries.push({
      id: id ?? `entry-${i}`,
      kind: kind as EntryKind,
      prompt: str(item.prompt),
      text: str(item.text),
      voice: str(item.voice),
      model: model ?? "",
      out: out ?? "",
      variants,
      seed,
      seconds,
      loop: item.loop === true,
      size,
      estCostUsd,
      options,
    });
  });

  if (errors.length > 0) throw new ManifestError(errors);
  return { path, voices, entries };
}

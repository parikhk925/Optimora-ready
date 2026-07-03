/**
 * Immutable, content-addressed versioning for agent definitions (T-4.1).
 *
 * Each definition is hashed over its content (excluding the hash itself), frozen,
 * and chained to its predecessor via previousHash. A new version is a brand-new
 * frozen object; the prior version is never mutated. verifyDefinitionHash detects
 * any tampering.
 */
import { createHash } from "node:crypto";
import {
  AgentDefinitionSchema,
  parseAgentDefinition,
  type AgentDefinition,
  type AgentDefinitionInput,
} from "./schema.js";

/** Deterministic JSON: object keys sorted recursively (array order preserved). */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(",")}}`;
}

/** Hash a definition's content (excluding contentHash itself). */
export function computeDefinitionHash(def: AgentDefinition): string {
  const { contentHash: _omit, ...content } = def;
  void _omit;
  return createHash("sha256").update(canonicalize(content)).digest("hex");
}

export function verifyDefinitionHash(def: AgentDefinition): boolean {
  return def.contentHash.length > 0 && def.contentHash === computeDefinitionHash(def);
}

function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === "object") {
    for (const v of Object.values(obj as Record<string, unknown>)) deepFreeze(v);
    Object.freeze(obj);
  }
  return obj;
}

export type NewDefinitionInput = Omit<
  AgentDefinitionInput,
  "version" | "previousHash" | "contentHash"
>;

/** Create the immutable v1 of a definition. */
export function createDefinition(input: NewDefinitionInput, versionNote = ""): AgentDefinition {
  const parsed = parseAgentDefinition({
    ...input,
    version: 1,
    previousHash: null,
    contentHash: "",
    versionNote,
  });
  parsed.contentHash = computeDefinitionHash(parsed);
  return deepFreeze(parsed);
}

/**
 * Produce a new immutable version from a previous definition + a patch. The
 * previous definition is not modified.
 */
export function nextVersion(
  previous: AgentDefinition,
  patch: Partial<NewDefinitionInput>,
  versionNote = "",
): AgentDefinition {
  // Start from the previous content, drop hash fields, apply patch.
  const { contentHash: _h, previousHash: _p, version: _v, ...prevContent } = previous;
  void _h;
  void _p;
  void _v;
  const next = AgentDefinitionSchema.parse({
    ...prevContent,
    ...patch,
    version: previous.version + 1,
    previousHash: previous.contentHash,
    contentHash: "",
    versionNote,
  });
  next.contentHash = computeDefinitionHash(next);
  return deepFreeze(next);
}

export class ImmutabilityError extends Error {}

/** Assert a definition has not been tampered with since it was created. */
export function assertDefinitionIntegrity(def: AgentDefinition): void {
  if (!verifyDefinitionHash(def)) {
    throw new ImmutabilityError("Definition content hash does not match (tampered or unsealed).");
  }
}

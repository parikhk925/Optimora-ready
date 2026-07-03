/**
 * Tool registry (E9 Tools). Holds ToolDefinitions keyed by name alongside their
 * deterministic stub implementations. Real integration handlers plug in here
 * later without changing the runner or runtime.
 */
import type { JsonSchema, ToolDefinition } from "./types.js";

export type ToolFn = (args: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>;

export interface RegistryEntry {
  definition: ToolDefinition;
  fn: ToolFn;
}

export class ToolRegistry {
  private readonly _entries: Map<string, RegistryEntry> = new Map();

  register(definition: ToolDefinition, fn: ToolFn): void {
    this._entries.set(definition.name, { definition, fn });
  }

  get(name: string): RegistryEntry | undefined {
    return this._entries.get(name);
  }

  all(): RegistryEntry[] {
    return [...this._entries.values()];
  }
}

/** Default stub tool definitions + implementations (no side effects, no secrets). */
const ECHO_INPUT: JsonSchema = { type: "object" };
const ECHO_OUTPUT: JsonSchema = { type: "object", properties: { echoed: { type: "object" } } };

const NOOP_INPUT: JsonSchema = { type: "object" };
const NOOP_OUTPUT: JsonSchema = { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] };

const SUMMARIZE_INPUT: JsonSchema = {
  type: "object",
  properties: { text: { type: "string" } },
  required: ["text"],
};
const SUMMARIZE_OUTPUT: JsonSchema = {
  type: "object",
  properties: { summary: { type: "string" } },
  required: ["summary"],
};

export function buildDefaultRegistry(): ToolRegistry {
  const r = new ToolRegistry();
  r.register(
    { name: "echo", description: "Echoes args back.", requiredCaps: [], inputSchema: ECHO_INPUT, outputSchema: ECHO_OUTPUT, available: true },
    (args) => ({ echoed: args }),
  );
  r.register(
    { name: "noop", description: "No-op stub.", requiredCaps: [], inputSchema: NOOP_INPUT, outputSchema: NOOP_OUTPUT, available: true },
    () => ({ ok: true }),
  );
  r.register(
    { name: "summarize", description: "Stub text summarizer (deterministic).", requiredCaps: ["text:summarize"], inputSchema: SUMMARIZE_INPUT, outputSchema: SUMMARIZE_OUTPUT, available: true },
    (args) => ({ summary: `[stub] ${String(args["text"]).slice(0, 80)}` }),
  );
  return r;
}

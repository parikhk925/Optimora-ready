/**
 * Backward-compatibility checks between agent versions (T-4.1).
 *
 * A new version is backward compatible when existing callers/consumers keep
 * working: inputs must not add required fields or remove accepted ones (under
 * additionalProperties:false), and outputs must keep guaranteeing the fields old
 * consumers relied on. Permission/budget changes are reported as notes, not
 * breaking, since they do not change the I/O ABI surface.
 */
import type { AgentDefinition } from "./schema.js";

type JsonSchema = Record<string, unknown>;

function requiredSet(schema: JsonSchema): Set<string> {
  return new Set(Array.isArray(schema.required) ? (schema.required as string[]) : []);
}
function properties(schema: JsonSchema): Record<string, unknown> {
  return (schema.properties as Record<string, unknown>) ?? {};
}
function additionalFalse(schema: JsonSchema): boolean {
  return schema.additionalProperties === false;
}

export interface CompatibilityResult {
  compatible: boolean;
  breaking: string[];
  notes: string[];
}

export function isBackwardCompatible(
  oldDef: AgentDefinition,
  newDef: AgentDefinition,
): CompatibilityResult {
  const breaking: string[] = [];
  const notes: string[] = [];

  // --- inputs: new must accept everything old accepted ---
  const oldInReq = requiredSet(oldDef.inputSchema);
  const newInReq = requiredSet(newDef.inputSchema);
  for (const f of newInReq) {
    if (!oldInReq.has(f)) breaking.push(`input: new required field "${f}"`);
  }
  if (additionalFalse(newDef.inputSchema)) {
    const newInProps = properties(newDef.inputSchema);
    for (const k of Object.keys(properties(oldDef.inputSchema))) {
      if (!(k in newInProps)) {
        breaking.push(`input: removed property "${k}" while additionalProperties:false`);
      }
    }
  }

  // --- outputs: consumers of old output must still get old guarantees ---
  const oldOutReq = requiredSet(oldDef.outputSchema);
  const newOutReq = requiredSet(newDef.outputSchema);
  for (const f of oldOutReq) {
    if (!newOutReq.has(f)) breaking.push(`output: no longer guarantees required field "${f}"`);
  }
  const newOutProps = properties(newDef.outputSchema);
  for (const k of Object.keys(properties(oldDef.outputSchema))) {
    if (!(k in newOutProps)) breaking.push(`output: removed property "${k}"`);
  }

  // --- notes (non-breaking) ---
  const oldPerms = new Set(oldDef.permissions);
  for (const p of newDef.permissions) if (!oldPerms.has(p)) notes.push(`added permission "${p}"`);
  if (oldDef.budget.budgetNodeId !== newDef.budget.budgetNodeId) {
    notes.push("budget binding changed");
  }

  return { compatible: breaking.length === 0, breaking, notes };
}

/**
 * Agent input/output validation (T-4.1). An agent declares JSON Schemas for its
 * inputs and outputs; these helpers validate payloads against them using Ajv.
 */
import Ajv, { type ValidateFunction } from "ajv";
import type { AgentDefinition } from "./schema.js";

const ajv = new Ajv({ allErrors: true, strict: false });

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function compile(schema: Record<string, unknown>): ValidateFunction {
  return ajv.compile(schema);
}

function run(validate: ValidateFunction, data: unknown): ValidationResult {
  const valid = validate(data) as boolean;
  const errors = (validate.errors ?? []).map(
    (e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}`,
  );
  return { valid, errors };
}

/** Assert the agent's declared input/output schemas are themselves valid JSON Schema. */
export function assertValidIoSchemas(def: AgentDefinition): void {
  ajv.compile(def.inputSchema);
  ajv.compile(def.outputSchema);
}

export function validateInput(def: AgentDefinition, data: unknown): ValidationResult {
  return run(compile(def.inputSchema), data);
}

export function validateOutput(def: AgentDefinition, data: unknown): ValidationResult {
  return run(compile(def.outputSchema), data);
}

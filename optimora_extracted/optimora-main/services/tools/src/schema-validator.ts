/**
 * Deterministic JSON-Schema subset validator (E9 Tools). Validates that a value
 * satisfies a schema's `type`, `required`, and `properties.type` constraints. No
 * external schema library — pure, deterministic, no I/O, no paid calls.
 */
import type { JsonSchema } from "./types.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function checkType(value: unknown, schema: JsonSchema, path: string): string[] {
  const errors: string[] = [];
  const schemaType = schema["type"] as string | undefined;
  if (schemaType !== undefined && typeOf(value) !== schemaType) {
    errors.push(`${path}: expected ${schemaType}, got ${typeOf(value)}`);
    return errors; // No point checking properties if top-level type is wrong.
  }
  if (schemaType === "object" && value !== null && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const required = (schema["required"] as string[] | undefined) ?? [];
    for (const key of required) {
      if (!(key in obj)) errors.push(`${path}.${key}: required field missing`);
    }
    const props = (schema["properties"] as Record<string, JsonSchema> | undefined) ?? {};
    for (const [key, propSchema] of Object.entries(props)) {
      if (key in obj) {
        errors.push(...checkType(obj[key], propSchema, `${path}.${key}`));
      }
    }
  }
  return errors;
}

export function validate(value: unknown, schema: JsonSchema): ValidationResult {
  // Empty/open schema: anything is valid.
  if (!schema || Object.keys(schema).length === 0) return { valid: true, errors: [] };
  const errors = checkType(value, schema, "$");
  return { valid: errors.length === 0, errors };
}

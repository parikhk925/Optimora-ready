/**
 * Deterministic echo model provider (T-9.1). Produces a schema-shaped output
 * from the assembled request WITHOUT calling any paid AI model. It populates the
 * agent's declared output fields with deterministic, traceable values so the
 * runtime can be exercised end-to-end. Token counts are deterministic estimates;
 * cost is 0 (no real provider).
 */
import type { ModelProvider, ModelRequest, ModelResult } from "./types.js";

/** ~4 characters per token — a crude but deterministic estimate. */
function estimateTokens(s: string): number {
  return Math.max(1, Math.ceil(s.length / 4));
}

/** Object-schema property names (best-effort; falls back to required list). */
function outputFields(schema: Record<string, unknown>): string[] {
  const props = schema.properties;
  if (props && typeof props === "object" && !Array.isArray(props)) {
    return Object.keys(props as Record<string, unknown>);
  }
  const req = schema.required;
  return Array.isArray(req) ? req.filter((x): x is string => typeof x === "string") : [];
}

export class EchoModelProvider implements ModelProvider {
  readonly name = "echo";

  complete(request: ModelRequest): ModelResult {
    const fields = outputFields(request.outputSchema);
    const output: Record<string, unknown> =
      fields.length > 0
        ? Object.fromEntries(
            fields.map((f) => [f, `${request.role} produced ${f} for "${request.taskTitle}"`]),
          )
        : { result: `${request.role} processed "${request.taskTitle}"`, echo: request.input };

    const inText = JSON.stringify(request.input) + request.jobDescription;
    const outText = JSON.stringify(output);
    return {
      output,
      toolCalls: [],
      tokensIn: estimateTokens(inText),
      tokensOut: estimateTokens(outText),
    };
  }
}

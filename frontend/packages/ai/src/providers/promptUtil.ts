/**
 * Shared helpers for real (non-mock) LLM providers. Every real provider must
 * return strict JSON matching the zod schema outputValidation.ts picks for the
 * agent's key, so the prompt instructs the model accordingly and the response
 * parser tolerates markdown code fences some models wrap JSON in.
 */

export function buildSystemPrompt(agentKey: string): string {
  return (
    `You are the "${agentKey}" automation agent inside Optimora, an agency/AI-agent ` +
    `workflow platform. Respond with ONLY a single strict JSON object — no prose, no ` +
    `markdown code fences, no explanation before or after. The JSON fields must match ` +
    `what the instruction asks for exactly.`
  );
}

export function buildUserPrompt(instruction: string, context: Record<string, unknown>): string {
  return `Instruction: ${instruction}\n\nContext (JSON):\n${JSON.stringify(context, null, 2)}`;
}

export function parseJsonResponse(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1]!.trim() : trimmed;
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Model response was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function estimateTokens(text: string): number {
  return Math.max(8, Math.round(text.length / 4));
}

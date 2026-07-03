/**
 * @optimora/ai — Agent Execution Architecture (production readiness pass).
 *
 * Provider-agnostic agent runner used by the Automation OS workflow execution
 * engine. The default provider is `mock` so demo/staging environments produce
 * deterministic, structured output without any paid AI calls. Real providers
 * (OpenAI, Anthropic) are wired as placeholders behind environment variables —
 * they throw a clear "not configured" error until an API key is supplied, they
 * are never silently skipped or faked as successful.
 */
import type { AgentInput, AgentOutput, AgentProvider } from "./providers/base.js";
import { MockProvider } from "./providers/mockProvider.js";
import { OpenAIProvider } from "./providers/openaiProvider.js";
import { AnthropicProvider } from "./providers/anthropicProvider.js";
import { validateAgentOutput } from "./outputValidation.js";

export const PACKAGE_NAME = "@optimora/ai" as const;

export function packageInfo(): { name: string } {
  return { name: PACKAGE_NAME };
}

export type { AgentInput, AgentOutput, AgentProvider } from "./providers/base.js";
export { MockProvider } from "./providers/mockProvider.js";
export { OpenAIProvider } from "./providers/openaiProvider.js";
export { AnthropicProvider } from "./providers/anthropicProvider.js";
export { validateAgentOutput, AgentOutputValidationError } from "./outputValidation.js";

export interface AgentRunResult {
  provider: string;
  model: string;
  output: Record<string, unknown>;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  status: "succeeded" | "failed";
  error?: string;
  startedAt: Date;
  completedAt: Date;
}

/**
 * Resolves which provider implementation to use. Defaults to `mock`.
 * Set AGENT_PROVIDER=openai|anthropic to opt into a real provider (requires
 * the matching API key env var — OPENAI_API_KEY / ANTHROPIC_API_KEY).
 */
export function resolveProvider(providerKey?: string): AgentProvider {
  const key = (providerKey ?? process.env.AGENT_PROVIDER ?? "mock").toLowerCase();
  if (key === "openai") return new OpenAIProvider();
  if (key === "anthropic") return new AnthropicProvider();
  return new MockProvider();
}

/**
 * Runs a single agent step end-to-end: resolves the provider, executes it,
 * validates the structured output, and returns a normalized result ready to
 * be persisted onto AgentRun / WorkflowRunStep. Never throws — failures are
 * captured in the returned result so the workflow engine can apply retry rules.
 */
export async function runAgent(input: AgentInput, providerKey?: string): Promise<AgentRunResult> {
  const startedAt = new Date();
  const provider = resolveProvider(providerKey);

  try {
    const raw: AgentOutput = await provider.run(input);
    const validated = validateAgentOutput(input.agentKey, raw.output);
    return {
      provider: provider.name,
      model: raw.model,
      output: validated,
      tokensIn: raw.tokensIn,
      tokensOut: raw.tokensOut,
      costUsd: raw.costUsd,
      status: "succeeded",
      startedAt,
      completedAt: new Date(),
    };
  } catch (error) {
    return {
      provider: provider.name,
      model: "unknown",
      output: {},
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      startedAt,
      completedAt: new Date(),
    };
  }
}

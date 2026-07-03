/**
 * Base provider contract for the Agent Execution Architecture.
 * All providers (mock, OpenAI, Anthropic, ...) implement this interface so the
 * workflow execution engine can swap providers purely via environment variable
 * (AGENT_PROVIDER) without touching engine code.
 */

export interface AgentInput {
  /** Agent definition key (e.g. "lead-qualifier", "ticket-classifier"). */
  agentKey: string;
  /** Free-form instruction describing what the agent must produce. */
  instruction: string;
  /** Structured context passed to the agent (trigger payload + upstream step outputs). */
  context: Record<string, unknown>;
}

export interface AgentOutput {
  model: string;
  /** Structured JSON result — validated against a per-agent schema before use. */
  output: Record<string, unknown>;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

export interface AgentProvider {
  /** Provider key used in AgentRun.provider (e.g. "mock", "openai", "anthropic"). */
  readonly name: string;
  run(input: AgentInput): Promise<AgentOutput>;
}

export class ProviderNotConfiguredError extends Error {}

/**
 * Anthropic provider — placeholder architecture. Not wired to a real API call
 * in this pass. Throws a clear "not configured" error unless ANTHROPIC_API_KEY
 * is set. See openaiProvider.ts for the same pattern.
 */
import type { AgentInput, AgentOutput, AgentProvider } from "./base.js";
import { ProviderNotConfiguredError } from "./base.js";

export class AnthropicProvider implements AgentProvider {
  readonly name = "anthropic";

  async run(_input: AgentInput): Promise<AgentOutput> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new ProviderNotConfiguredError(
        "Anthropic provider selected (AGENT_PROVIDER=anthropic) but ANTHROPIC_API_KEY is not set. " +
          "Set ANTHROPIC_API_KEY or switch AGENT_PROVIDER back to 'mock'.",
      );
    }
    throw new ProviderNotConfiguredError(
      "Anthropic provider is scaffolded but not yet implemented. Use AGENT_PROVIDER=mock for demo/staging.",
    );
  }
}

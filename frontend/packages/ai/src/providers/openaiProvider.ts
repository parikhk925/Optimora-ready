/**
 * OpenAI provider — placeholder architecture. Not wired to a real API call in
 * this pass. Throws a clear "not configured" error unless OPENAI_API_KEY is
 * set, so the app never silently pretends to call a real model. Flip
 * AGENT_PROVIDER=openai + set OPENAI_API_KEY to activate a real integration
 * later without changing engine code.
 */
import type { AgentInput, AgentOutput, AgentProvider } from "./base.js";
import { ProviderNotConfiguredError } from "./base.js";

export class OpenAIProvider implements AgentProvider {
  readonly name = "openai";

  async run(_input: AgentInput): Promise<AgentOutput> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ProviderNotConfiguredError(
        "OpenAI provider selected (AGENT_PROVIDER=openai) but OPENAI_API_KEY is not set. " +
          "Set OPENAI_API_KEY or switch AGENT_PROVIDER back to 'mock'.",
      );
    }
    // Real OpenAI Chat Completions / Responses API call is intentionally not
    // implemented in this pass — architecture-only per production scope.
    throw new ProviderNotConfiguredError(
      "OpenAI provider is scaffolded but not yet implemented. Use AGENT_PROVIDER=mock for demo/staging.",
    );
  }
}

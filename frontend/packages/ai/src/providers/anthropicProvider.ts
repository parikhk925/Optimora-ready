/**
 * Anthropic provider — real implementation, opt-in via ANTHROPIC_API_KEY.
 * Throws a clear "not configured" error unless the key is set. See
 * openaiProvider.ts for the same pattern.
 */
import type { AgentInput, AgentOutput, AgentProvider } from "./base.js";
import { ProviderNotConfiguredError } from "./base.js";
import { buildSystemPrompt, buildUserPrompt, parseJsonResponse } from "./promptUtil.js";

const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";
const ANTHROPIC_VERSION = "2023-06-01";

interface AnthropicResponse {
  model?: string;
  content?: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
}

export class AnthropicProvider implements AgentProvider {
  readonly name = "anthropic";

  async run(input: AgentInput): Promise<AgentOutput> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new ProviderNotConfiguredError(
        "Anthropic provider selected (AGENT_PROVIDER=anthropic) but ANTHROPIC_API_KEY is not set. " +
          "Set ANTHROPIC_API_KEY or switch AGENT_PROVIDER back to 'mock'.",
      );
    }
    const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: buildSystemPrompt(input.agentKey),
        messages: [{ role: "user", content: buildUserPrompt(input.instruction, input.context) }],
      }),
    });

    const data = (await res.json()) as AnthropicResponse;
    if (!res.ok) {
      throw new Error(`Anthropic request failed (${res.status}): ${data.error?.message ?? res.statusText}`);
    }
    const text = data.content?.find((block) => block.type === "text")?.text;
    if (!text) {
      throw new Error("Anthropic response had no text content.");
    }

    return {
      model: data.model ?? model,
      output: parseJsonResponse(text),
      tokensIn: data.usage?.input_tokens ?? 0,
      tokensOut: data.usage?.output_tokens ?? 0,
      costUsd: 0,
    };
  }
}

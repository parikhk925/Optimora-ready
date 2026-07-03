/**
 * OpenRouter provider — real implementation. OpenRouter exposes an
 * OpenAI-Chat-Completions-compatible endpoint that can route to many
 * underlying models, so it's the cheapest way to get a real (non-mock) AI
 * path working with a single key. Model is configurable via OPENROUTER_MODEL.
 */
import type { AgentInput, AgentOutput, AgentProvider } from "./base.js";
import { ProviderNotConfiguredError } from "./base.js";
import { buildSystemPrompt, buildUserPrompt, parseJsonResponse } from "./promptUtil.js";

const DEFAULT_MODEL = "openai/gpt-4o-mini";

interface OpenRouterChoice {
  message?: { content?: string };
}
interface OpenRouterResponse {
  model?: string;
  choices?: OpenRouterChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

export class OpenRouterProvider implements AgentProvider {
  readonly name = "openrouter";

  async run(input: AgentInput): Promise<AgentOutput> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new ProviderNotConfiguredError(
        "OpenRouter provider selected (AGENT_PROVIDER=openrouter) but OPENROUTER_API_KEY is not set. " +
          "Set OPENROUTER_API_KEY or switch AGENT_PROVIDER back to 'mock'.",
      );
    }
    const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildSystemPrompt(input.agentKey) },
          { role: "user", content: buildUserPrompt(input.instruction, input.context) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    const data = (await res.json()) as OpenRouterResponse;
    if (!res.ok) {
      throw new Error(`OpenRouter request failed (${res.status}): ${data.error?.message ?? res.statusText}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenRouter response had no message content.");
    }

    return {
      model: data.model ?? model,
      output: parseJsonResponse(content),
      tokensIn: data.usage?.prompt_tokens ?? 0,
      tokensOut: data.usage?.completion_tokens ?? 0,
      costUsd: 0,
    };
  }
}

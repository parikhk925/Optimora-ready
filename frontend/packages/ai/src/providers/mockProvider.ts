/**
 * Mock provider — deterministic, zero-cost, zero-network AI agent implementation.
 * This is the DEFAULT provider for demo/staging so the app is fully runnable
 * without any paid AI keys. Output is structured JSON, derived deterministically
 * from the input so runs are reproducible and testable.
 */
import type { AgentInput, AgentOutput, AgentProvider } from "./base.js";

function hashScore(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return min + (hash % (max - min + 1));
}

function estimateTokens(text: string): number {
  return Math.max(8, Math.round(text.length / 4));
}

function buildOutput(agentKey: string, instruction: string, context: Record<string, unknown>): Record<string, unknown> {
  const key = agentKey.toLowerCase();
  const seed = `${agentKey}:${JSON.stringify(context)}`;

  if (key.includes("lead") && (key.includes("qualif") || key.includes("score"))) {
    const score = hashScore(seed, 35, 97);
    return {
      leadScore: score,
      qualified: score >= 80,
      reasoning: `Lead scored ${score}/100 based on company size, stated budget, and engagement signals in the submitted form data.`,
      recommendation: score >= 80 ? "Route to sales for immediate follow-up." : "Add to nurture sequence.",
    };
  }

  if (key.includes("ticket") || key.includes("triage") || key.includes("support") || key.includes("classif")) {
    const priorities = ["low", "medium", "high", "urgent"] as const;
    const priority = priorities[hashScore(seed, 0, priorities.length - 1)];
    return {
      category: hashScore(seed, 0, 1) === 0 ? "billing" : "technical",
      priority,
      urgent: priority === "high" || priority === "urgent",
      reasoning: `Classified from ticket subject/body using keyword and sentiment heuristics; priority set to "${priority}".`,
    };
  }

  if (key.includes("report") || key.includes("summary") || key.includes("business")) {
    return {
      summary: "Revenue trended up 6% week-over-week; support ticket volume is stable; three workflows completed with no failures.",
      highlights: [
        "4 workflow runs completed automatically today",
        "0 workflow runs failed",
        "2 approvals resolved by the team",
      ],
      metricsReviewed: Object.keys(context).length,
    };
  }

  if (key.includes("order") || key.includes("risk")) {
    const risk = hashScore(seed, 0, 100);
    return {
      riskLevel: risk > 70 ? "high" : risk > 35 ? "medium" : "low",
      riskScore: risk,
      reasoning: `Order flagged ${risk > 70 ? "high" : risk > 35 ? "medium" : "low"} risk based on order value, shipping address mismatch, and payment method heuristics.`,
      recommendation: risk > 70 ? "Hold for manual review before fulfillment." : "Proceed with standard fulfillment.",
    };
  }

  if (key.includes("client") || key.includes("update") || key.includes("agency")) {
    return {
      updateText: "This week: campaigns are pacing on target, 3 tasks completed, 1 blocked pending client asset delivery. Next check-in scheduled for Friday.",
      highlights: ["Campaign pacing on target", "3 tasks completed", "1 task blocked on client assets"],
      tone: "professional",
    };
  }

  if ((key.includes("resume") || key.includes("candidate")) && (key.includes("screen") || key.includes("pars"))) {
    const score = hashScore(seed, 20, 95);
    return {
      candidateName: "Sample Candidate",
      email: null,
      phone: null,
      skills: ["JavaScript", "TypeScript", "Node.js"],
      yearsExperience: hashScore(seed, 1, 10),
      summary: "Mock-parsed resume — no external AI call was made.",
      matchScore: score,
      recommendation: score >= 70 ? "shortlist" : score >= 40 ? "maybe" : "reject",
    };
  }

  if (key.includes("offer") && key.includes("letter")) {
    return {
      subject: "Your offer from the team",
      letterBody: "This is a mock-generated offer letter body — no external AI call was made. Configure AGENT_PROVIDER=openrouter (or openai/anthropic) with an API key to generate real letters.",
    };
  }

  // Generic fallback for any other agent key in the 130+ workflow catalog.
  return {
    result: `Processed "${instruction}" using mock provider (deterministic, no external AI call).`,
    inputEcho: context,
    confidence: hashScore(seed, 60, 95) / 100,
  };
}

export class MockProvider implements AgentProvider {
  readonly name = "mock";

  async run(input: AgentInput): Promise<AgentOutput> {
    const output = buildOutput(input.agentKey, input.instruction, input.context);
    const inputText = `${input.instruction} ${JSON.stringify(input.context)}`;
    const outputText = JSON.stringify(output);
    return {
      model: "mock-deterministic-v1",
      output,
      tokensIn: estimateTokens(inputText),
      tokensOut: estimateTokens(outputText),
      costUsd: 0,
    };
  }
}

/**
 * Learning Engine unit tests (T-8.5) — deterministic signal aggregation, rate
 * calculation, recommendation generation, eval gate, and malformed-signal
 * fail-closed. No DB, no AI.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createDefinition, type AgentDefinition } from "@optimora/agent-contract";
import { aggregateSignals, type CritiqueSignal } from "./aggregate.js";
import { DeterministicLearner } from "./learner.js";
import { evalGate } from "./eval-gate.js";
import { MalformedSignalError } from "./types.js";

const agentId = randomUUID();

function sig(over: Partial<CritiqueSignal>): CritiqueSignal {
  return {
    agentId,
    qualityScore: 1,
    passed: true,
    recommendation: "accept",
    confidence: 1,
    violatedRules: [],
    missingRequirements: [],
    ...over,
  };
}

function def(): AgentDefinition {
  return createDefinition({
    identity: { agentId, key: "writer", displayName: "Writer" },
    role: "Writer",
    qualityRules: { minScore: 0.7, checks: ["has_summary"] },
    retryRules: { maxAttempts: 3, backoff: "exponential", retryOn: [] },
    escalationRules: { onRetriesExhausted: "escalate", escalateToNodeId: null, humanApprovalRequired: false },
  });
}

describe("aggregateSignals", () => {
  it("calculates success/failure/revision/escalation rates and averages", () => {
    const critiques: CritiqueSignal[] = [
      sig({ passed: true, recommendation: "accept", qualityScore: 1, confidence: 1 }),
      sig({ passed: false, recommendation: "revise", qualityScore: 0.4, confidence: 0.8, violatedRules: ["has_summary"], missingRequirements: ["summary"] }),
      sig({ passed: false, recommendation: "escalate", qualityScore: 0.2, confidence: 0.6, violatedRules: ["has_summary"] }),
      sig({ passed: false, recommendation: "revise", qualityScore: 0.5, confidence: 0.9, violatedRules: ["has_summary"], missingRequirements: ["summary"] }),
    ];
    const s = aggregateSignals(agentId, critiques);
    expect(s.runs).toBe(4);
    expect(s.successRate).toBeCloseTo(0.25, 5);
    expect(s.failureRate).toBeCloseTo(0.75, 5);
    expect(s.revisionRate).toBeCloseTo(0.5, 5);
    expect(s.escalationRate).toBeCloseTo(0.25, 5);
    expect(s.avgQuality).toBeCloseTo(0.525, 5);
    expect(s.avgConfidence).toBeCloseTo(0.825, 5);
    expect(s.violatedRuleCounts.has_summary).toBe(3);
    expect(s.missingRequirementCounts.summary).toBe(2);
  });

  it("fails closed on a malformed signal", () => {
    expect(() =>
      aggregateSignals(agentId, [sig({ qualityScore: "bad" as unknown as number })]),
    ).toThrow(MalformedSignalError);
    expect(() =>
      aggregateSignals(agentId, [sig({ violatedRules: "nope" as unknown as string[] })]),
    ).toThrow(MalformedSignalError);
  });
});

describe("DeterministicLearner", () => {
  it("generates recommendations from poor performance signals", () => {
    const critiques: CritiqueSignal[] = Array.from({ length: 6 }, () =>
      sig({ passed: false, recommendation: "escalate", qualityScore: 0.2, confidence: 0.7, violatedRules: ["has_summary"], missingRequirements: ["summary"] }),
    );
    const s = aggregateSignals(agentId, critiques);
    const drafts = new DeterministicLearner().propose(s, def());
    const types = drafts.map((d) => d.type);
    expect(types).toContain("prompt_improvement");
    expect(types).toContain("escalation_rule_adjustment");
    expect(types).toContain("quality_rule_adjustment");
    expect(types).toContain("knowledge_gap");
  });

  it("produces no recommendations for healthy signals", () => {
    const s = aggregateSignals(agentId, Array.from({ length: 6 }, () => sig({})));
    expect(new DeterministicLearner().propose(s, def())).toEqual([]);
  });
});

describe("evalGate", () => {
  it("blocks proposals with an insufficient sample size", () => {
    const s = aggregateSignals(agentId, [sig({ passed: false, recommendation: "revise", qualityScore: 0.2 })]);
    const v = evalGate({ type: "prompt_improvement", rationale: {}, proposedChange: {}, confidence: 0.9 }, s);
    expect(v.passed).toBe(false);
    expect(v.reason).toContain("insufficient_sample_size");
  });

  it("blocks low-confidence proposals and passes safe ones", () => {
    const s = aggregateSignals(agentId, Array.from({ length: 6 }, () => sig({ passed: false, recommendation: "revise", qualityScore: 0.2 })));
    expect(evalGate({ type: "prompt_improvement", rationale: {}, proposedChange: {}, confidence: 0.2 }, s).passed).toBe(false);
    expect(evalGate({ type: "prompt_improvement", rationale: {}, proposedChange: {}, confidence: 0.9 }, s).passed).toBe(true);
  });
});

/**
 * Deterministic learner (T-8.5). Turns aggregated performance signals into
 * learning recommendation drafts using fixed, explainable thresholds. No AI
 * calls. Drafts are PROPOSALS — the engine eval-gates and stores them; nothing
 * here mutates an agent definition.
 */
import type { AgentDefinition } from "@optimora/agent-contract";
import type { LearningProvider, PerformanceSignals, RecommendationDraft } from "./types.js";

/** Thresholds that trigger each deterministic recommendation. */
export const LEARNER_THRESHOLDS = {
  failureRate: 0.3,
  escalationRate: 0.2,
  revisionRate: 0.4,
  /** A signal (violated rule / missing field) is "recurrent" at this fraction. */
  recurrence: 0.5,
} as const;

/** Dominant entries of a count map at/above `fraction` of `runs`, sorted desc. */
function dominant(counts: Record<string, number>, runs: number, fraction: number): string[] {
  const threshold = runs * fraction;
  return Object.entries(counts)
    .filter(([, n]) => n >= threshold)
    .sort((a, b) => (b[1] - a[1] !== 0 ? b[1] - a[1] : a[0].localeCompare(b[0])))
    .map(([k]) => k);
}

export class DeterministicLearner implements LearningProvider {
  readonly name = "deterministic";

  propose(signals: PerformanceSignals, definition: AgentDefinition): RecommendationDraft[] {
    const drafts: RecommendationDraft[] = [];
    const { runs } = signals;

    // 1) Sustained failures → propose a prompt improvement.
    if (signals.failureRate >= LEARNER_THRESHOLDS.failureRate) {
      drafts.push({
        type: "prompt_improvement",
        rationale: { failureRate: signals.failureRate, avgQuality: signals.avgQuality },
        proposedChange: {
          appendJobDescription:
            "Re-read the task requirements and the output schema before answering; " +
            "ensure every required field is populated and the quality checks pass.",
        },
        confidence: Math.min(1, signals.failureRate + signals.avgConfidence / 2),
      });
    }

    // 2) High escalation rate → propose an escalation-rule adjustment.
    if (signals.escalationRate >= LEARNER_THRESHOLDS.escalationRate) {
      drafts.push({
        type: "escalation_rule_adjustment",
        rationale: { escalationRate: signals.escalationRate },
        proposedChange: {
          current: definition.escalationRules.onRetriesExhausted,
          suggested: "human",
          note: "Frequent escalations — consider routing exhausted retries to a human reviewer.",
        },
        confidence: Math.min(1, signals.escalationRate + 0.3),
      });
    }

    // 3) High revision rate → propose a retry-rule adjustment.
    if (signals.revisionRate >= LEARNER_THRESHOLDS.revisionRate) {
      drafts.push({
        type: "retry_rule_adjustment",
        rationale: { revisionRate: signals.revisionRate },
        proposedChange: {
          currentMaxAttempts: definition.retryRules.maxAttempts,
          suggestedMaxAttempts: definition.retryRules.maxAttempts + 1,
          note: "Many revisions — allow one additional retry before escalating.",
        },
        confidence: Math.min(1, signals.revisionRate),
      });
    }

    // 4) A recurrently violated check → propose a quality-rule adjustment.
    for (const rule of dominant(signals.violatedRuleCounts, runs, LEARNER_THRESHOLDS.recurrence)) {
      drafts.push({
        type: "quality_rule_adjustment",
        rationale: { rule, count: signals.violatedRuleCounts[rule], runs },
        proposedChange: {
          rule,
          note: `Check "${rule}" fails consistently — review whether the prompt/skills support it or the rule needs tuning.`,
        },
        confidence: Math.min(1, (signals.violatedRuleCounts[rule] ?? 0) / runs),
      });
    }

    // 5) A recurrently missing required field → propose a knowledge gap.
    for (const field of dominant(signals.missingRequirementCounts, runs, LEARNER_THRESHOLDS.recurrence)) {
      drafts.push({
        type: "knowledge_gap",
        rationale: { field, count: signals.missingRequirementCounts[field], runs },
        proposedChange: {
          field,
          note: `Required field "${field}" is frequently missing — the agent may lack the knowledge/binding to produce it.`,
        },
        confidence: Math.min(1, (signals.missingRequirementCounts[field] ?? 0) / runs),
      });
    }

    return drafts;
  }
}

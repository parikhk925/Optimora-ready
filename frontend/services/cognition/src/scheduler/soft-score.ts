/**
 * Soft score (T-8.2, Spec A). Deterministic weighted score over eligible
 * candidates only. No randomness, no LLM judging.
 */
import type {
  ScoreBreakdown,
  ScoreWeights,
  SchedulerCandidate,
  TaskRequirements,
} from "./types.js";

export interface ScoreContext {
  costMin: number;
  costMax: number;
  latencyMin: number;
  latencyMax: number;
  preferredAgentIds: string[];
}

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Higher value = better (cheaper / faster) within the eligible range. */
function inverseNorm(value: number, min: number, max: number): number {
  if (max <= min) return 1;
  return clamp01((max - value) / (max - min));
}

export function softScore(
  candidate: SchedulerCandidate,
  requirements: TaskRequirements,
  ctx: ScoreContext,
  weights: ScoreWeights,
): ScoreBreakdown {
  const required = requirements.requiredSkills ?? [];
  const skillMatch =
    required.length === 0
      ? 1
      : clamp01(
          required.filter((s) => candidate.definition.skills.includes(s)).length / required.length,
        );

  const reputation = clamp01(candidate.reputation);
  const costEfficiency = inverseNorm(candidate.avgCost, ctx.costMin, ctx.costMax);
  const availability =
    candidate.concurrencyCap > 0
      ? clamp01(1 - candidate.currentLoad / candidate.concurrencyCap)
      : 0;
  const deadline = inverseNorm(candidate.avgLatencyMs, ctx.latencyMin, ctx.latencyMax);
  const historicalSuccess = clamp01(candidate.successRate);
  const preference = ctx.preferredAgentIds.includes(candidate.definition.identity.agentId) ? 1 : 0;

  const total =
    weights.skillMatch * skillMatch +
    weights.reputation * reputation +
    weights.costEfficiency * costEfficiency +
    weights.availability * availability +
    weights.deadline * deadline +
    weights.historicalSuccess * historicalSuccess +
    weights.preference * preference;

  return {
    skillMatch,
    reputation,
    costEfficiency,
    availability,
    deadline,
    historicalSuccess,
    preference,
    total,
  };
}

/** Quality-weighted for high-priority (P0/P1) tasks; cost-weighted otherwise. */
export function weightsForPriority(priority: number): ScoreWeights {
  if (priority <= 1) {
    return {
      skillMatch: 0.2,
      reputation: 0.25,
      costEfficiency: 0.05,
      availability: 0.1,
      deadline: 0.15,
      historicalSuccess: 0.2,
      preference: 0.05,
    };
  }
  return {
    skillMatch: 0.15,
    reputation: 0.15,
    costEfficiency: 0.3,
    availability: 0.1,
    deadline: 0.1,
    historicalSuccess: 0.15,
    preference: 0.05,
  };
}

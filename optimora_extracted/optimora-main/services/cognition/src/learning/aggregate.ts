/**
 * Performance-signal aggregation (T-8.5). Pure, deterministic reduction of a set
 * of Critique records into per-agent metrics. Malformed critique rows fail
 * closed (a learning signal must be well-formed to be trusted).
 */
import { MalformedSignalError, type PerformanceSignals } from "./types.js";

/** The subset of a Critique record the aggregator depends on. */
export interface CritiqueSignal {
  agentId: string | null;
  qualityScore: unknown;
  passed: unknown;
  recommendation: unknown;
  confidence: unknown;
  violatedRules: unknown;
  missingRequirements: unknown;
}

function asFiniteNumber(v: unknown, field: string): number {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new MalformedSignalError(`Critique signal "${field}" must be a finite number.`);
  }
  return v;
}

function asStringArray(v: unknown, field: string): string[] {
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) {
    throw new MalformedSignalError(`Critique signal "${field}" must be a string array.`);
  }
  return v as string[];
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function tally(target: Record<string, number>, keys: string[]): void {
  for (const k of keys) target[k] = (target[k] ?? 0) + 1;
}

/**
 * Aggregate critiques for a single agent into deterministic performance signals.
 * `critiques` must be non-empty (callers fail closed on missing critiques first).
 */
export function aggregateSignals(agentId: string, critiques: CritiqueSignal[]): PerformanceSignals {
  const runs = critiques.length;
  let qualitySum = 0;
  let confidenceSum = 0;
  let successes = 0;
  let revisions = 0;
  let escalations = 0;
  const violatedRuleCounts: Record<string, number> = {};
  const missingRequirementCounts: Record<string, number> = {};

  for (const c of critiques) {
    qualitySum += asFiniteNumber(c.qualityScore, "qualityScore");
    confidenceSum += asFiniteNumber(c.confidence, "confidence");
    if (typeof c.passed !== "boolean") {
      throw new MalformedSignalError(`Critique signal "passed" must be a boolean.`);
    }
    if (c.passed) successes += 1;
    if (typeof c.recommendation !== "string") {
      throw new MalformedSignalError(`Critique signal "recommendation" must be a string.`);
    }
    if (c.recommendation === "revise") revisions += 1;
    if (c.recommendation === "escalate") escalations += 1;
    tally(violatedRuleCounts, asStringArray(c.violatedRules, "violatedRules"));
    tally(missingRequirementCounts, asStringArray(c.missingRequirements, "missingRequirements"));
  }

  const avgQuality = qualitySum / runs;
  const successRate = successes / runs;
  const reputation = clamp01(0.5 * avgQuality + 0.5 * successRate);

  return {
    agentId,
    runs,
    avgQuality,
    successRate,
    failureRate: (runs - successes) / runs,
    revisionRate: revisions / runs,
    escalationRate: escalations / runs,
    avgConfidence: confidenceSum / runs,
    reputation,
    violatedRuleCounts,
    missingRequirementCounts,
  };
}

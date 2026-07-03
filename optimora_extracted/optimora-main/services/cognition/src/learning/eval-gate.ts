/**
 * Eval gate (T-8.5). Deterministic safety gate that every learning proposal must
 * clear before it could ever be approved/applied. Blocking a proposal does NOT
 * discard it — the record is still stored (status `proposed`, evalGatePassed
 * false) for audit. Nothing here applies a change.
 */
import type { PerformanceSignals, RecommendationDraft } from "./types.js";

export const EVAL_GATE = {
  /** Minimum critiques required before a proposal is trustworthy. */
  minSamples: 5,
  /** Minimum confidence required to pass the gate. */
  minConfidence: 0.5,
} as const;

export interface GateVerdict {
  passed: boolean;
  reason: string | null;
}

/**
 * Decide whether a proposal is safe enough to be eligible for approval. Fails
 * closed: any unmet condition blocks (passed=false) with an explicit reason.
 */
export function evalGate(
  draft: RecommendationDraft,
  signals: PerformanceSignals,
  opts: { minSamples?: number; minConfidence?: number } = {},
): GateVerdict {
  const minSamples = opts.minSamples ?? EVAL_GATE.minSamples;
  const minConfidence = opts.minConfidence ?? EVAL_GATE.minConfidence;

  if (signals.runs < minSamples) {
    return { passed: false, reason: `insufficient_sample_size (${signals.runs} < ${minSamples})` };
  }
  if (!Number.isFinite(draft.confidence) || draft.confidence < minConfidence) {
    return { passed: false, reason: `low_confidence (${draft.confidence} < ${minConfidence})` };
  }
  return { passed: true, reason: null };
}

/**
 * Learning Engine types (T-8.5). Deterministic-first: consumes Reflection
 * Engine Critique records, aggregates per-agent performance signals, and emits
 * versioned, auditable, eval-gated learning recommendations. Recommendations are
 * PROPOSALS only — they never mutate live agent definitions without approval.
 * An LLM-assisted learner plugs in behind the provider seam later (stubbed).
 */
import type { AgentDefinition } from "@optimora/agent-contract";
import type { Principal } from "@optimora/auth-core";

/** Supported learning recommendation types. */
export type RecommendationType =
  | "prompt_improvement"
  | "quality_rule_adjustment"
  | "skill_gap"
  | "tool_gap"
  | "knowledge_gap"
  | "escalation_rule_adjustment"
  | "retry_rule_adjustment";

/** Lifecycle of a proposal. Proposals start `proposed`; approval is out-of-band. */
export type ProposalStatus = "proposed" | "approved" | "rejected";

export interface LearningContext {
  tenantId: string;
  orgId: string;
  /** When provided, the run is authorized via the Policy Engine (fail closed). */
  principal?: Principal;
  requiredPermission?: string;
}

/** Aggregated per-agent performance signals derived from Critique records. */
export interface PerformanceSignals {
  agentId: string;
  /** Number of critiques aggregated. */
  runs: number;
  avgQuality: number;
  successRate: number;
  failureRate: number;
  revisionRate: number;
  escalationRate: number;
  avgConfidence: number;
  /** Derived reputation in 0..1 (blend of quality + success). */
  reputation: number;
  /** Frequency of each violated rule across the aggregated critiques. */
  violatedRuleCounts: Record<string, number>;
  /** Frequency of each missing requirement across the aggregated critiques. */
  missingRequirementCounts: Record<string, number>;
}

/** A single eval-gated learning recommendation (proposal). */
export interface LearningRecommendation {
  /** Persisted record id (set once stored). */
  recordId: string;
  agentId: string;
  /** Immutable agent version this proposal targets (NOT mutated). */
  agentVersion: number | null;
  type: RecommendationType;
  status: ProposalStatus;
  rationale: Record<string, unknown>;
  /** The proposed change — applied only after explicit approval, never here. */
  proposedChange: Record<string, unknown>;
  evalGatePassed: boolean;
  evalGateReason: string | null;
  basedOnCritiques: number;
  confidence: number;
}

/** Result of a learning run. */
export interface LearningResult {
  agentId: string;
  signals: PerformanceSignals;
  recommendations: LearningRecommendation[];
}

/** A raw (pre-gate, pre-store) recommendation produced by a learner provider. */
export interface RecommendationDraft {
  type: RecommendationType;
  rationale: Record<string, unknown>;
  proposedChange: Record<string, unknown>;
  confidence: number;
}

/**
 * Provider abstraction for generating recommendations from performance signals.
 * The deterministic learner is the default; an LLM-assisted learner plugs in
 * here later (kept behind a stub — no paid model calls yet).
 */
export interface LearningProvider {
  readonly name: string;
  propose(
    signals: PerformanceSignals,
    definition: AgentDefinition,
  ): RecommendationDraft[] | Promise<RecommendationDraft[]>;
}

export class LearningError extends Error {}
export class InvalidLearningContextError extends LearningError {}
export class MissingLearningContextError extends LearningError {}
export class MalformedSignalError extends LearningError {}
export class LearningProviderNotImplementedError extends LearningError {}

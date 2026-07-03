/**
 * Reflection Engine types (T-8.4). Deterministic-first, rubric/check-based
 * critique of task output against the Agent ABI quality rules, with a provider
 * seam for future LLM-as-judge review. Every critique is recorded, explainable,
 * and tenant-aware.
 */
import type { AgentDefinition } from "@optimora/agent-contract";
import type { Principal } from "@optimora/auth-core";

/** Who produced the critique. */
export type ReviewerType = "deterministic" | "llm_judge";

/** pass/fail result of a critique. */
export type CritiqueResult = "pass" | "fail";

/** Rework-loop decision derived from the critique + retry/escalation rules. */
export type ReflectionRecommendation = "accept" | "revise" | "escalate" | "fail";

export interface ReflectionContext {
  tenantId: string;
  orgId: string;
  /** When provided, the reflection is authorized via the Policy Engine (fail closed). */
  principal?: Principal;
  requiredPermission?: string;
}

/** A single piece of evidence backing a check result. */
export interface EvidenceRef {
  check: string;
  passed: boolean;
  detail: string;
  /** Optional pointer into the output (JSON path / field name). */
  pointer?: string;
}

/**
 * The structured Critique object (T-8.4). The auditable verdict of a single
 * reflection over one task output.
 */
export interface Critique {
  /** Persisted record id (set once stored). */
  recordId: string;
  taskId: string;
  /** Agent identity + definition reference (immutable ABI coordinates). */
  agentId: string | null;
  agentVersion: number | null;
  agentHash: string | null;
  /** 0..1 quality score (weighted fraction of checks passed). */
  qualityScore: number;
  /** pass/fail result. */
  result: CritiqueResult;
  passed: boolean;
  /** Quality-rule checks that were violated. */
  violatedRules: string[];
  /** Output-schema/required fields that were missing. */
  missingRequirements: string[];
  /** Actionable suggestions to fix the violations. */
  suggestedFixes: string[];
  /** 0..1 confidence in this critique. */
  confidence: number;
  /** Evidence references for each evaluated check. */
  evidence: EvidenceRef[];
  /** deterministic | llm_judge. */
  reviewerType: ReviewerType;
  /** Rework-loop decision: accept | revise | escalate | fail. */
  recommendation: ReflectionRecommendation;
  retryRecommended: boolean;
  escalationRecommended: boolean;
  /** Attempt number this critique evaluated (0-based). */
  attempt: number;
}

/**
 * Input to a reflection. `output` is the raw task output to evaluate. `attempt`
 * is the current attempt count (drives retry/escalation), default 0.
 */
export interface ReflectInput {
  taskId: string;
  definition: AgentDefinition;
  output: unknown;
  attempt?: number;
}

/** Raw verdict from a reviewer provider (before rework-loop derivation). */
export interface ReviewVerdict {
  qualityScore: number;
  violatedRules: string[];
  missingRequirements: string[];
  suggestedFixes: string[];
  confidence: number;
  evidence: EvidenceRef[];
  reviewerType: ReviewerType;
}

/**
 * Provider abstraction for a reviewer. The deterministic rubric reviewer is the
 * default; an LLM-as-judge provider plugs in here later (kept behind a stub).
 */
export interface ReflectionProvider {
  readonly reviewerType: ReviewerType;
  review(input: ReflectInput): ReviewVerdict | Promise<ReviewVerdict>;
}

export class ReflectionError extends Error {}
export class InvalidReflectionContextError extends ReflectionError {}
export class MissingReflectionContextError extends ReflectionError {}
export class InvalidOutputError extends ReflectionError {}
export class InvalidQualityRulesError extends ReflectionError {}
export class ReflectionProviderNotImplementedError extends ReflectionError {}

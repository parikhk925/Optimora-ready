/**
 * Decision Engine types (T-8.3). Deterministic-first routing/escalation/conflict
 * decisions over the Org Graph + Scheduler, with a provider seam for future
 * LLM-assisted decisions. Every decision is recorded and explainable.
 */
import type { Principal } from "@optimora/auth-core";

export type DecisionType = "route_department" | "route_agent" | "escalate" | "resolve_conflict";

export type DecisionOutcome = "route" | "escalate" | "allow" | "deny";

export interface DecisionContext {
  tenantId: string;
  orgId: string;
  /** When provided, the decision is authorized via the Policy Engine (fail closed). */
  principal?: Principal;
  requiredPermission?: string;
}

export interface DecisionResult {
  recordId: string;
  type: DecisionType;
  outcome: DecisionOutcome;
  subjectId: string | null;
  targetNodeId: string | null;
  targetAgentId: string | null;
  basis: string;
  rationale: Record<string, unknown>;
}

/** Future LLM-assisted decision provider (not used by deterministic decisions). */
export interface DecisionProvider {
  readonly name: string;
}

export class DecisionError extends Error {}
export class InvalidDecisionContextError extends DecisionError {}
export class UnauthorizedDecisionError extends DecisionError {}

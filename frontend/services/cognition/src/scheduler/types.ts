/**
 * Scheduler types (T-8.2, Spec A). Deterministic two-phase assignment:
 * hard filter (eligibility, fail-closed) then soft score (ranking).
 */
import type { AgentDefinition, LifecycleState } from "@optimora/agent-contract";

/** Requirements a task places on a candidate (parsed from task.inputData.requirements). */
export interface TaskRequirements {
  requiredSkills?: string[];
  requiredPermissions?: string[];
  requiredCapabilities?: string[];
  /** 1..5; gates probation candidates. */
  complexity?: number;
  dataSensitivityClass?: number;
  /** Expected work time used for deadline feasibility. */
  estimatedTimeMs?: number;
  /** Budget node to reserve from (defaults to the task's assigned node). */
  budgetNodeId?: string | null;
  /** ReBAC requirement: the candidate's node must hold `relation` over `nodeId`. */
  requiredRelation?: { relation: "manages" | "delegates_to" | "reports_to"; nodeId: string };
}

/** A candidate agent: its sealed ABI definition + mutable runtime state. */
export interface SchedulerCandidate {
  tenantId: string;
  orgId: string;
  definition: AgentDefinition;
  lifecycle: LifecycleState;
  reputation: number; // 0..1
  successRate: number; // 0..1
  avgCost: number;
  avgLatencyMs: number;
  currentLoad: number;
  concurrencyCap: number;
  dataClearanceClass?: number;
  /** The agent's org-graph node (for ReBAC). */
  nodeId?: string | null;
}

export interface HardFilterOutcome {
  eligible: boolean;
  reasons: string[];
}

export interface ScoreBreakdown {
  skillMatch: number;
  reputation: number;
  costEfficiency: number;
  availability: number;
  deadline: number;
  historicalSuccess: number;
  preference: number;
  total: number;
}

export interface CandidateEvaluation {
  agentId: string;
  eligible: boolean;
  reasons: string[];
  score?: ScoreBreakdown;
}

export interface Assignment {
  taskId: string;
  agentId: string;
  agentVersion: number;
  score: ScoreBreakdown;
  budgetReservationId: string | null;
}

export type SchedulerDecision =
  | { type: "assigned"; assignment: Assignment; evaluations: CandidateEvaluation[] }
  | {
      type: "no_eligible_candidate";
      reasons: string[];
      recommendation: "hire_or_clone";
      evaluations: CandidateEvaluation[];
    };

export interface ScoreWeights {
  skillMatch: number;
  reputation: number;
  costEfficiency: number;
  availability: number;
  deadline: number;
  historicalSuccess: number;
  preference: number;
}

export interface ScheduleOptions {
  weights?: ScoreWeights;
  preferredAgentIds?: string[];
  now?: number;
}

export class SchedulerError extends Error {}
export class TaskNotSchedulableError extends SchedulerError {}

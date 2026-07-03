/**
 * Decision Engine (T-8.3). Deterministic routing/escalation/conflict decisions
 * over the Org Graph + Scheduler. Every decision validates context (fail closed),
 * optionally authorizes via the Policy Engine, records an auditable Decision, and
 * emits a decision event. Runs in the caller's tenant transaction (RLS).
 */
import type { TxClient } from "@optimora/db";
import { authorize } from "@optimora/auth-core";
import { ancestors } from "@optimora/org-graph";
import { scheduleTask } from "../scheduler/engine.js";
import type { SchedulerCandidate, ScheduleOptions } from "../scheduler/types.js";
import { nearestCommonAncestor } from "./nca.js";
import { createDecisionRecord, emitDecisionEvent } from "./store.js";
import {
  InvalidDecisionContextError,
  type DecisionContext,
  type DecisionOutcome,
  type DecisionResult,
  type DecisionType,
} from "./types.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateContext(ctx: DecisionContext): void {
  if (!UUID_RE.test(ctx.tenantId ?? "") || !UUID_RE.test(ctx.orgId ?? "")) {
    throw new InvalidDecisionContextError("Missing or invalid tenant/org context.");
  }
}

/** Returns true if the decision is NOT authorized (deny). No principal => allowed. */
function unauthorized(ctx: DecisionContext): boolean {
  if (!ctx.principal) return false;
  const permission = ctx.requiredPermission ?? "decision:make";
  const decision = authorize({
    principal: ctx.principal,
    action: permission,
    resource: { type: "decision", id: ctx.orgId, tenantId: ctx.tenantId, orgId: ctx.orgId },
    context: { requiredPermission: permission },
  });
  return !decision.allowed;
}

interface DecisionDraft {
  outcome: DecisionOutcome;
  subjectId?: string | null;
  targetNodeId?: string | null;
  targetAgentId?: string | null;
  basis?: string;
  rationale?: Record<string, unknown>;
}

async function finalize(
  tx: TxClient,
  ctx: DecisionContext,
  type: DecisionType,
  draft: DecisionDraft,
): Promise<DecisionResult> {
  const record = await createDecisionRecord(tx, {
    tenantId: ctx.tenantId,
    orgId: ctx.orgId,
    type,
    outcome: draft.outcome,
    subjectId: draft.subjectId ?? null,
    targetNodeId: draft.targetNodeId ?? null,
    targetAgentId: draft.targetAgentId ?? null,
    basis: draft.basis ?? "deterministic",
    rationale: draft.rationale ?? {},
  });
  await emitDecisionEvent(tx, {
    tenantId: ctx.tenantId,
    decisionId: record.id,
    type: `decision.${draft.outcome}`,
    payload: { type, ...(draft.rationale ?? {}) },
  });
  return {
    recordId: record.id,
    type,
    outcome: draft.outcome,
    subjectId: record.subjectId,
    targetNodeId: record.targetNodeId,
    targetAgentId: record.targetAgentId,
    basis: record.basis,
    rationale: draft.rationale ?? {},
  };
}

/** Common guard: validate + authorize; returns a deny draft if unauthorized, else null. */
async function guard(
  tx: TxClient,
  ctx: DecisionContext,
  type: DecisionType,
  subjectId?: string | null,
): Promise<DecisionResult | null> {
  validateContext(ctx);
  if (unauthorized(ctx)) {
    return finalize(tx, ctx, type, {
      outcome: "deny",
      subjectId,
      basis: "policy",
      rationale: { reason: "unauthorized" },
    });
  }
  return null;
}

async function activeTaskCount(tx: TxClient, nodeId: string): Promise<number> {
  return tx.task.count({
    where: { assignedNodeId: nodeId, status: { in: ["scheduled", "in_progress", "in_review"] } },
  });
}

/** Route to a department/team node by type preference then least workload (deterministic). */
export async function decideDepartmentRoute(
  tx: TxClient,
  ctx: DecisionContext,
  input: { candidateNodeIds: string[]; preferType?: string; subjectId?: string | null },
): Promise<DecisionResult> {
  const denied = await guard(tx, ctx, "route_department", input.subjectId);
  if (denied) return denied;

  const nodes = await tx.orgNode.findMany({
    where: { id: { in: input.candidateNodeIds } },
    select: { id: true, name: true, type: true },
  });
  let pool = nodes;
  if (input.preferType) {
    const matching = nodes.filter((n) => n.type === input.preferType);
    if (matching.length > 0) pool = matching;
  }
  if (pool.length === 0) {
    return finalize(tx, ctx, "route_department", {
      outcome: "deny",
      subjectId: input.subjectId,
      rationale: { reason: "no_candidate_department" },
    });
  }

  const scored = await Promise.all(
    pool.map(async (n) => ({ node: n, load: await activeTaskCount(tx, n.id) })),
  );
  scored.sort((x, y) =>
    x.load !== y.load ? x.load - y.load : x.node.name.localeCompare(y.node.name),
  );
  const winner = scored[0]!;

  return finalize(tx, ctx, "route_department", {
    outcome: "route",
    subjectId: input.subjectId,
    targetNodeId: winner.node.id,
    rationale: {
      basis: "least_workload",
      preferType: input.preferType ?? null,
      workloads: scored.map((s) => ({ nodeId: s.node.id, load: s.load })),
    },
  });
}

/** Route a ready task to an agent using the Scheduler; escalate if none eligible. */
export async function decideAgentRoute(
  tx: TxClient,
  ctx: DecisionContext,
  taskId: string,
  candidates: SchedulerCandidate[],
  options?: ScheduleOptions,
): Promise<DecisionResult> {
  const denied = await guard(tx, ctx, "route_agent", taskId);
  if (denied) return denied;

  const decision = await scheduleTask(tx, taskId, candidates, options);
  if (decision.type === "assigned") {
    return finalize(tx, ctx, "route_agent", {
      outcome: "route",
      subjectId: taskId,
      targetAgentId: decision.assignment.agentId,
      rationale: { score: decision.assignment.score, basis: "scheduler" },
    });
  }
  return finalize(tx, ctx, "route_agent", {
    outcome: "escalate",
    subjectId: taskId,
    rationale: { reason: "no_eligible_candidate", schedulerReasons: decision.reasons },
  });
}

/** Escalate a node to its nearest manager (manages parent), or deny if none. */
export async function decideEscalation(
  tx: TxClient,
  ctx: DecisionContext,
  nodeId: string,
): Promise<DecisionResult> {
  const denied = await guard(tx, ctx, "escalate", nodeId);
  if (denied) return denied;

  if (!UUID_RE.test(nodeId)) {
    return finalize(tx, ctx, "escalate", {
      outcome: "deny",
      subjectId: nodeId,
      rationale: { reason: "invalid_node" },
    });
  }
  const anc = (await ancestors(tx, nodeId, "manages")).sort((a, b) => a.depth - b.depth);
  if (anc.length === 0) {
    return finalize(tx, ctx, "escalate", {
      outcome: "deny",
      subjectId: nodeId,
      rationale: { reason: "no_escalation_target" },
    });
  }
  return finalize(tx, ctx, "escalate", {
    outcome: "escalate",
    subjectId: nodeId,
    targetNodeId: anc[0]!.id,
    rationale: { basis: "manages_parent" },
  });
}

/**
 * Resolve a conflict between two contenders. If priorities are given and differ,
 * the higher priority (lower number) wins (route). Otherwise escalate to the
 * nearest common org-graph ancestor; deny if none exists.
 */
export async function decideConflict(
  tx: TxClient,
  ctx: DecisionContext,
  input: { aNodeId: string; bNodeId: string; aPriority?: number; bPriority?: number },
): Promise<DecisionResult> {
  const denied = await guard(tx, ctx, "resolve_conflict");
  if (denied) return denied;

  if (input.aPriority != null && input.bPriority != null && input.aPriority !== input.bPriority) {
    const winner = input.aPriority < input.bPriority ? input.aNodeId : input.bNodeId;
    return finalize(tx, ctx, "resolve_conflict", {
      outcome: "route",
      targetNodeId: winner,
      rationale: { basis: "priority", aPriority: input.aPriority, bPriority: input.bPriority },
    });
  }

  const nca = await nearestCommonAncestor(tx, input.aNodeId, input.bNodeId);
  if (!nca) {
    return finalize(tx, ctx, "resolve_conflict", {
      outcome: "deny",
      rationale: { reason: "no_common_ancestor" },
    });
  }
  return finalize(tx, ctx, "resolve_conflict", {
    outcome: "escalate",
    targetNodeId: nca,
    rationale: { basis: "nearest_common_ancestor" },
  });
}

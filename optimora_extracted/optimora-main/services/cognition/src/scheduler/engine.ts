/**
 * Scheduler engine (T-8.2, Spec A). Reads a ready task, hard-filters candidates,
 * soft-scores the eligible ones deterministically, reserves budget before
 * dispatch, assigns the winning agent (ABI-validated via the Task Engine),
 * moves the task to `scheduled`, and emits an auditable decision event.
 *
 * Runs in the caller's tenant transaction (withTenantContext), so budget
 * reservation + assignment are atomic and fail closed on any error.
 */
import type { TxClient } from "@optimora/db";
import {
  assignAgent,
  attachBudgetReservation,
  emitTaskEvent,
  transitionTask,
} from "@optimora/execution";
import { reserve } from "@optimora/org-graph";
import { hardFilter, type HardFilterContext } from "./hard-filter.js";
import { softScore, weightsForPriority, type ScoreContext } from "./soft-score.js";
import {
  TaskNotSchedulableError,
  type CandidateEvaluation,
  type SchedulerCandidate,
  type SchedulerDecision,
  type ScheduleOptions,
  type TaskRequirements,
} from "./types.js";

interface TaskRow {
  id: string;
  tenantId: string;
  orgId: string;
  status: string;
  priority: number;
  deadline: Date | null;
  costEstimate: { toString(): string } | null;
  assignedNodeId: string | null;
  inputData: unknown;
}

function readRequirements(inputData: unknown): TaskRequirements {
  if (inputData && typeof inputData === "object" && "requirements" in inputData) {
    const r = (inputData as { requirements?: unknown }).requirements;
    if (r && typeof r === "object") return r as TaskRequirements;
  }
  return {};
}

export async function scheduleTask(
  tx: TxClient,
  taskId: string,
  candidates: SchedulerCandidate[],
  options: ScheduleOptions = {},
): Promise<SchedulerDecision> {
  const task = (await tx.task.findUnique({ where: { id: taskId } })) as TaskRow | null;
  if (!task) throw new TaskNotSchedulableError(`Task ${taskId} not found.`);
  if (task.status !== "ready") {
    throw new TaskNotSchedulableError(`Task ${taskId} is not ready (status=${task.status}).`);
  }

  const requirements = readRequirements(task.inputData);
  const estCost = task.costEstimate == null ? 0 : Number(task.costEstimate.toString());
  const budgetNodeId = requirements.budgetNodeId ?? task.assignedNodeId ?? null;
  const now = options.now ?? Date.now();

  const filterCtx: HardFilterContext = {
    taskTenantId: task.tenantId,
    taskOrgId: task.orgId,
    taskPriority: task.priority,
    taskDeadline: task.deadline,
    estCost,
    budgetNodeId,
    now,
  };

  // ---- Phase 1: hard filter (records every candidate for audit) ----
  const evaluations: CandidateEvaluation[] = [];
  const eligible: SchedulerCandidate[] = [];
  for (const c of candidates) {
    const outcome = await hardFilter(tx, requirements, c, filterCtx);
    evaluations.push({
      agentId: c.definition.identity.agentId,
      eligible: outcome.eligible,
      reasons: outcome.reasons,
    });
    if (outcome.eligible) eligible.push(c);
  }

  if (eligible.length === 0) {
    const reasons = [...new Set(evaluations.flatMap((e) => e.reasons))];
    await emitTaskEvent(tx, {
      tenantId: task.tenantId,
      orgId: task.orgId,
      taskId,
      type: "scheduler.no_candidate",
      payload: { reasons, evaluations },
    });
    return { type: "no_eligible_candidate", reasons, recommendation: "hire_or_clone", evaluations };
  }

  // ---- Phase 2: soft score (deterministic) ----
  const costs = eligible.map((c) => c.avgCost);
  const lats = eligible.map((c) => c.avgLatencyMs);
  const scoreCtx: ScoreContext = {
    costMin: Math.min(...costs),
    costMax: Math.max(...costs),
    latencyMin: Math.min(...lats),
    latencyMax: Math.max(...lats),
    preferredAgentIds: options.preferredAgentIds ?? [],
  };
  const weights = options.weights ?? weightsForPriority(task.priority);

  const scored = eligible.map((c) => ({
    candidate: c,
    score: softScore(c, requirements, scoreCtx, weights),
  }));
  for (const s of scored) {
    const ev = evaluations.find((e) => e.agentId === s.candidate.definition.identity.agentId);
    if (ev) ev.score = s.score;
  }

  // Deterministic selection: highest total, tie-break by lower cost then agentId.
  scored.sort((a, b) => {
    if (b.score.total !== a.score.total) return b.score.total - a.score.total;
    if (a.candidate.avgCost !== b.candidate.avgCost)
      return a.candidate.avgCost - b.candidate.avgCost;
    return a.candidate.definition.identity.agentId.localeCompare(
      b.candidate.definition.identity.agentId,
    );
  });
  const winner = scored[0]!;

  // ---- Reserve budget BEFORE dispatch (never overcommit; fail closed) ----
  let budgetReservationId: string | null = null;
  if (estCost > 0 && budgetNodeId) {
    const res = await reserve(tx, {
      tenantId: task.tenantId,
      orgId: task.orgId,
      nodeId: budgetNodeId,
      amount: estCost,
      reason: `schedule:${taskId}`,
    });
    budgetReservationId = res.id;
    await attachBudgetReservation(tx, taskId, budgetReservationId);
  }

  // Assign (ABI-validated by the Task Engine) + move to scheduled.
  await assignAgent(tx, taskId, winner.candidate.definition, winner.candidate.nodeId ?? null);
  await transitionTask(tx, taskId, "scheduled");

  await emitTaskEvent(tx, {
    tenantId: task.tenantId,
    orgId: task.orgId,
    taskId,
    type: "scheduler.assigned",
    payload: {
      agentId: winner.candidate.definition.identity.agentId,
      score: winner.score,
      budgetReservationId,
      evaluations,
    },
  });

  return {
    type: "assigned",
    assignment: {
      taskId,
      agentId: winner.candidate.definition.identity.agentId,
      agentVersion: winner.candidate.definition.version,
      score: winner.score,
      budgetReservationId,
    },
    evaluations,
  };
}

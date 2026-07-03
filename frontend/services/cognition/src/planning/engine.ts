/**
 * Planning Engine (T-8.1).
 *
 * Decomposes a goal into a task DAG and persists it via the Task Engine, links
 * the tasks to a Plan, assigns them to a target org-graph node, and optionally
 * reserves budget (T-3.2). Runs on a tenant-scoped TxClient — the caller wraps it
 * in withTenantContext (a transaction), so any failure (invalid goal, cyclic
 * blueprint, over-budget) rolls back the whole plan atomically (fail closed).
 *
 * No AI calls: decomposition is delegated to a PlannerProvider (stub by default).
 */
import type { TxClient } from "@optimora/db";
import { addDependency, createTask } from "@optimora/execution";
import { reserve } from "@optimora/org-graph";
import { validateDag } from "./dag.js";
import { RuleBasedPlanner } from "./planner-stub.js";
import { createPlan, emitPlanEvent, updatePlan, type PlanView } from "./store.js";
import { InvalidGoalError, type GoalSpec, type PlannerProvider } from "./types.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PlanResult {
  plan: PlanView;
  taskIds: string[];
}

function assertGoal(goal: GoalSpec): void {
  if (!goal || !UUID_RE.test(goal.tenantId ?? "") || !UUID_RE.test(goal.orgId ?? "")) {
    throw new InvalidGoalError("Goal is missing a valid tenant/org context.");
  }
  if (!goal.title || goal.title.trim().length === 0) {
    throw new InvalidGoalError("Goal must have a title.");
  }
  if (goal.targetNodeId != null && !UUID_RE.test(goal.targetNodeId)) {
    throw new InvalidGoalError("Invalid targetNodeId.");
  }
}

/**
 * Plan a goal: validate -> decompose -> validate DAG -> create tasks + deps ->
 * optional budget reservation -> emit audit events -> activate.
 */
export async function planGoal(
  tx: TxClient,
  goal: GoalSpec,
  provider: PlannerProvider = new RuleBasedPlanner(),
): Promise<PlanResult> {
  assertGoal(goal);

  const plan = await createPlan(tx, {
    tenantId: goal.tenantId,
    orgId: goal.orgId,
    title: goal.title,
    objective: goal.objective,
    targetNodeId: goal.targetNodeId ?? null,
  });
  await emitPlanEvent(tx, {
    tenantId: goal.tenantId,
    planId: plan.id,
    type: "plan.created",
    payload: { title: goal.title, planner: provider.name },
  });

  const blueprint = await provider.decompose(goal);
  validateDag(blueprint); // throws DagCycleError / InvalidBlueprintError -> rollback

  // Create tasks linked to the plan + assigned to the target node.
  const keyToId = new Map<string, string>();
  for (const spec of blueprint.tasks) {
    const task = await createTask(tx, {
      tenantId: goal.tenantId,
      orgId: goal.orgId,
      title: spec.title,
      priority: spec.priority ?? goal.priority ?? 3,
      costEstimate: spec.estimatedCost ?? null,
      planId: plan.id,
      assignedNodeId: goal.targetNodeId ?? null,
    });
    keyToId.set(spec.key, task.id);
    await emitPlanEvent(tx, {
      tenantId: goal.tenantId,
      planId: plan.id,
      type: "plan.task.created",
      payload: { key: spec.key, taskId: task.id },
    });
  }

  // Wire dependencies.
  for (const spec of blueprint.tasks) {
    for (const dep of spec.dependsOn ?? []) {
      await addDependency(tx, goal.tenantId, keyToId.get(spec.key)!, keyToId.get(dep)!);
    }
  }

  // Optional budget reservation against the budget node (fail-closed via rollback).
  let budgetReservationId: string | null = null;
  if (goal.budgetNodeId) {
    const total = blueprint.tasks.reduce((sum, t) => sum + (t.estimatedCost ?? 0), 0);
    if (total > 0) {
      const res = await reserve(tx, {
        tenantId: goal.tenantId,
        orgId: goal.orgId,
        nodeId: goal.budgetNodeId,
        amount: total,
        reason: `plan:${plan.id}`,
      });
      budgetReservationId = res.id;
    }
  }

  const activated = await updatePlan(tx, plan.id, { status: "active", budgetReservationId });
  await emitPlanEvent(tx, {
    tenantId: goal.tenantId,
    planId: plan.id,
    type: "plan.activated",
    payload: { taskCount: blueprint.tasks.length, budgetReservationId },
  });

  return { plan: activated, taskIds: [...keyToId.values()] };
}

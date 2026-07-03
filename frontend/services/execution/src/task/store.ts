/**
 * Task Engine store (T-7.2): durable task entities with dependencies, a ready
 * queue, ABI-validated agent assignment, budget-reservation linkage, and a
 * lifecycle event outbox. All operations run on a tenant-scoped TxClient (RLS),
 * so cross-tenant access is impossible. This is the durable work foundation —
 * not the scheduler, not the agent runtime.
 */
import type { TxClient } from "@optimora/db";
import { parseAgentDefinition, verifyDefinitionHash } from "@optimora/agent-contract";
import { assertTaskTransition, type TaskState } from "./lifecycle.js";

export class TaskNotFoundError extends Error {}
export class DependencyBlockedError extends Error {}
export class BudgetReservationMissingError extends Error {}
export class InvalidAgentDefinitionError extends Error {}

export interface TaskView {
  id: string;
  tenantId: string;
  orgId: string;
  title: string;
  status: TaskState;
  planId: string | null;
  priority: number;
  deadline: Date | null;
  costEstimate: number | null;
  budgetReservationId: string | null;
  assignedAgentId: string | null;
  assignedAgentVersion: number | null;
  assignedNodeId: string | null;
  qualityMinScore: number | null;
  rubricId: string | null;
}

interface TaskRow {
  id: string;
  tenantId: string;
  orgId: string;
  title: string;
  status: string;
  planId: string | null;
  priority: number;
  deadline: Date | null;
  costEstimate: { toString(): string } | null;
  budgetReservationId: string | null;
  assignedAgentId: string | null;
  assignedAgentVersion: number | null;
  assignedNodeId: string | null;
  qualityMinScore: number | null;
  rubricId: string | null;
}

function mapTask(r: TaskRow): TaskView {
  return {
    id: r.id,
    tenantId: r.tenantId,
    orgId: r.orgId,
    title: r.title,
    status: r.status as TaskState,
    planId: r.planId,
    priority: r.priority,
    deadline: r.deadline,
    costEstimate: r.costEstimate == null ? null : Number(r.costEstimate.toString()),
    budgetReservationId: r.budgetReservationId,
    assignedAgentId: r.assignedAgentId,
    assignedAgentVersion: r.assignedAgentVersion,
    assignedNodeId: r.assignedNodeId,
    qualityMinScore: r.qualityMinScore,
    rubricId: r.rubricId,
  };
}

export async function emitTaskEvent(
  tx: TxClient,
  input: {
    tenantId: string;
    orgId: string;
    taskId: string;
    type: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  await tx.taskEvent.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      taskId: input.taskId,
      type: input.type,
      payload: (input.payload ?? {}) as object,
    },
  });
}

export interface CreateTaskInput {
  tenantId: string;
  orgId: string;
  title: string;
  priority?: number;
  deadline?: Date | null;
  costEstimate?: number | null;
  qualityMinScore?: number | null;
  rubricId?: string | null;
  inputData?: Record<string, unknown>;
  /** Optional link to the plan that created this task (T-8.1). */
  planId?: string | null;
  /** Optional org-graph node the task is assigned to (T-8.1). */
  assignedNodeId?: string | null;
}

export async function createTask(tx: TxClient, input: CreateTaskInput): Promise<TaskView> {
  const row = await tx.task.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      title: input.title,
      priority: input.priority ?? 3,
      deadline: input.deadline ?? null,
      costEstimate: input.costEstimate ?? null,
      qualityMinScore: input.qualityMinScore ?? null,
      rubricId: input.rubricId ?? null,
      inputData: (input.inputData ?? {}) as object,
      planId: input.planId ?? null,
      assignedNodeId: input.assignedNodeId ?? null,
    },
  });
  const task = mapTask(row);
  await emitTaskEvent(tx, {
    tenantId: task.tenantId,
    orgId: task.orgId,
    taskId: task.id,
    type: "task.created",
    payload: { status: task.status },
  });
  return task;
}

export async function getTask(tx: TxClient, id: string): Promise<TaskView | null> {
  const row = await tx.task.findUnique({ where: { id } });
  return row ? mapTask(row) : null;
}

/** Transition a task to a new state (validated) and emit a lifecycle event. */
export async function transitionTask(
  tx: TxClient,
  id: string,
  to: string,
  payload?: Record<string, unknown>,
): Promise<TaskView> {
  const current = await tx.task.findUnique({ where: { id } });
  if (!current) throw new TaskNotFoundError(id);
  const next = assertTaskTransition(current.status as TaskState, to);
  const updated = await tx.task.update({ where: { id }, data: { status: next } });
  const task = mapTask(updated);
  await emitTaskEvent(tx, {
    tenantId: task.tenantId,
    orgId: task.orgId,
    taskId: task.id,
    type: "task.transitioned",
    payload: { from: current.status, to: next, ...(payload ?? {}) },
  });
  return task;
}

/** Add a dependency: `taskId` depends on `dependsOnTaskId`. Both must be visible. */
export async function addDependency(
  tx: TxClient,
  tenantId: string,
  taskId: string,
  dependsOnTaskId: string,
): Promise<void> {
  if (taskId === dependsOnTaskId)
    throw new DependencyBlockedError("A task cannot depend on itself.");
  const [a, b] = await Promise.all([
    tx.task.findUnique({ where: { id: taskId }, select: { id: true } }),
    tx.task.findUnique({ where: { id: dependsOnTaskId }, select: { id: true } }),
  ]);
  if (!a || !b) throw new TaskNotFoundError(!a ? taskId : dependsOnTaskId);
  await tx.taskDependency.upsert({
    where: { taskId_dependsOnTaskId: { taskId, dependsOnTaskId } },
    create: { taskId, dependsOnTaskId, tenantId },
    update: {},
  });
}

/** True if every dependency of the task is `done`. */
export async function isUnblocked(tx: TxClient, taskId: string): Promise<boolean> {
  const deps = await tx.taskDependency.findMany({
    where: { taskId },
    select: { dependsOn: { select: { status: true } } },
  });
  return deps.every((d) => d.dependsOn.status === "done");
}

/** Move a draft task to `ready` if all dependencies are satisfied; else blocked. */
export async function markReady(tx: TxClient, taskId: string): Promise<TaskView> {
  if (!(await isUnblocked(tx, taskId))) {
    throw new DependencyBlockedError(`Task ${taskId} has unsatisfied dependencies.`);
  }
  return transitionTask(tx, taskId, "ready");
}

/** The ready queue for an org: ready tasks, highest priority + earliest deadline first. */
export async function listReadyQueue(tx: TxClient, orgId: string): Promise<TaskView[]> {
  const rows = await tx.task.findMany({
    where: { orgId, status: "ready" },
    orderBy: [{ priority: "asc" }, { deadline: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapTask);
}

/**
 * Assign an agent to a task, validating that the provided definition conforms to
 * the Agent ABI (structure + content-hash integrity). Fails closed on an invalid
 * or tampered definition.
 */
export async function assignAgent(
  tx: TxClient,
  taskId: string,
  agentDefinition: unknown,
  assignedNodeId?: string | null,
): Promise<TaskView> {
  let def;
  try {
    def = parseAgentDefinition(agentDefinition);
  } catch {
    throw new InvalidAgentDefinitionError("Agent definition does not conform to the ABI.");
  }
  if (!verifyDefinitionHash(def)) {
    throw new InvalidAgentDefinitionError("Agent definition failed integrity verification.");
  }
  const current = await tx.task.findUnique({ where: { id: taskId }, select: { id: true } });
  if (!current) throw new TaskNotFoundError(taskId);

  const updated = await tx.task.update({
    where: { id: taskId },
    data: {
      assignedAgentId: def.identity.agentId,
      assignedAgentVersion: def.version,
      assignedNodeId: assignedNodeId ?? def.orgNodeId ?? null,
    },
  });
  return mapTask(updated);
}

/**
 * Link a budget reservation to a task. Fails closed if the reservation is not
 * visible in this tenant (missing/cross-tenant).
 */
export async function attachBudgetReservation(
  tx: TxClient,
  taskId: string,
  reservationId: string,
): Promise<TaskView> {
  const reservation = await tx.budgetReservation.findUnique({
    where: { id: reservationId },
    select: { id: true },
  });
  if (!reservation) throw new BudgetReservationMissingError(reservationId);
  const current = await tx.task.findUnique({ where: { id: taskId }, select: { id: true } });
  if (!current) throw new TaskNotFoundError(taskId);
  const updated = await tx.task.update({
    where: { id: taskId },
    data: { budgetReservationId: reservationId },
  });
  return mapTask(updated);
}

export async function listTaskEvents(tx: TxClient, taskId: string) {
  return tx.taskEvent.findMany({ where: { taskId }, orderBy: { createdAt: "asc" } });
}

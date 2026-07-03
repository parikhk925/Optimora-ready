/**
 * Plan persistence + outbox (T-8.1). Tenant-scoped via the supplied TxClient (RLS).
 */
import type { TxClient } from "@optimora/db";

export interface PlanView {
  id: string;
  tenantId: string;
  orgId: string;
  title: string;
  objective: string;
  status: string;
  targetNodeId: string | null;
  budgetReservationId: string | null;
}

export async function createPlan(
  tx: TxClient,
  input: {
    tenantId: string;
    orgId: string;
    title: string;
    objective?: string;
    targetNodeId?: string | null;
  },
): Promise<PlanView> {
  const row = await tx.plan.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      title: input.title,
      objective: input.objective ?? "",
      targetNodeId: input.targetNodeId ?? null,
      status: "planning",
    },
  });
  return row;
}

export async function emitPlanEvent(
  tx: TxClient,
  input: { tenantId: string; planId: string; type: string; payload?: Record<string, unknown> },
): Promise<void> {
  await tx.planEvent.create({
    data: {
      tenantId: input.tenantId,
      planId: input.planId,
      type: input.type,
      payload: (input.payload ?? {}) as object,
    },
  });
}

export async function updatePlan(
  tx: TxClient,
  planId: string,
  data: { status?: string; budgetReservationId?: string | null },
): Promise<PlanView> {
  return tx.plan.update({ where: { id: planId }, data });
}

export async function getPlan(tx: TxClient, planId: string): Promise<PlanView | null> {
  return tx.plan.findUnique({ where: { id: planId } });
}

export async function listPlanTasks(tx: TxClient, planId: string) {
  return tx.task.findMany({ where: { planId }, orderBy: { createdAt: "asc" } });
}

export async function listPlanEvents(tx: TxClient, planId: string) {
  return tx.planEvent.findMany({ where: { planId }, orderBy: { createdAt: "asc" } });
}

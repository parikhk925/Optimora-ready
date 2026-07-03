/**
 * Model invocation + routing-event persistence (E9 Model Routing). Tenant-scoped
 * via the supplied TxClient (RLS). No raw prompt/completion stored — no secrets.
 */
import type { TxClient } from "@optimora/db";
import type { InvocationView } from "./types.js";

interface InvocationRow {
  id: string;
  tenantId: string;
  orgId: string;
  agentId: string;
  taskId: string | null;
  providerName: string;
  qualityTier: string;
  costCeilingUsd: number | null;
  estimatedCostUsd: number;
  tokensIn: number;
  tokensOut: number;
  status: string;
  failureReason: string | null;
  createdAt: Date;
}

function toView(r: InvocationRow): InvocationView {
  return {
    id: r.id,
    tenantId: r.tenantId,
    orgId: r.orgId,
    agentId: r.agentId,
    taskId: r.taskId,
    providerName: r.providerName,
    qualityTier: r.qualityTier,
    costCeilingUsd: r.costCeilingUsd,
    estimatedCostUsd: r.estimatedCostUsd,
    tokensIn: r.tokensIn,
    tokensOut: r.tokensOut,
    status: r.status as InvocationView["status"],
    failureReason: r.failureReason,
    createdAt: r.createdAt,
  };
}

export async function createInvocation(
  tx: TxClient,
  input: {
    tenantId: string;
    orgId: string;
    agentId: string;
    taskId?: string | null;
    providerName: string;
    qualityTier: string;
    costCeilingUsd?: number | null;
    estimatedCostUsd: number;
    tokensIn: number;
    tokensOut: number;
    status: "succeeded" | "failed";
    failureReason?: string | null;
  },
): Promise<InvocationView> {
  const row = (await tx.modelInvocation.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      agentId: input.agentId,
      taskId: input.taskId ?? null,
      providerName: input.providerName,
      qualityTier: input.qualityTier,
      costCeilingUsd: input.costCeilingUsd ?? null,
      estimatedCostUsd: input.estimatedCostUsd,
      tokensIn: input.tokensIn,
      tokensOut: input.tokensOut,
      status: input.status,
      failureReason: input.failureReason ?? null,
    },
  })) as InvocationRow;
  return toView(row);
}

export async function getInvocation(tx: TxClient, id: string): Promise<InvocationView | null> {
  const row = (await tx.modelInvocation.findUnique({ where: { id } })) as InvocationRow | null;
  return row ? toView(row) : null;
}

export async function emitRoutingEvent(
  tx: TxClient,
  input: { tenantId: string; invocationId: string; type: string; payload?: Record<string, unknown> },
): Promise<void> {
  await tx.modelRoutingEvent.create({
    data: {
      tenantId: input.tenantId,
      invocationId: input.invocationId,
      type: input.type,
      payload: (input.payload ?? {}) as object,
    },
  });
}

export async function listRoutingEvents(tx: TxClient, invocationId: string) {
  return tx.modelRoutingEvent.findMany({ where: { invocationId }, orderBy: { createdAt: "asc" } });
}

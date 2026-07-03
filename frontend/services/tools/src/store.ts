/**
 * Tool invocation + event persistence (E9 Tools). Tenant-scoped via TxClient
 * (RLS). Records are write-once; no raw args/output stored — no secrets.
 */
import type { TxClient } from "@optimora/db";
import type { ToolInvocationView } from "./types.js";

interface InvocationRow {
  id: string;
  tenantId: string;
  orgId: string;
  agentId: string;
  taskId: string | null;
  toolName: string;
  status: string;
  failureReason: string | null;
  createdAt: Date;
}

function toView(r: InvocationRow): ToolInvocationView {
  return {
    id: r.id,
    tenantId: r.tenantId,
    orgId: r.orgId,
    agentId: r.agentId,
    taskId: r.taskId,
    toolName: r.toolName,
    status: r.status as ToolInvocationView["status"],
    failureReason: r.failureReason,
    createdAt: r.createdAt,
  };
}

export async function createToolInvocation(
  tx: TxClient,
  input: {
    tenantId: string;
    orgId: string;
    agentId: string;
    taskId?: string | null;
    toolName: string;
    status: "succeeded" | "failed";
    failureReason?: string | null;
  },
): Promise<ToolInvocationView> {
  const row = (await tx.toolInvocation.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      agentId: input.agentId,
      taskId: input.taskId ?? null,
      toolName: input.toolName,
      status: input.status,
      failureReason: input.failureReason ?? null,
    },
  })) as InvocationRow;
  return toView(row);
}

export async function getToolInvocation(tx: TxClient, id: string): Promise<ToolInvocationView | null> {
  const row = (await tx.toolInvocation.findUnique({ where: { id } })) as InvocationRow | null;
  return row ? toView(row) : null;
}

export async function emitToolEvent(
  tx: TxClient,
  input: { tenantId: string; invocationId: string; type: string; payload?: Record<string, unknown> },
): Promise<void> {
  await tx.toolEvent.create({
    data: {
      tenantId: input.tenantId,
      invocationId: input.invocationId,
      type: input.type,
      payload: (input.payload ?? {}) as object,
    },
  });
}

export async function listToolEvents(tx: TxClient, invocationId: string) {
  return tx.toolEvent.findMany({ where: { invocationId }, orderBy: { createdAt: "asc" } });
}

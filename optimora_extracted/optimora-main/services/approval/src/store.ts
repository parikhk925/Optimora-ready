/**
 * Approval record + event persistence (E9 Approval). Tenant-scoped via TxClient
 * (RLS). Records are mutable only for state transitions; requesterId/reason/
 * actionPayload are write-once.
 */
import type { TxClient } from "@optimora/db";
import type { ApprovalReason, ApprovalState, ApprovalView } from "./types.js";

interface ApprovalRow {
  id: string;
  tenantId: string;
  orgId: string;
  requesterId: string;
  reason: string;
  description: string;
  actionPayload: unknown;
  agentId: string | null;
  taskId: string | null;
  runId: string | null;
  state: string;
  approverId: string | null;
  approverNote: string | null;
  expiresAt: Date;
  resolvedAt: Date | null;
  createdAt: Date;
}

function toView(r: ApprovalRow): ApprovalView {
  return {
    id: r.id,
    tenantId: r.tenantId,
    orgId: r.orgId,
    requesterId: r.requesterId,
    reason: r.reason as ApprovalReason,
    description: r.description,
    actionPayload: (r.actionPayload ?? {}) as Record<string, unknown>,
    agentId: r.agentId,
    taskId: r.taskId,
    runId: r.runId,
    state: r.state as ApprovalState,
    approverId: r.approverId,
    approverNote: r.approverNote,
    expiresAt: r.expiresAt,
    resolvedAt: r.resolvedAt,
    createdAt: r.createdAt,
  };
}

export async function createApprovalRecord(
  tx: TxClient,
  input: {
    tenantId: string;
    orgId: string;
    requesterId: string;
    reason: ApprovalReason;
    description: string;
    actionPayload: Record<string, unknown>;
    agentId?: string | null;
    taskId?: string | null;
    runId?: string | null;
    expiresAt: Date;
  },
): Promise<ApprovalView> {
  const row = (await tx.approvalRequest.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      requesterId: input.requesterId,
      reason: input.reason,
      description: input.description,
      actionPayload: input.actionPayload as object,
      agentId: input.agentId ?? null,
      taskId: input.taskId ?? null,
      runId: input.runId ?? null,
      state: "pending",
      expiresAt: input.expiresAt,
    },
  })) as ApprovalRow;
  return toView(row);
}

export async function getApprovalRecord(tx: TxClient, id: string): Promise<ApprovalView | null> {
  const row = (await tx.approvalRequest.findUnique({ where: { id } })) as ApprovalRow | null;
  return row ? toView(row) : null;
}

export async function updateApprovalState(
  tx: TxClient,
  id: string,
  patch: { state: ApprovalState; approverId?: string | null; approverNote?: string | null; resolvedAt?: Date },
): Promise<ApprovalView> {
  const row = (await tx.approvalRequest.update({
    where: { id },
    data: {
      state: patch.state,
      approverId: patch.approverId ?? null,
      approverNote: patch.approverNote ?? null,
      resolvedAt: patch.resolvedAt ?? null,
    },
  })) as ApprovalRow;
  return toView(row);
}

export async function listPendingApprovals(
  tx: TxClient,
  tenantId: string,
  orgId?: string,
): Promise<ApprovalView[]> {
  const where: Record<string, unknown> = { tenantId, state: "pending" };
  if (orgId) where["orgId"] = orgId;
  const rows = (await tx.approvalRequest.findMany({
    where,
    orderBy: { createdAt: "asc" },
  })) as ApprovalRow[];
  return rows.map(toView);
}

export async function emitApprovalEvent(
  tx: TxClient,
  input: { tenantId: string; approvalId: string; type: string; payload?: Record<string, unknown> },
): Promise<void> {
  await tx.approvalEvent.create({
    data: {
      tenantId: input.tenantId,
      approvalId: input.approvalId,
      type: input.type,
      payload: (input.payload ?? {}) as object,
    },
  });
}

export async function listApprovalEvents(tx: TxClient, approvalId: string) {
  return tx.approvalEvent.findMany({ where: { approvalId }, orderBy: { createdAt: "asc" } });
}

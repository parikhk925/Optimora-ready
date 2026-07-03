/**
 * Approval service (E9 Approval). Deterministic, tenant-aware, fail-closed:
 * creates approval requests, resolves them (approve/reject/cancel/expire), and
 * emits audit events. The risky action is NOT executed here — this is the gate
 * foundation only. Callers check the returned state before proceeding.
 *
 * Fail-closed: missing/invalid tenant, invalid requester, unauthorized approver,
 * malformed request, expired approval, already-resolved approval, cross-tenant.
 */
import type { PrismaClient, TxClient } from "@optimora/db";
import { withTenantContext } from "@optimora/db";
import { authorize } from "@optimora/auth-core";
import {
  createApprovalRecord,
  emitApprovalEvent,
  getApprovalRecord,
  listPendingApprovals,
  updateApprovalState,
} from "./store.js";
import {
  ApprovalAlreadyResolvedError,
  ApprovalExpiredError,
  ApprovalNotFoundError,
  InvalidApprovalContextError,
  MalformedApprovalRequestError,
  UnauthorizedApproverError,
  type ApprovalContext,
  type ApprovalView,
  type CreateApprovalInput,
  APPROVAL_REASONS,
} from "./types.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 h

function validateContext(ctx: ApprovalContext): void {
  if (!UUID_RE.test(ctx.tenantId ?? "") || !UUID_RE.test(ctx.orgId ?? "")) {
    throw new InvalidApprovalContextError("Missing or invalid tenant/org context.");
  }
  if (!ctx.requesterId || ctx.requesterId.trim() === "") {
    throw new InvalidApprovalContextError("Missing requesterId.");
  }
}

function policyDenies(ctx: ApprovalContext, action: string, resourceId: string): boolean {
  if (!ctx.principal) return false;
  const decision = authorize({
    principal: ctx.principal,
    action,
    resource: { type: "approval_request", id: resourceId, tenantId: ctx.tenantId, orgId: ctx.orgId },
    context: { requiredPermission: action },
  });
  return !decision.allowed;
}

function validateInput(input: CreateApprovalInput): void {
  if (!APPROVAL_REASONS.includes(input.reason as never)) {
    throw new MalformedApprovalRequestError(`Unknown approval reason: "${input.reason}".`);
  }
  if (!input.description || input.description.trim() === "") {
    throw new MalformedApprovalRequestError("Approval description must be a non-empty string.");
  }
  if (input.expiresAt !== undefined && !(input.expiresAt instanceof Date)) {
    throw new MalformedApprovalRequestError("expiresAt must be a Date.");
  }
  if (input.agentId !== undefined && input.agentId !== null && !UUID_RE.test(input.agentId)) {
    throw new MalformedApprovalRequestError("Malformed agentId.");
  }
  if (input.taskId !== undefined && input.taskId !== null && !UUID_RE.test(input.taskId)) {
    throw new MalformedApprovalRequestError("Malformed taskId.");
  }
}

export async function createApproval(
  tx: TxClient,
  ctx: ApprovalContext,
  input: CreateApprovalInput,
): Promise<ApprovalView> {
  validateContext(ctx);
  validateInput(input);
  if (policyDenies(ctx, ctx.requiredPermission ?? "approval:create", ctx.requesterId)) {
    throw new UnauthorizedApproverError("Unauthorized approval creation.");
  }
  const expiresAt = input.expiresAt ?? new Date(Date.now() + DEFAULT_EXPIRY_MS);
  const record = await createApprovalRecord(tx, {
    tenantId: ctx.tenantId,
    orgId: ctx.orgId,
    requesterId: ctx.requesterId,
    reason: input.reason,
    description: input.description,
    actionPayload: input.actionPayload ?? {},
    agentId: input.agentId ?? null,
    taskId: input.taskId ?? null,
    runId: input.runId ?? null,
    expiresAt,
  });
  await emitApprovalEvent(tx, {
    tenantId: ctx.tenantId,
    approvalId: record.id,
    type: "approval.requested",
    payload: { reason: input.reason, requesterId: ctx.requesterId },
  });
  return record;
}

/**
 * Resolves a pending approval request. Accepts the prisma client (not a TxClient)
 * so it can commit expiry in its own transaction before throwing — ensuring expiry
 * state and audit event persist even if the caller's outer transaction rolls back.
 *
 * Fail-closed: throws on invalid context, not found, already resolved, or expired.
 * Expiry is always committed and audited before ApprovalExpiredError is raised.
 */
export async function resolveApproval(
  prisma: PrismaClient,
  ctx: ApprovalContext,
  id: string,
  decision: "approved" | "rejected" | "cancelled",
  note?: string,
): Promise<ApprovalView> {
  validateContext(ctx);
  if (!UUID_RE.test(id ?? "")) throw new ApprovalNotFoundError("Missing or invalid approval id.");

  if (policyDenies(ctx, ctx.requiredPermission ?? "approval:resolve", id)) {
    throw new UnauthorizedApproverError("Unauthorized approval resolution.");
  }

  // Step 1: read current state in its own (non-mutating) transaction.
  // withTenantContext uses $transaction; splitting read and write into separate
  // calls means the expiry commit is never rolled back by the thrown error.
  const existing = await withTenantContext(prisma, ctx, (tx) => getApprovalRecord(tx, id));
  if (!existing) throw new ApprovalNotFoundError("Approval not found in tenant context.");
  if (existing.state !== "pending") {
    throw new ApprovalAlreadyResolvedError(`Approval is already "${existing.state}".`);
  }

  if (existing.expiresAt <= new Date()) {
    // Step 2a: commit expiry in its own transaction so it persists before we throw.
    await withTenantContext(prisma, ctx, async (tx) => {
      await updateApprovalState(tx, id, { state: "expired", resolvedAt: new Date() });
      await emitApprovalEvent(tx, {
        tenantId: ctx.tenantId,
        approvalId: id,
        type: "approval.expired",
        payload: {},
      });
    });
    throw new ApprovalExpiredError("Approval has expired.");
  }

  // Step 2b: commit the resolution in its own transaction.
  return withTenantContext(prisma, ctx, async (tx) => {
    const updated = await updateApprovalState(tx, id, {
      state: decision,
      approverId: ctx.requesterId,
      approverNote: note ?? null,
      resolvedAt: new Date(),
    });
    await emitApprovalEvent(tx, {
      tenantId: ctx.tenantId,
      approvalId: id,
      type: `approval.${decision}`,
      payload: { approverId: ctx.requesterId, note: note ?? null },
    });
    return updated;
  });
}

export async function expireApproval(tx: TxClient, ctx: ApprovalContext, id: string): Promise<ApprovalView> {
  validateContext(ctx);
  if (!UUID_RE.test(id ?? "")) throw new ApprovalNotFoundError("Missing or invalid approval id.");
  const existing = await getApprovalRecord(tx, id);
  if (!existing) throw new ApprovalNotFoundError("Approval not found in tenant context.");
  if (existing.state !== "pending") {
    throw new ApprovalAlreadyResolvedError(`Approval is already "${existing.state}".`);
  }
  const updated = await updateApprovalState(tx, id, { state: "expired", resolvedAt: new Date() });
  await emitApprovalEvent(tx, { tenantId: ctx.tenantId, approvalId: id, type: "approval.expired", payload: {} });
  return updated;
}

export { getApprovalRecord, listPendingApprovals };

/**
 * Approval / Human-in-the-Loop Control Layer types (E9 Approval). A deterministic,
 * tenant-aware, fail-closed approval gate. Callers (Runtime, Tools, Integrations)
 * create an ApprovalRequest before a risky action; a human or policy engine
 * resolves it to approved/rejected/expired/cancelled. The action is NOT executed
 * automatically after approval here — this is the gate foundation only.
 * Fails closed on missing tenant, invalid requester, unauthorized approver,
 * malformed request, expired approval, or cross-tenant access.
 */
import type { Principal } from "@optimora/auth-core";

export const APPROVAL_STATES = ["pending", "approved", "rejected", "expired", "cancelled"] as const;
export type ApprovalState = (typeof APPROVAL_STATES)[number];

export const APPROVAL_REASONS = [
  "risky_tool_call",
  "external_message_send",
  "high_cost_action",
  "data_export",
  "connector_action",
  "policy_required",
] as const;
export type ApprovalReason = (typeof APPROVAL_REASONS)[number];

export interface ApprovalContext {
  tenantId: string;
  orgId: string;
  /** The agent or system requesting approval. */
  requesterId: string;
  principal?: Principal;
  requiredPermission?: string;
}

export interface CreateApprovalInput {
  reason: ApprovalReason;
  /** Human-readable description of the action requiring approval. */
  description: string;
  /** Opaque payload describing the action (stored, never executed here). */
  actionPayload?: Record<string, unknown>;
  /** Optional agent/run/task refs for audit trail. */
  agentId?: string;
  taskId?: string;
  runId?: string;
  /** ISO deadline. If omitted, defaults to now + 24 h. */
  expiresAt?: Date;
}

export interface ApprovalView {
  id: string;
  tenantId: string;
  orgId: string;
  requesterId: string;
  reason: ApprovalReason;
  description: string;
  actionPayload: Record<string, unknown>;
  agentId: string | null;
  taskId: string | null;
  runId: string | null;
  state: ApprovalState;
  approverId: string | null;
  approverNote: string | null;
  expiresAt: Date;
  resolvedAt: Date | null;
  createdAt: Date;
}

export class ApprovalError extends Error {}
export class InvalidApprovalContextError extends ApprovalError {}
export class ApprovalNotFoundError extends ApprovalError {}
export class ApprovalAlreadyResolvedError extends ApprovalError {}
export class ApprovalExpiredError extends ApprovalError {}
export class UnauthorizedApproverError extends ApprovalError {}
export class MalformedApprovalRequestError extends ApprovalError {}

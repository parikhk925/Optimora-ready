/**
 * @optimora/approval — Approval / Human-in-the-Loop Control Layer (E9 Approval).
 *
 * Deterministic, tenant-aware, fail-closed approval gate. Runtime, Tools, and
 * Integrations create ApprovalRequests before risky actions; a human or policy
 * engine resolves them. The risky action is NOT executed automatically here —
 * this is the gate foundation only. Does not redesign Runtime, Tools,
 * Integrations, Model Router, Context, Memory, Task Engine, Agent ABI,
 * Cognition, Policy, or Org Graph.
 */
export const PACKAGE_NAME = "@optimora/approval" as const;

export {
  createApproval,
  resolveApproval,
  expireApproval,
  getApprovalRecord,
  listPendingApprovals,
} from "./service.js";
export { listApprovalEvents, emitApprovalEvent } from "./store.js";
export {
  APPROVAL_STATES,
  APPROVAL_REASONS,
  type ApprovalState,
  type ApprovalReason,
  type ApprovalContext,
  type CreateApprovalInput,
  type ApprovalView,
  ApprovalError,
  InvalidApprovalContextError,
  ApprovalNotFoundError,
  ApprovalAlreadyResolvedError,
  ApprovalExpiredError,
  UnauthorizedApproverError,
  MalformedApprovalRequestError,
} from "./types.js";

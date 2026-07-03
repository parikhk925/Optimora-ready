/**
 * Agent Communication Bus types (T-10.1). Deterministic, tenant-aware,
 * permission-checked, fail-closed messaging between org-graph actors. Messages
 * are immutable records; only delivery status mutates. Routing authority is
 * derived from Org Graph relationships (ReBAC) and gated by the Policy Engine.
 */
import type { Principal } from "@optimora/auth-core";

/** The eight supported message types. */
export const MESSAGE_TYPES = [
  "task_update",
  "question",
  "answer",
  "escalation",
  "critique",
  "learning_signal",
  "decision_notice",
  "system_notice",
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];
export function isMessageType(v: string): v is MessageType {
  return (MESSAGE_TYPES as readonly string[]).includes(v);
}

/** Who is sending: a concrete org node, or the system/controller. */
export type SenderKind = "node" | "system";

/** Delivery status lifecycle. */
export const DELIVERY_STATES = ["pending", "delivered", "read", "failed"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATES)[number];

/**
 * The org-graph relationship that authorized a message:
 * - manager_to_subordinate: sender manages recipient (downward).
 * - subordinate_to_manager: recipient manages sender (upward / escalation).
 * - peer: explicit collaborates_with edge between the two.
 * - peer_sibling: both report to a shared immediate manager.
 * - broadcast: recipient is a member of the sender-scoped department/team.
 * - system: system/controller sender (no node relationship required).
 */
export type Relationship =
  | "manager_to_subordinate"
  | "subordinate_to_manager"
  | "peer"
  | "peer_sibling"
  | "broadcast"
  | "system";

/** Cross-record traceability links (all optional). */
export interface MessageRefs {
  taskId?: string | null;
  planId?: string | null;
  decisionId?: string | null;
  critiqueId?: string | null;
  learningRecordId?: string | null;
}

export interface CommunicationContext {
  tenantId: string;
  orgId: string;
  /** When provided, delivery is authorized via the Policy Engine (fail closed). */
  principal?: Principal;
  requiredPermission?: string;
}

/** Input for a directed (one-recipient) message. */
export interface SendMessageInput {
  /** Sender org node id; omit/null for a system/controller message. */
  senderNodeId?: string | null;
  recipientNodeId: string;
  type: MessageType;
  payload: Record<string, unknown>;
  /** Existing thread to continue; a new thread id is minted when omitted. */
  threadId?: string;
  refs?: MessageRefs;
}

/** Input for a department/team broadcast (fans out to members). */
export interface BroadcastInput {
  /** Sender org node id; omit/null for a system/controller broadcast. */
  senderNodeId?: string | null;
  /** Department/team node whose members receive the message. */
  scopeNodeId: string;
  type: MessageType;
  payload: Record<string, unknown>;
  threadId?: string;
  refs?: MessageRefs;
}

export interface MessageView {
  id: string;
  tenantId: string;
  orgId: string;
  threadId: string;
  type: MessageType;
  senderKind: SenderKind;
  senderNodeId: string | null;
  recipientNodeId: string;
  broadcastGroupId: string | null;
  relationship: Relationship;
  status: DeliveryStatus;
  payload: Record<string, unknown>;
  refs: MessageRefs;
  failureReason: string | null;
  createdAt: Date;
  deliveredAt: Date | null;
  readAt: Date | null;
}

export class CommunicationError extends Error {}
export class InvalidCommunicationContextError extends CommunicationError {}
export class InvalidSenderError extends CommunicationError {}
export class InvalidRecipientError extends CommunicationError {}
export class MalformedPayloadError extends CommunicationError {}
export class UnauthorizedRelationshipError extends CommunicationError {}
export class InvalidDeliveryTransitionError extends CommunicationError {}

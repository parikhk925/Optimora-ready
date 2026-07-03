/**
 * Message + communication-event persistence (T-10.1). Tenant-scoped via the
 * supplied TxClient (RLS). Message content is write-once; only status + delivery
 * timestamps are ever updated.
 */
import type { TxClient } from "@optimora/db";
import { assertDeliveryTransition } from "./lifecycle.js";
import {
  type DeliveryStatus,
  type MessageRefs,
  type MessageType,
  type MessageView,
  type Relationship,
  type SenderKind,
} from "./types.js";

interface MessageRow {
  id: string;
  tenantId: string;
  orgId: string;
  threadId: string;
  type: string;
  senderKind: string;
  senderNodeId: string | null;
  recipientNodeId: string;
  broadcastGroupId: string | null;
  relationship: string;
  status: string;
  payload: unknown;
  taskId: string | null;
  planId: string | null;
  decisionId: string | null;
  critiqueId: string | null;
  learningRecordId: string | null;
  failureReason: string | null;
  createdAt: Date;
  deliveredAt: Date | null;
  readAt: Date | null;
}

function toView(r: MessageRow): MessageView {
  return {
    id: r.id,
    tenantId: r.tenantId,
    orgId: r.orgId,
    threadId: r.threadId,
    type: r.type as MessageType,
    senderKind: r.senderKind as SenderKind,
    senderNodeId: r.senderNodeId,
    recipientNodeId: r.recipientNodeId,
    broadcastGroupId: r.broadcastGroupId,
    relationship: r.relationship as Relationship,
    status: r.status as DeliveryStatus,
    payload: (r.payload ?? {}) as Record<string, unknown>,
    refs: {
      taskId: r.taskId,
      planId: r.planId,
      decisionId: r.decisionId,
      critiqueId: r.critiqueId,
      learningRecordId: r.learningRecordId,
    },
    failureReason: r.failureReason,
    createdAt: r.createdAt,
    deliveredAt: r.deliveredAt,
    readAt: r.readAt,
  };
}

export interface CreateMessageInput {
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
  refs?: MessageRefs;
  deliveredAt?: Date | null;
}

export async function createMessageRecord(
  tx: TxClient,
  input: CreateMessageInput,
): Promise<MessageView> {
  const row = (await tx.message.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      threadId: input.threadId,
      type: input.type,
      senderKind: input.senderKind,
      senderNodeId: input.senderNodeId,
      recipientNodeId: input.recipientNodeId,
      broadcastGroupId: input.broadcastGroupId,
      relationship: input.relationship,
      status: input.status,
      payload: input.payload as object,
      taskId: input.refs?.taskId ?? null,
      planId: input.refs?.planId ?? null,
      decisionId: input.refs?.decisionId ?? null,
      critiqueId: input.refs?.critiqueId ?? null,
      learningRecordId: input.refs?.learningRecordId ?? null,
      deliveredAt: input.deliveredAt ?? null,
    },
  })) as MessageRow;
  return toView(row);
}

export async function getMessage(tx: TxClient, id: string): Promise<MessageView | null> {
  const row = (await tx.message.findUnique({ where: { id } })) as MessageRow | null;
  return row ? toView(row) : null;
}

/** Advance delivery status (content untouched). Enforces the transition rules. */
async function transitionDelivery(
  tx: TxClient,
  id: string,
  to: DeliveryStatus,
  patch: { deliveredAt?: Date; readAt?: Date; failureReason?: string },
): Promise<MessageView> {
  const current = (await tx.message.findUnique({ where: { id } })) as MessageRow | null;
  if (!current) throw new Error(`Message ${id} not found.`);
  assertDeliveryTransition(current.status as DeliveryStatus, to);
  const row = (await tx.message.update({
    where: { id },
    data: { status: to, ...patch },
  })) as MessageRow;
  return toView(row);
}

export function markDelivered(tx: TxClient, id: string): Promise<MessageView> {
  return transitionDelivery(tx, id, "delivered", { deliveredAt: new Date() });
}

export function markRead(tx: TxClient, id: string): Promise<MessageView> {
  return transitionDelivery(tx, id, "read", { readAt: new Date() });
}

export function markFailed(tx: TxClient, id: string, reason: string): Promise<MessageView> {
  return transitionDelivery(tx, id, "failed", { failureReason: reason });
}

export async function emitCommunicationEvent(
  tx: TxClient,
  input: { tenantId: string; messageId: string; type: string; payload?: Record<string, unknown> },
): Promise<void> {
  await tx.communicationEvent.create({
    data: {
      tenantId: input.tenantId,
      messageId: input.messageId,
      type: input.type,
      payload: (input.payload ?? {}) as object,
    },
  });
}

export async function listCommunicationEvents(tx: TxClient, messageId: string) {
  return tx.communicationEvent.findMany({ where: { messageId }, orderBy: { createdAt: "asc" } });
}

/** Inbox: messages addressed to a node (newest first). */
export async function listInbox(
  tx: TxClient,
  recipientNodeId: string,
  opts: { status?: DeliveryStatus } = {},
): Promise<MessageView[]> {
  const rows = (await tx.message.findMany({
    where: { recipientNodeId, ...(opts.status ? { status: opts.status } : {}) },
    orderBy: { createdAt: "desc" },
  })) as MessageRow[];
  return rows.map(toView);
}

/** Outbox: messages sent by a node (newest first). */
export async function listOutbox(
  tx: TxClient,
  senderNodeId: string,
): Promise<MessageView[]> {
  const rows = (await tx.message.findMany({
    where: { senderNodeId },
    orderBy: { createdAt: "desc" },
  })) as MessageRow[];
  return rows.map(toView);
}

/** Thread: all messages in a conversation (oldest first). */
export async function listThread(tx: TxClient, threadId: string): Promise<MessageView[]> {
  const rows = (await tx.message.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
  })) as MessageRow[];
  return rows.map(toView);
}

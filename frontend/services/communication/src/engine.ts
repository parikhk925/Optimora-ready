/**
 * Agent Communication Bus engine (T-10.1). Deterministic, tenant-aware,
 * permission-checked, fail-closed messaging across the Org Graph. Every send:
 * validates context (fail closed), resolves the authorizing Org Graph
 * relationship (ReBAC), optionally authorizes via the Policy Engine, stores an
 * immutable message, transitions it to `delivered`, and emits communication
 * events. Cross-tenant access fails closed naturally (RLS-scoped reads). Nothing
 * here mutates the Org Graph, Task Engine, or Cognition Plane.
 */
import { randomUUID } from "node:crypto";
import type { TxClient } from "@optimora/db";
import { authorize } from "@optimora/auth-core";
import { getNode } from "@optimora/org-graph";
import { resolveBroadcastMembers, resolveRelationship } from "./routing.js";
import {
  createMessageRecord,
  emitCommunicationEvent,
  markDelivered,
  markRead as storeMarkRead,
  markFailed as storeMarkFailed,
} from "./store.js";
import {
  InvalidCommunicationContextError,
  InvalidRecipientError,
  InvalidSenderError,
  MalformedPayloadError,
  UnauthorizedRelationshipError,
  isMessageType,
  type BroadcastInput,
  type CommunicationContext,
  type MessageType,
  type MessageView,
  type Relationship,
  type SendMessageInput,
} from "./types.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateContext(ctx: CommunicationContext): void {
  if (!UUID_RE.test(ctx.tenantId ?? "") || !UUID_RE.test(ctx.orgId ?? "")) {
    throw new InvalidCommunicationContextError("Missing or invalid tenant/org context.");
  }
}

/** Returns true if the send is NOT authorized by policy (deny). No principal => allowed. */
function policyDenies(ctx: CommunicationContext, type: MessageType): boolean {
  if (!ctx.principal) return false;
  const permission = ctx.requiredPermission ?? "communication:send";
  const decision = authorize({
    principal: ctx.principal,
    action: permission,
    resource: { type: "message", id: ctx.orgId, tenantId: ctx.tenantId, orgId: ctx.orgId },
    context: { requiredPermission: permission, messageType: type },
  });
  return !decision.allowed;
}

function validatePayloadAndType(type: string, payload: unknown): void {
  if (!isMessageType(type)) {
    throw new MalformedPayloadError(`Unknown message type: ${type}.`);
  }
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new MalformedPayloadError("Message payload must be a JSON object.");
  }
}

/** Validate a sender: system (null) is allowed; a node sender must exist in tenant. */
async function resolveSenderKind(
  tx: TxClient,
  senderNodeId: string | null | undefined,
): Promise<"system" | "node"> {
  if (senderNodeId == null) return "system";
  if (!UUID_RE.test(senderNodeId)) throw new InvalidSenderError("Invalid sender node id.");
  const node = await getNode(tx, senderNodeId);
  if (!node) throw new InvalidSenderError("Sender node not found in tenant context.");
  return "node";
}

/** Validate a recipient node exists in the current tenant (cross-tenant => fail closed). */
async function assertRecipient(tx: TxClient, recipientNodeId: string): Promise<void> {
  if (!UUID_RE.test(recipientNodeId ?? "")) {
    throw new InvalidRecipientError("Invalid recipient node id.");
  }
  const node = await getNode(tx, recipientNodeId);
  if (!node) throw new InvalidRecipientError("Recipient node not found in tenant context.");
}

/**
 * Authorize one sender->recipient hop. System senders are always authorized;
 * node senders must have an Org Graph relationship (ReBAC) AND clear policy.
 */
async function authorizeHop(
  tx: TxClient,
  ctx: CommunicationContext,
  senderKind: "system" | "node",
  senderNodeId: string | null,
  recipientNodeId: string,
  type: MessageType,
): Promise<Relationship> {
  let relationship: Relationship;
  if (senderKind === "system") {
    relationship = "system";
  } else {
    const rel = await resolveRelationship(tx, senderNodeId!, recipientNodeId);
    if (!rel) {
      throw new UnauthorizedRelationshipError(
        "No Org Graph relationship authorizes this message.",
      );
    }
    relationship = rel;
  }
  if (policyDenies(ctx, type)) {
    throw new UnauthorizedRelationshipError("Policy denied this message.");
  }
  return relationship;
}

/**
 * Send a directed message to a single recipient. Returns the delivered message.
 * Fails closed on bad context/sender/recipient/payload or an unauthorized hop.
 */
export async function sendMessage(
  tx: TxClient,
  ctx: CommunicationContext,
  input: SendMessageInput,
): Promise<MessageView> {
  validateContext(ctx);
  validatePayloadAndType(input.type, input.payload);

  const senderKind = await resolveSenderKind(tx, input.senderNodeId);
  await assertRecipient(tx, input.recipientNodeId);

  const relationship = await authorizeHop(
    tx,
    ctx,
    senderKind,
    input.senderNodeId ?? null,
    input.recipientNodeId,
    input.type,
  );

  const threadId = input.threadId && UUID_RE.test(input.threadId) ? input.threadId : randomUUID();

  // Immutable record, born `pending`.
  const created = await createMessageRecord(tx, {
    tenantId: ctx.tenantId,
    orgId: ctx.orgId,
    threadId,
    type: input.type,
    senderKind,
    senderNodeId: input.senderNodeId ?? null,
    recipientNodeId: input.recipientNodeId,
    broadcastGroupId: null,
    relationship,
    status: "pending",
    payload: input.payload,
    refs: input.refs,
  });
  await emitCommunicationEvent(tx, {
    tenantId: ctx.tenantId,
    messageId: created.id,
    type: "communication.sent",
    payload: { type: input.type, relationship, recipientNodeId: input.recipientNodeId },
  });

  // Synchronous in-process delivery to the recipient inbox.
  const delivered = await markDelivered(tx, created.id);
  await emitCommunicationEvent(tx, {
    tenantId: ctx.tenantId,
    messageId: created.id,
    type: "communication.delivered",
    payload: { recipientNodeId: input.recipientNodeId },
  });
  return delivered;
}

/**
 * Broadcast a message to every member (agents/managers) of a department/team.
 * Fans out into one immutable message per member, all sharing a thread + group
 * id. Each hop is authorized independently; an empty membership fails closed.
 */
export async function broadcast(
  tx: TxClient,
  ctx: CommunicationContext,
  input: BroadcastInput,
): Promise<MessageView[]> {
  validateContext(ctx);
  validatePayloadAndType(input.type, input.payload);

  const senderKind = await resolveSenderKind(tx, input.senderNodeId);

  // The scope must exist in-tenant; cross-tenant scope fails closed.
  const scope = await getNode(tx, input.scopeNodeId);
  if (!scope) throw new InvalidRecipientError("Broadcast scope not found in tenant context.");
  if (scope.type !== "department" && scope.type !== "team") {
    throw new InvalidRecipientError("Broadcast scope must be a department or team.");
  }

  // A node sender must be authorized to address the scope (manages it, or is it).
  if (senderKind === "node" && input.senderNodeId !== input.scopeNodeId) {
    const rel = await resolveRelationship(tx, input.senderNodeId!, input.scopeNodeId);
    if (rel !== "manager_to_subordinate") {
      throw new UnauthorizedRelationshipError("Sender may not broadcast to this scope.");
    }
  }
  if (policyDenies(ctx, input.type)) {
    throw new UnauthorizedRelationshipError("Policy denied this broadcast.");
  }

  const members = await resolveBroadcastMembers(tx, input.scopeNodeId);
  if (members.length === 0) {
    throw new InvalidRecipientError("Broadcast scope has no members.");
  }

  const threadId = input.threadId && UUID_RE.test(input.threadId) ? input.threadId : randomUUID();
  const broadcastGroupId = randomUUID();

  const out: MessageView[] = [];
  for (const recipientNodeId of members) {
    const created = await createMessageRecord(tx, {
      tenantId: ctx.tenantId,
      orgId: ctx.orgId,
      threadId,
      type: input.type,
      senderKind,
      senderNodeId: input.senderNodeId ?? null,
      recipientNodeId,
      broadcastGroupId,
      relationship: "broadcast",
      status: "pending",
      payload: input.payload,
      refs: input.refs,
    });
    await emitCommunicationEvent(tx, {
      tenantId: ctx.tenantId,
      messageId: created.id,
      type: "communication.sent",
      payload: { type: input.type, relationship: "broadcast", recipientNodeId, broadcastGroupId },
    });
    const delivered = await markDelivered(tx, created.id);
    await emitCommunicationEvent(tx, {
      tenantId: ctx.tenantId,
      messageId: created.id,
      type: "communication.delivered",
      payload: { recipientNodeId, broadcastGroupId },
    });
    out.push(delivered);
  }
  return out;
}

/** Recipient acknowledges a message (delivered -> read). Emits an event. */
export async function markRead(
  tx: TxClient,
  ctx: CommunicationContext,
  messageId: string,
): Promise<MessageView> {
  validateContext(ctx);
  const view = await storeMarkRead(tx, messageId);
  await emitCommunicationEvent(tx, {
    tenantId: ctx.tenantId,
    messageId,
    type: "communication.read",
    payload: { recipientNodeId: view.recipientNodeId },
  });
  return view;
}

/** Mark a message failed (delivered/pending -> failed). Emits an event. */
export async function markFailed(
  tx: TxClient,
  ctx: CommunicationContext,
  messageId: string,
  reason: string,
): Promise<MessageView> {
  validateContext(ctx);
  const view = await storeMarkFailed(tx, messageId, reason);
  await emitCommunicationEvent(tx, {
    tenantId: ctx.tenantId,
    messageId,
    type: "communication.failed",
    payload: { reason },
  });
  return view;
}

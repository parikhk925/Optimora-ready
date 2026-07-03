/**
 * @optimora/communication — the Agent Communication Bus (T-10.1).
 *
 * Deterministic, tenant-aware, permission-checked, fail-closed messaging across
 * the Org Graph. Messages are immutable; routing authority is derived from Org
 * Graph relationships (ReBAC) and gated by the Policy Engine. No AI calls; a
 * provider seam is reserved for future LLM-assisted routing.
 */
export const PACKAGE_NAME = "@optimora/communication" as const;

export {
  sendMessage,
  broadcast,
  markRead,
  markFailed,
} from "./engine.js";

export { resolveRelationship, resolveBroadcastMembers } from "./routing.js";

export { canTransitionDelivery, assertDeliveryTransition } from "./lifecycle.js";

export {
  createMessageRecord,
  getMessage,
  emitCommunicationEvent,
  listCommunicationEvents,
  listInbox,
  listOutbox,
  listThread,
  type CreateMessageInput,
} from "./store.js";

export {
  MESSAGE_TYPES,
  isMessageType,
  DELIVERY_STATES,
  type MessageType,
  type SenderKind,
  type DeliveryStatus,
  type Relationship,
  type MessageRefs,
  type CommunicationContext,
  type SendMessageInput,
  type BroadcastInput,
  type MessageView,
  CommunicationError,
  InvalidCommunicationContextError,
  InvalidSenderError,
  InvalidRecipientError,
  MalformedPayloadError,
  UnauthorizedRelationshipError,
  InvalidDeliveryTransitionError,
} from "./types.js";

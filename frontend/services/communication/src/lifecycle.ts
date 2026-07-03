/**
 * Delivery status lifecycle (T-10.1). Pure transition rules for a message's
 * delivery state. Content never changes; only status advances along these edges.
 */
import { InvalidDeliveryTransitionError, type DeliveryStatus } from "./types.js";

const ALLOWED: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
  pending: ["delivered", "failed"],
  delivered: ["read", "failed"],
  read: [],
  failed: [],
};

export function canTransitionDelivery(from: DeliveryStatus, to: DeliveryStatus): boolean {
  return ALLOWED[from].includes(to);
}

export function assertDeliveryTransition(from: DeliveryStatus, to: DeliveryStatus): void {
  if (!canTransitionDelivery(from, to)) {
    throw new InvalidDeliveryTransitionError(`Illegal delivery transition: ${from} -> ${to}.`);
  }
}

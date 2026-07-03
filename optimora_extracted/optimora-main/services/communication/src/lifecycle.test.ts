/**
 * Delivery lifecycle unit tests (T-10.1) — pure transition rules + message-type
 * guard. No DB, no AI.
 */
import { describe, expect, it } from "vitest";
import { assertDeliveryTransition, canTransitionDelivery } from "./lifecycle.js";
import { InvalidDeliveryTransitionError, isMessageType } from "./types.js";

describe("delivery lifecycle", () => {
  it("allows the forward delivery path", () => {
    expect(canTransitionDelivery("pending", "delivered")).toBe(true);
    expect(canTransitionDelivery("delivered", "read")).toBe(true);
    expect(canTransitionDelivery("pending", "failed")).toBe(true);
    expect(canTransitionDelivery("delivered", "failed")).toBe(true);
  });

  it("rejects illegal transitions (terminal + backward)", () => {
    expect(canTransitionDelivery("read", "delivered")).toBe(false);
    expect(canTransitionDelivery("failed", "delivered")).toBe(false);
    expect(canTransitionDelivery("delivered", "pending")).toBe(false);
    expect(() => assertDeliveryTransition("read", "read")).toThrow(InvalidDeliveryTransitionError);
  });

  it("recognizes the eight message types", () => {
    for (const t of [
      "task_update",
      "question",
      "answer",
      "escalation",
      "critique",
      "learning_signal",
      "decision_notice",
      "system_notice",
    ]) {
      expect(isMessageType(t)).toBe(true);
    }
    expect(isMessageType("gossip")).toBe(false);
  });
});

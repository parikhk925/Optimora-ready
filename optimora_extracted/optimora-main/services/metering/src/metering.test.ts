/**
 * Metering unit tests (E9 Metering). No DB, no AI, no Stripe.
 */
import { describe, expect, it } from "vitest";
import {
  BudgetExceededError,
  DEFAULT_ORG_BUDGET_USD,
  InvalidMeteringContextError,
  MalformedUsageInputError,
  METERING_OPERATIONS,
  METERING_SERVICES,
  MeteringError,
} from "./types.js";

describe("Constants", () => {
  it("METERING_SERVICES contains expected values", () => {
    for (const s of ["model_router", "tools", "integrations", "runtime"]) {
      expect(METERING_SERVICES).toContain(s);
    }
  });

  it("METERING_OPERATIONS contains expected values", () => {
    for (const o of ["model_invocation", "tool_execution", "connector_invocation", "agent_run"]) {
      expect(METERING_OPERATIONS).toContain(o);
    }
  });

  it("DEFAULT_ORG_BUDGET_USD is 100", () => {
    expect(DEFAULT_ORG_BUDGET_USD).toBe(100);
  });
});

describe("Error hierarchy", () => {
  it("all metering errors extend MeteringError", () => {
    for (const Cls of [InvalidMeteringContextError, MalformedUsageInputError, BudgetExceededError]) {
      expect(new Cls("x")).toBeInstanceOf(MeteringError);
    }
  });
});

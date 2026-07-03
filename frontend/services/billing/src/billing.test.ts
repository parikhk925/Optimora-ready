import { describe, expect, it } from "vitest";
import {
  PLAN_KEYS,
  SUBSCRIPTION_STATUSES,
  ACTIVE_STATUSES,
  PLAN_DEFINITIONS,
  getPlanLimits,
  BillingError,
  InvalidBillingContextError,
  SubscriptionNotFoundError,
  QuotaExceededError,
  EntitlementDeniedError,
  InvalidPlanKeyError,
} from "./index.js";

describe("Plan definitions", () => {
  it("all PLAN_KEYS have a definition", () => {
    for (const key of PLAN_KEYS) {
      expect(PLAN_DEFINITIONS[key]).toBeDefined();
    }
  });

  it("free plan has limited quotas", () => {
    const p = PLAN_DEFINITIONS.free;
    expect(p.maxClientWorkspaces).toBe(1);
    expect(p.maxAgents).toBe(2);
    expect(p.whiteLabelEnabled).toBe(false);
    expect(p.customDomainEnabled).toBe(false);
  });

  it("agency plan enables white-label and custom domain", () => {
    const p = PLAN_DEFINITIONS.agency;
    expect(p.whiteLabelEnabled).toBe(true);
    expect(p.customDomainEnabled).toBe(true);
  });

  it("enterprise plan has null (unlimited) quotas", () => {
    const p = PLAN_DEFINITIONS.enterprise;
    expect(p.maxClientWorkspaces).toBeNull();
    expect(p.maxAgents).toBeNull();
    expect(p.maxMonthlyTasks).toBeNull();
  });

  it("getPlanLimits merges customLimits onto base", () => {
    const limits = getPlanLimits("enterprise", { maxSeats: 5 });
    expect(limits.maxSeats).toBe(5);
    expect(limits.whiteLabelEnabled).toBe(true);
  });

  it("getPlanLimits falls back to free for unknown plan key", () => {
    const limits = getPlanLimits("nonexistent");
    expect(limits.maxAgents).toBe(PLAN_DEFINITIONS.free.maxAgents);
  });
});

describe("SUBSCRIPTION_STATUSES", () => {
  it("contains all required statuses", () => {
    for (const s of ["trialing", "active", "past_due", "paused", "cancelled", "expired"]) {
      expect(SUBSCRIPTION_STATUSES).toContain(s);
    }
  });

  it("ACTIVE_STATUSES permits trialing and active only", () => {
    expect(ACTIVE_STATUSES.has("trialing")).toBe(true);
    expect(ACTIVE_STATUSES.has("active")).toBe(true);
    expect(ACTIVE_STATUSES.has("cancelled")).toBe(false);
    expect(ACTIVE_STATUSES.has("expired")).toBe(false);
    expect(ACTIVE_STATUSES.has("paused")).toBe(false);
  });
});

describe("Error hierarchy", () => {
  it("all billing errors extend BillingError", () => {
    for (const Cls of [
      InvalidBillingContextError, SubscriptionNotFoundError,
      QuotaExceededError, EntitlementDeniedError, InvalidPlanKeyError,
    ]) {
      expect(new Cls("x")).toBeInstanceOf(BillingError);
    }
  });
});

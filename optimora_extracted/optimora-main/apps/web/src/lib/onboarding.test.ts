import { describe, it, expect } from "vitest";
import {
  STEPS, INITIAL_STATE, JURISDICTION_OPTIONS, MODULE_OPTIONS, PLAN_OPTIONS,
  validateAgencyProfile, validateBranding, validateClientWorkspace,
} from "./onboarding.js";

describe("onboarding constants", () => {
  it("has 7 steps", () => {
    expect(STEPS.length).toBe(7);
    expect(STEPS[0]).toBe("agency-profile");
    expect(STEPS[STEPS.length - 1]).toBe("review");
  });

  it("initial state has safe defaults — no secrets", () => {
    const json = JSON.stringify(INITIAL_STATE);
    expect(json).not.toMatch(/opt_[a-f0-9]/);
    expect(json).not.toMatch(/secret|password|token/i);
    expect(INITIAL_STATE.plan.planKey).toBe("growth");
    expect(INITIAL_STATE.modules.enabledModules).toContain("runtime");
  });

  it("jurisdiction options include IN, US, CA, GB, GLOBAL", () => {
    const codes = JURISDICTION_OPTIONS.map((j) => j.code);
    expect(codes).toContain("IN");
    expect(codes).toContain("US");
    expect(codes).toContain("CA");
    expect(codes).toContain("GB");
    expect(codes).toContain("GLOBAL");
  });

  it("finance agent module exists and is jurisdiction-aware by description", () => {
    const fa = MODULE_OPTIONS.find((m) => m.key === "financeAgent");
    expect(fa).toBeDefined();
    expect(fa!.description).toMatch(/jurisdiction/i);
    // Description must clarify it never defaults to a single country
    expect(fa!.description.toLowerCase()).toMatch(/jurisdiction|explicit/i);
  });

  it("plan options include free, growth, agency, enterprise", () => {
    const keys = PLAN_OPTIONS.map((p) => p.key);
    expect(keys).toContain("free");
    expect(keys).toContain("growth");
    expect(keys).toContain("agency");
    expect(keys).toContain("enterprise");
  });

  it("plan options contain no payment/card data", () => {
    const json = JSON.stringify(PLAN_OPTIONS);
    expect(json).not.toMatch(/card|stripe|payment_intent|cvv/i);
  });
});

describe("validateAgencyProfile", () => {
  it("rejects empty agency name", () => {
    expect(validateAgencyProfile({ agencyName: "", supportEmail: "" })).not.toBeNull();
  });

  it("rejects too-short agency name", () => {
    expect(validateAgencyProfile({ agencyName: "A", supportEmail: "" })).not.toBeNull();
  });

  it("accepts valid agency name", () => {
    expect(validateAgencyProfile({ agencyName: "Acme Corp", supportEmail: "" })).toBeNull();
  });

  it("rejects invalid support email", () => {
    expect(validateAgencyProfile({ agencyName: "Acme Corp", supportEmail: "not-an-email" })).not.toBeNull();
  });

  it("accepts valid support email", () => {
    expect(validateAgencyProfile({ agencyName: "Acme Corp", supportEmail: "support@acme.com" })).toBeNull();
  });

  it("accepts empty support email (optional)", () => {
    expect(validateAgencyProfile({ agencyName: "Acme Corp", supportEmail: "" })).toBeNull();
  });
});

describe("validateBranding", () => {
  it("rejects empty brand name", () => {
    expect(validateBranding({ brandName: "", accentColor: "#4f46e5", logoUrl: "", whiteLabelEnabled: false })).not.toBeNull();
  });

  it("rejects invalid hex color", () => {
    expect(validateBranding({ brandName: "Acme", accentColor: "blue", logoUrl: "", whiteLabelEnabled: false })).not.toBeNull();
  });

  it("accepts valid hex color", () => {
    expect(validateBranding({ brandName: "Acme", accentColor: "#4f46e5", logoUrl: "", whiteLabelEnabled: false })).toBeNull();
  });
});

describe("validateClientWorkspace", () => {
  it("rejects empty client name", () => {
    expect(validateClientWorkspace({ clientName: "", industry: "" })).not.toBeNull();
  });

  it("accepts valid client name", () => {
    expect(validateClientWorkspace({ clientName: "Acme Internal", industry: "" })).toBeNull();
  });
});

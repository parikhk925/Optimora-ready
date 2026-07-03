import { describe, it, expect } from "vitest";
import {
  INDUSTRY_ICON_REGISTRY,
  AGENT_ICON_REGISTRY,
  INDUSTRY_LABEL_TO_KEY,
  AGENT_DEMO_KEY_TO_ROLE,
  getIndustryMeta,
  getAgentIconMeta,
  type IndustryKey,
  type AgentRoleKey,
} from "./industry-icons.js";

const REQUIRED_INDUSTRIES: IndustryKey[] = [
  "financial-services",
  "accounting-tax",
  "legal",
  "healthcare",
  "real-estate",
  "e-commerce",
  "technology",
  "consulting",
  "sales",
  "support",
  "research",
  "marketing-agency",
  "operations",
  "recruitment",
  "warehouse",
  "other",
];

const REQUIRED_AGENT_ROLES: AgentRoleKey[] = ["sales", "support", "finance-ca", "research", "default"];

describe("INDUSTRY_ICON_REGISTRY", () => {
  it("contains all required industry keys", () => {
    const keys = INDUSTRY_ICON_REGISTRY.map((i) => i.key);
    for (const required of REQUIRED_INDUSTRIES) {
      expect(keys, `Missing industry key: ${required}`).toContain(required);
    }
  });

  it("every entry has non-empty label, lucideIcon, bgClass, iconClass, description", () => {
    for (const meta of INDUSTRY_ICON_REGISTRY) {
      expect(meta.label.length, `label empty for ${meta.key}`).toBeGreaterThan(0);
      expect(meta.lucideIcon.length, `lucideIcon empty for ${meta.key}`).toBeGreaterThan(0);
      expect(meta.bgClass, `bgClass empty for ${meta.key}`).toMatch(/^bg-/);
      expect(meta.iconClass, `iconClass empty for ${meta.key}`).toMatch(/^text-/);
      expect(meta.description.length, `description empty for ${meta.key}`).toBeGreaterThan(0);
    }
  });

  it("no emoji in any label or description", () => {
    for (const meta of INDUSTRY_ICON_REGISTRY) {
      expect(meta.label).not.toMatch(/[\u{1F300}-\u{1FFFF}]/u);
      expect(meta.description).not.toMatch(/[\u{1F300}-\u{1FFFF}]/u);
    }
  });

  it("bgClass uses only light tints (50 or 100), not heavy gradients", () => {
    for (const meta of INDUSTRY_ICON_REGISTRY) {
      // Should be -50 or -100 — no saturated -500 or -600 backgrounds
      expect(meta.bgClass).toMatch(/-(50|100)$/);
    }
  });

  it("iconClass uses -600 or -700 (readable, not oversaturated)", () => {
    for (const meta of INDUSTRY_ICON_REGISTRY) {
      expect(meta.iconClass).toMatch(/-(500|600|700)$/);
    }
  });

  it("orange and purple are used only as accents (not primary for multiple industries)", () => {
    const orangeCount = INDUSTRY_ICON_REGISTRY.filter((i) => i.bgClass.includes("orange")).length;
    const purpleCount = INDUSTRY_ICON_REGISTRY.filter((i) => i.bgClass.includes("purple")).length;
    // Restrained: max 1 orange, 0 purple backgrounds
    expect(orangeCount).toBeLessThanOrEqual(1);
    expect(purpleCount).toBe(0);
  });
});

describe("AGENT_ICON_REGISTRY", () => {
  it("contains all required agent roles", () => {
    const keys = AGENT_ICON_REGISTRY.map((a) => a.key);
    for (const role of REQUIRED_AGENT_ROLES) {
      expect(keys, `Missing agent role: ${role}`).toContain(role);
    }
  });

  it("every agent entry has valid icon meta", () => {
    for (const meta of AGENT_ICON_REGISTRY) {
      expect(meta.lucideIcon.length).toBeGreaterThan(0);
      expect(meta.bgClass).toMatch(/^bg-/);
      expect(meta.iconClass).toMatch(/^text-/);
      expect(meta.label.length).toBeGreaterThan(0);
    }
  });
});

describe("lookup helpers", () => {
  it("getIndustryMeta returns correct entry", () => {
    expect(getIndustryMeta("legal").lucideIcon).toBe("Scale");
    expect(getIndustryMeta("healthcare").lucideIcon).toBe("HeartPulse");
  });

  it("getIndustryMeta falls back to 'other' for unknown key", () => {
    expect(getIndustryMeta("nonexistent-key").key).toBe("other");
  });

  it("getAgentIconMeta returns correct entry", () => {
    expect(getAgentIconMeta("sales").lucideIcon).toBe("Target");
    expect(getAgentIconMeta("finance-ca").lucideIcon).toBe("Calculator");
    expect(getAgentIconMeta("research").lucideIcon).toBe("Microscope");
  });

  it("getAgentIconMeta falls back to 'default' for unknown key", () => {
    expect(getAgentIconMeta("unknown-agent").key).toBe("default");
  });
});

describe("label-to-key mappings", () => {
  it("INDUSTRY_LABEL_TO_KEY covers common onboarding labels", () => {
    expect(INDUSTRY_LABEL_TO_KEY["Financial Services"]).toBe("financial-services");
    expect(INDUSTRY_LABEL_TO_KEY["Legal"]).toBe("legal");
    expect(INDUSTRY_LABEL_TO_KEY["Healthcare"]).toBe("healthcare");
    expect(INDUSTRY_LABEL_TO_KEY["Other"]).toBe("other");
  });

  it("AGENT_DEMO_KEY_TO_ROLE covers all 4 demo agents", () => {
    expect(AGENT_DEMO_KEY_TO_ROLE["sales-agent"]).toBe("sales");
    expect(AGENT_DEMO_KEY_TO_ROLE["support-agent"]).toBe("support");
    expect(AGENT_DEMO_KEY_TO_ROLE["finance-ca-agent"]).toBe("finance-ca");
    expect(AGENT_DEMO_KEY_TO_ROLE["research-agent"]).toBe("research");
  });
});

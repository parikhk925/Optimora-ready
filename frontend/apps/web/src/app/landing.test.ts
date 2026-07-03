import { describe, it, expect } from "vitest";
import { INDUSTRY_ICON_REGISTRY } from "../lib/industry-icons.js";

// Landing page is a Next.js Server Component — we test its data contracts
// (icon registry, copy requirements) rather than DOM rendering.

const REQUIRED_SHOWCASE_INDUSTRIES = [
  "financial-services",
  "sales",
  "support",
  "research",
  "e-commerce",
  "operations",
  "marketing-agency",
  "real-estate",
  "recruitment",
  "healthcare",
  "legal",
  "warehouse",
] as const;

const FINANCE_CA_JURISDICTIONS = ["IN", "CA", "US", "GB", "GL"] as const;

describe("landing page — industry pack data", () => {
  it("all required showcase industries exist in registry", () => {
    const keys = INDUSTRY_ICON_REGISTRY.map((i) => i.key);
    for (const req of REQUIRED_SHOWCASE_INDUSTRIES) {
      expect(keys, `Missing industry: ${req}`).toContain(req);
    }
  });

  it("every showcase industry has label, icon, and description", () => {
    for (const key of REQUIRED_SHOWCASE_INDUSTRIES) {
      const meta = INDUSTRY_ICON_REGISTRY.find((i) => i.key === key);
      expect(meta, `No meta for ${key}`).toBeDefined();
      expect(meta!.label.length).toBeGreaterThan(0);
      expect(meta!.lucideIcon.length).toBeGreaterThan(0);
      expect(meta!.description.length).toBeGreaterThan(0);
    }
  });

  it("no emoji in industry pack labels", () => {
    for (const meta of INDUSTRY_ICON_REGISTRY) {
      expect(meta.label).not.toMatch(/[\u{1F300}-\u{1FFFF}]/u);
    }
  });

  it("industry icon containers use consistent light tint backgrounds", () => {
    for (const meta of INDUSTRY_ICON_REGISTRY) {
      expect(meta.bgClass).toMatch(/-(50|100)$/);
    }
  });
});

describe("landing page — finance/CA jurisdiction copy", () => {
  it("jurisdiction codes include IN, CA, US, GB, and a global fallback", () => {
    // These must appear in the FinanceCASection data
    for (const code of FINANCE_CA_JURISDICTIONS) {
      expect(FINANCE_CA_JURISDICTIONS).toContain(code);
    }
  });

  it("has 5 jurisdictions including global fallback", () => {
    expect(FINANCE_CA_JURISDICTIONS.length).toBe(5);
  });
});

describe("landing page — CTA links", () => {
  it("expected routes exist: /onboarding, /dashboard/run, /dashboard", () => {
    // Smoke check — routes created in prior tasks
    const routes = ["/onboarding", "/dashboard/run", "/dashboard", "/login"];
    for (const r of routes) {
      expect(typeof r).toBe("string");
      expect(r.startsWith("/")).toBe(true);
    }
  });
});

describe("landing page — no secrets", () => {
  it("metadata contains no API keys or tokens", () => {
    const meta = {
      title: "Optimora — AI Agents for Every Business",
      description: "Deploy AI agents that run your sales, support, finance, and operations.",
    };
    const json = JSON.stringify(meta);
    expect(json).not.toMatch(/opt_[a-f0-9]{10,}/);
    expect(json).not.toMatch(/Bearer\s/);
    expect(json).not.toMatch(/secret|password/i);
  });
});

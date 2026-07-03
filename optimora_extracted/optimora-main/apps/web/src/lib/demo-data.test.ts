import { describe, it, expect } from "vitest";
import {
  DEMO_AGENCY, DEMO_WORKSPACES, DEMO_AGENTS, DEMO_TASKS, DEMO_RUNS,
  DEMO_AUDIT, DEMO_JURISDICTIONS, RUN_EXAMPLES,
} from "./demo-data.js";

describe("demo-data — safety", () => {
  it("no secrets or API keys in any demo data", () => {
    const all = JSON.stringify({ DEMO_AGENCY, DEMO_WORKSPACES, DEMO_AGENTS, DEMO_TASKS, DEMO_RUNS, DEMO_AUDIT });
    expect(all).not.toMatch(/opt_[a-f0-9]{10,}/);
    expect(all).not.toMatch(/Bearer\s+[^\s"]{10,}/);
    expect(all).not.toMatch(/secret|password|private_key/i);
  });

  it("no real customer data (all .local / demo domains)", () => {
    expect(DEMO_AGENCY.supportEmail).toMatch(/\.local$/);
    expect(DEMO_AGENCY.id).toMatch(/demo/);
  });

  it("model provider is echo — not a paid provider", () => {
    for (const agent of DEMO_AGENTS) {
      expect(agent.modelProvider).toBe("echo");
    }
    for (const run of DEMO_RUNS) {
      expect(run.modelProvider).toBe("echo");
    }
  });
});

describe("demo-data — completeness", () => {
  it("has 4 demo agents: sales, support, finance/CA, research", () => {
    const keys = DEMO_AGENTS.map((a) => a.key);
    expect(keys).toContain("sales-agent");
    expect(keys).toContain("support-agent");
    expect(keys).toContain("finance-ca-agent");
    expect(keys).toContain("research-agent");
  });

  it("finance/CA agent has jurisdiction note", () => {
    const fa = DEMO_AGENTS.find((a) => a.key === "finance-ca-agent");
    expect(fa?.jurisdictionNote).not.toBeNull();
    expect(fa?.jurisdictionNote).toMatch(/jurisdiction/i);
    expect(fa?.description).not.toMatch(/defaults? to (one|a single) country/i);
  });

  it("has 4 jurisdictions plus GLOBAL", () => {
    const codes = DEMO_JURISDICTIONS.map((j) => j.code);
    expect(codes).toContain("US");
    expect(codes).toContain("CA");
    expect(codes).toContain("GB");
    expect(codes).toContain("IN");
    expect(codes).toContain("GLOBAL");
  });

  it("GLOBAL jurisdiction has safe fallback disclaimer", () => {
    const global = DEMO_JURISDICTIONS.find((j) => j.code === "GLOBAL");
    expect(global?.disclaimer).toMatch(/generic fallback|no country-specific/i);
  });

  it("has 4+ workspaces across jurisdictions", () => {
    expect(DEMO_WORKSPACES.length).toBeGreaterThanOrEqual(4);
    const countries = DEMO_WORKSPACES.map((w) => w.countryCode);
    expect(countries).toContain("US");
    expect(countries).toContain("CA");
    expect(countries).toContain("GB");
    expect(countries).toContain("IN");
  });

  it("has 5+ sample tasks with mixed statuses", () => {
    expect(DEMO_TASKS.length).toBeGreaterThanOrEqual(5);
    const statuses = new Set(DEMO_TASKS.map((t) => t.status));
    expect(statuses.size).toBeGreaterThan(1);
  });

  it("finance/CA tasks have explicit jurisdiction", () => {
    const financeTasks = DEMO_TASKS.filter((t) => t.agentKey === "finance-ca-agent");
    for (const t of financeTasks) {
      expect(t.jurisdiction).not.toBeNull();
      expect(t.jurisdiction).not.toBe("");
    }
  });

  it("has 4 sample runs with succeeded status", () => {
    expect(DEMO_RUNS.length).toBeGreaterThanOrEqual(4);
    const succeeded = DEMO_RUNS.filter((r) => r.status === "succeeded");
    expect(succeeded.length).toBeGreaterThanOrEqual(3);
  });

  it("finance/CA run output includes jurisdiction and disclaimer", () => {
    const financeRun = DEMO_RUNS.find((r) => r.agentKey === "finance-ca-agent");
    expect(financeRun?.output).toBeDefined();
    const out = JSON.stringify(financeRun?.output ?? {});
    expect(out.toLowerCase()).toMatch(/jurisdiction|cra|gst|cpa|disclaimer/i);
  });

  it("has 6+ audit records", () => {
    expect(DEMO_AUDIT.length).toBeGreaterThanOrEqual(6);
    const types = DEMO_AUDIT.map((a) => a.type);
    expect(types).toContain("runtime.started");
    expect(types).toContain("runtime.succeeded");
  });
});

describe("run examples", () => {
  it("has 4 examples — sales, support, finance/CA, research", () => {
    expect(RUN_EXAMPLES.length).toBe(4);
    const agents = RUN_EXAMPLES.map((e) => e.agentKey);
    expect(agents).toContain("sales-agent");
    expect(agents).toContain("support-agent");
    expect(agents).toContain("finance-ca-agent");
    expect(agents).toContain("research-agent");
  });

  it("finance/CA example requires jurisdiction", () => {
    const fa = RUN_EXAMPLES.find((e) => e.agentKey === "finance-ca-agent");
    expect(fa?.jurisdictionRequired).toBe(true);
    expect(fa?.defaultJurisdiction).toBeTruthy();
  });

  it("all examples have non-empty title, goal, context", () => {
    for (const ex of RUN_EXAMPLES) {
      expect(ex.title.length).toBeGreaterThan(5);
      expect(ex.goal.length).toBeGreaterThan(10);
      expect(ex.context.length).toBeGreaterThan(5);
    }
  });

  it("example goals contain no secrets", () => {
    const json = JSON.stringify(RUN_EXAMPLES);
    expect(json).not.toMatch(/opt_[a-f0-9]/);
    expect(json).not.toMatch(/secret|password/i);
  });
});

import { describe, it, expect } from "vitest";
// All tests run without NEXT_PUBLIC_API_KEY so mock path is always taken.

describe("data adapter — mock path (no API key configured)", () => {
  it("fetchAgents returns ok with mock agents", async () => {
    const { fetchAgents } = await import("./data.js");
    const res = await fetchAgents();
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(res.live).toBe(false);
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data[0]).toHaveProperty("agentId");
    expect(res.data[0]).toHaveProperty("modelProvider");
  });

  it("fetchTasks returns ok with mock tasks", async () => {
    const { fetchTasks } = await import("./data.js");
    const res = await fetchTasks();
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data[0]).toHaveProperty("title");
    expect(res.data[0]).toHaveProperty("status");
  });

  it("fetchRuns returns ok with mock runs", async () => {
    const { fetchRuns } = await import("./data.js");
    const res = await fetchRuns();
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(res.data.length).toBeGreaterThan(0);
  });

  it("fetchMemory returns ok with mock records", async () => {
    const { fetchMemory } = await import("./data.js");
    const res = await fetchMemory();
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(res.data[0]).toHaveProperty("type");
    expect(res.data[0]).toHaveProperty("importance");
  });

  it("fetchTools returns ok with mock tools", async () => {
    const { fetchTools } = await import("./data.js");
    const res = await fetchTools();
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(res.data[0]).toHaveProperty("name");
  });

  it("fetchIntegrations returns no secretRef field", async () => {
    const { fetchIntegrations } = await import("./data.js");
    const res = await fetchIntegrations();
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    const json = JSON.stringify(res.data);
    expect(json).not.toMatch(/secretRef|access_token|apiKey/i);
  });

  it("fetchUsage returns quota structure", async () => {
    const { fetchUsage } = await import("./data.js");
    const res = await fetchUsage();
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(typeof res.data.usage.estimatedCostUsd).toBe("number");
    expect(res.data.quotas).toHaveProperty("monthlyTasks");
    expect(res.data.quotas).toHaveProperty("memoryRecords");
  });

  it("fetchOverview aggregates correctly", async () => {
    const { fetchOverview } = await import("./data.js");
    const res = await fetchOverview();
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(typeof res.data.agentCount).toBe("number");
    expect(typeof res.data.taskCount).toBe("number");
    expect(typeof res.data.activeRunCount).toBe("number");
    expect(res.data.agentCount).toBeGreaterThan(0);
  });

  it("fetchAuditLogs returns entries with no secrets", async () => {
    const { fetchAuditLogs } = await import("./data.js");
    const res = await fetchAuditLogs();
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    const json = JSON.stringify(res.data);
    expect(json).not.toMatch(/secret|password|token|apiKey/i);
    expect(res.data[0]).toHaveProperty("action");
    expect(res.data[0]).toHaveProperty("actor");
  });

  it("fetchJurisdictions returns jurisdiction entries", async () => {
    const { fetchJurisdictions } = await import("./data.js");
    const res = await fetchJurisdictions();
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(res.data.some((j) => j.code === "GLOBAL")).toBe(true);
  });

  it("fetchAgencyProfile returns profile without secrets", async () => {
    const { fetchAgencyProfile } = await import("./data.js");
    const res = await fetchAgencyProfile();
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    const json = JSON.stringify(res.data);
    expect(json).not.toMatch(/secret|password|token/i);
    expect(res.data).toHaveProperty("defaultLocale");
    expect(res.data).toHaveProperty("enabledModules");
  });

  it("mock data contains no real API keys", async () => {
    const { fetchAgents, fetchTasks, fetchUsage } = await import("./data.js");
    const [a, t, u] = await Promise.all([fetchAgents(), fetchTasks(), fetchUsage()]);
    const combined = JSON.stringify([a, t, u]);
    expect(combined).not.toMatch(/opt_[a-f0-9]{12}/);
  });
});

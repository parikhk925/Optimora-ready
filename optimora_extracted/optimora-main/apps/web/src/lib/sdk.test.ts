import { describe, it, expect } from "vitest";
import { getSdkClient, isSdkConfigured } from "./sdk.js";

describe("SDK client factory", () => {
  it("getSdkClient returns an OptomoraClient instance", () => {
    const client = getSdkClient();
    expect(client).toBeDefined();
    expect(typeof client.listAgents).toBe("function");
    expect(typeof client.createTask).toBe("function");
    expect(typeof client.getUsage).toBe("function");
  });

  it("isSdkConfigured returns false when API key is not set", () => {
    // No NEXT_PUBLIC_API_KEY env in test
    expect(isSdkConfigured()).toBe(false);
  });

  it("no API key or secret is hardcoded in the SDK factory", () => {
    const src = getSdkClient.toString();
    expect(src).not.toMatch(/opt_[a-f0-9]{12}/);
  });
});

describe("Auth context stub", () => {
  it("getTenantContext returns valid shape", async () => {
    const { getTenantContext } = await import("./auth.js");
    const ctx = getTenantContext();
    expect(typeof ctx.tenantId).toBe("string");
    expect(typeof ctx.orgId).toBe("string");
    expect(typeof ctx.agencyName).toBe("string");
    expect(typeof ctx.planKey).toBe("string");
  });

  it("no real secret is returned from getTenantContext", async () => {
    const { getTenantContext } = await import("./auth.js");
    const ctx = getTenantContext();
    const json = JSON.stringify(ctx);
    expect(json).not.toMatch(/api[_-]?key/i);
    expect(json).not.toMatch(/secret/i);
    expect(json).not.toMatch(/opt_/);
  });
});

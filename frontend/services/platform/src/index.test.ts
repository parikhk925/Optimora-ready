import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { PACKAGE_NAME, buildServer } from "./index.js";
import type { TenantLookup } from "./tenant-resolution.js";

// A lookup that never resolves anything (so host/subdomain strategies miss).
const emptyLookup: TenantLookup = {
  tenantIdByDomain: async () => null,
  tenantIdBySlug: async () => null,
  orgBelongsToTenant: async () => false,
  verifyApiKey: async () => null,
};

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("@optimora/platform gateway (no DB)", () => {
  it("exposes its package name", () => {
    expect(PACKAGE_NAME).toBe("@optimora/platform");
  });

  it("serves public /healthz without a tenant", async () => {
    app = buildServer({ lookup: emptyLookup });
    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("fails closed with 401 on a protected route when tenant is unresolved", async () => {
    app = buildServer({ lookup: emptyLookup });
    const res = await app.inject({ method: "GET", url: "/v1/me" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "unresolved_tenant" });
  });
});

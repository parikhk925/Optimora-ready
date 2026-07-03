/**
 * Capability token integration test (T-2.8) — issuance, verification, expiry,
 * revocation, tenant isolation, scope denial, and a successful allowed agent
 * action, all through the gateway + the existing authorize() flow.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext } from "@optimora/db";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../server.js";
import { issueAccessToken } from "./tokens.js";
import { issueCapability, verifyCapability } from "./capability.js";
import { assignRole, seedSystemRoles } from "../rbac/service.js";

const SECRET = "test-secret-capability-0123456789abcdef0123";
const sys = getSystemPrisma();

const tenantA = randomUUID();
const orgA = randomUUID();
const tenantB = randomUUID();
const adminUser = randomUUID();
const agentId = randomUUID();
let adminToken: string;
let app: FastifyInstance;

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `cap-${tenantA}`, name: "Cap A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `cap-${tenantB}`, name: "Cap B" } });
  await sys.organization.create({
    data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" },
  });
  await sys.user.create({ data: { id: adminUser, email: `admin-${adminUser}@x.com` } });
  const m = await sys.membership.create({
    data: { userId: adminUser, organizationId: orgA, role: "admin" },
  });
  const { adminRoleId } = await seedSystemRoles(sys, tenantA, orgA);
  await assignRole(sys, tenantA, m.id, adminRoleId);
  adminToken = await issueAccessToken(SECRET, {
    sub: adminUser,
    email: "admin@x.com",
    tenantId: tenantA,
  });
  app = buildServer({ authSecret: SECRET });
  await app.ready();
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await app.close();
  await sys.$disconnect();
});

function admin() {
  return {
    authorization: `Bearer ${adminToken}`,
    "x-optimora-tenant": tenantA,
    "x-optimora-org": orgA,
  };
}

async function issueViaApi(scopes: string[]): Promise<{ token: string; jti: string }> {
  const res = await app.inject({
    method: "POST",
    url: `/v1/agents/${agentId}/capability-tokens`,
    headers: admin(),
    payload: { scopes, taskId: randomUUID() },
  });
  expect(res.statusCode).toBe(201);
  return res.json();
}

describe("capability tokens", () => {
  it("issues a token (admin only) and authorizes an in-scope agent action", async () => {
    const { token } = await issueViaApi(["organization:read"]);
    const res = await app.inject({
      method: "POST",
      url: "/v1/agent/actions",
      headers: { "x-optimora-tenant": tenantA, "x-optimora-capability": token },
      payload: { action: "organization:read", capability: "organization:read" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().allowed).toBe(true);
  });

  it("denies an over-scoped action (capability not granted)", async () => {
    const { token } = await issueViaApi(["organization:read"]);
    const res = await app.inject({
      method: "POST",
      url: "/v1/agent/actions",
      headers: { "x-optimora-tenant": tenantA, "x-optimora-capability": token },
      payload: { action: "organization:update", capability: "organization:update" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().allowed).toBe(false);
  });

  it("denies a malformed token (fail closed)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/agent/actions",
      headers: { "x-optimora-tenant": tenantA, "x-optimora-capability": "not-a-real-token" },
      payload: { action: "organization:read", capability: "organization:read" },
    });
    // Invalid/expired credentials -> 401 (sanitized explanation), see T-2.9.
    expect(res.statusCode).toBe(401);
    expect(res.json().allowed).toBe(false);
  });

  it("denies cross-tenant use of a token", async () => {
    const { token } = await issueViaApi(["organization:read"]);
    const res = await app.inject({
      method: "POST",
      url: "/v1/agent/actions",
      headers: { "x-optimora-tenant": tenantB, "x-optimora-capability": token }, // resolved tenant B
      payload: { action: "organization:read", capability: "organization:read" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().allowed).toBe(false);
    // Raw reason (cross_tenant_capability) is in the audit trail, not the response.
    expect(JSON.stringify(res.json())).not.toContain("tenant");
  });

  it("denies a revoked token", async () => {
    const { token, jti } = await issueViaApi(["organization:read"]);
    const rev = await app.inject({
      method: "POST",
      url: `/v1/capability-tokens/${jti}/revoke`,
      headers: admin(),
    });
    expect(rev.statusCode).toBe(200);
    const res = await app.inject({
      method: "POST",
      url: "/v1/agent/actions",
      headers: { "x-optimora-tenant": tenantA, "x-optimora-capability": token },
      payload: { action: "organization:read", capability: "organization:read" },
    });
    // Revoked -> invalid credentials -> 401.
    expect(res.statusCode).toBe(401);
  });

  it("denies an expired grant (verification fails closed)", async () => {
    // Issue via the service, then expire the grant deterministically.
    const issued = await withTenantContext(getPrisma(), { tenantId: tenantA, orgId: orgA }, (tx) =>
      issueCapability(tx, SECRET, {
        agentId,
        tenantId: tenantA,
        orgId: orgA,
        scopes: ["organization:read"],
      }),
    );
    await sys.capabilityGrant.update({
      where: { id: issued.jti },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const claims = await withTenantContext(getPrisma(), { tenantId: tenantA, orgId: orgA }, (tx) =>
      verifyCapability(tx, SECRET, issued.token),
    );
    expect(claims).toBeNull();
  });

  it("denies issuance without the capability:issue permission", async () => {
    // No auth token -> requirePermission returns 401.
    const res = await app.inject({
      method: "POST",
      url: `/v1/agents/${agentId}/capability-tokens`,
      headers: { "x-optimora-tenant": tenantA, "x-optimora-org": orgA },
      payload: { scopes: ["organization:read"] },
    });
    expect([401, 403]).toContain(res.statusCode);
  });
});

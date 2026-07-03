/**
 * Authorization audit + deny-explainer integration (T-2.9). A capturing sink is
 * injected into the gateway; we assert allowed/denied audit events, sanitized
 * deny explanations (no cross-tenant leak), and audit metadata correctness
 * across user, API-key, and agent principals.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext } from "@optimora/db";
import { authorizeWithAudit, type AuditSink, type AuthzAuditEvent } from "@optimora/auth-core";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../server.js";
import { issueAccessToken } from "../auth/tokens.js";
import { issueCapability } from "../auth/capability.js";
import { assignRole, seedSystemRoles } from "../rbac/service.js";

const SECRET = "test-secret-audit-0123456789abcdef01234567";
const sys = getSystemPrisma();

class CapturingSink implements AuditSink {
  events: AuthzAuditEvent[] = [];
  emit(e: AuthzAuditEvent): void {
    this.events.push(e);
  }
  byAction(action: string): AuthzAuditEvent[] {
    return this.events.filter((e) => e.action === action);
  }
}

const tenantA = randomUUID();
const orgA = randomUUID();
const tenantB = randomUUID();
const adminUser = randomUUID();
const normalUser = randomUUID();
const agentId = randomUUID();
let adminToken: string;
let normalToken: string;
let normalMembership: string;
let capabilityToken: string;
const sink = new CapturingSink();
let app: FastifyInstance;

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `aud-${tenantA}`, name: "Aud A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `aud-${tenantB}`, name: "Aud B" } });
  await sys.organization.create({
    data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" },
  });
  await sys.user.create({ data: { id: adminUser, email: `admin-${adminUser}@x.com` } });
  await sys.user.create({ data: { id: normalUser, email: `user-${normalUser}@x.com` } });
  const am = await sys.membership.create({
    data: { userId: adminUser, organizationId: orgA, role: "admin" },
  });
  const nm = await sys.membership.create({
    data: { userId: normalUser, organizationId: orgA, role: "member" },
  });
  normalMembership = nm.id;
  const { adminRoleId, memberRoleId } = await seedSystemRoles(sys, tenantA, orgA);
  await assignRole(sys, tenantA, am.id, adminRoleId);
  await assignRole(sys, tenantA, nm.id, memberRoleId);

  adminToken = await issueAccessToken(SECRET, {
    sub: adminUser,
    email: "a@x.com",
    tenantId: tenantA,
  });
  normalToken = await issueAccessToken(SECRET, {
    sub: normalUser,
    email: "u@x.com",
    tenantId: tenantA,
  });

  const issued = await withTenantContext(getPrisma(), { tenantId: tenantA, orgId: orgA }, (tx) =>
    issueCapability(tx, SECRET, {
      agentId,
      tenantId: tenantA,
      orgId: orgA,
      scopes: ["organization:read"],
    }),
  );
  capabilityToken = issued.token;

  app = buildServer({ authSecret: SECRET, auditSink: sink });
  await app.ready();
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await app.close();
  await sys.$disconnect();
});

const adminH = () => ({
  authorization: `Bearer ${adminToken}`,
  "x-optimora-tenant": tenantA,
  "x-optimora-org": orgA,
});
const normalH = () => ({
  authorization: `Bearer ${normalToken}`,
  "x-optimora-tenant": tenantA,
  "x-optimora-org": orgA,
});

describe("authorization audit + deny explainer", () => {
  it("emits an ALLOW audit event for an authorized user action", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/roles", headers: adminH() });
    expect(res.statusCode).toBe(200);
    const allow = sink.byAction("role:read").find((e) => e.effect === "allow");
    expect(allow).toBeTruthy();
    expect(allow).toMatchObject({
      type: "authz.decision",
      principalType: "user",
      tenantId: tenantA,
      orgId: orgA,
    });
  });

  it("emits a DENY audit event and returns a safe explanation (user)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/v1/memberships/${normalMembership}/roles`,
      headers: normalH(),
      payload: { roleId: randomUUID() },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: "forbidden" });
    expect(res.json().message).toMatch(/permission/i);
    expect(res.json()).not.toHaveProperty("reasons"); // raw reasons not leaked

    const deny = sink.byAction("role:assign").find((e) => e.effect === "deny");
    expect(deny?.denyReasons).toContain("no_matching_permit"); // raw reason kept in audit
  });

  it("does not leak cross-tenant existence in the explanation (agent)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/agent/actions",
      headers: { "x-optimora-tenant": tenantB, "x-optimora-capability": capabilityToken },
      payload: { action: "organization:read", capability: "organization:read" },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.stringify(res.json())).not.toContain("tenant");
    const deny = sink.events.find(
      (e) => e.principalType === "agent" && e.denyReasons.includes("cross_tenant_capability"),
    );
    expect(deny).toBeTruthy(); // raw cross-tenant reason recorded in audit only
  });

  it("emits a DENY audit for an over-scoped agent capability action", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/agent/actions",
      headers: { "x-optimora-tenant": tenantA, "x-optimora-capability": capabilityToken },
      payload: { action: "organization:update", capability: "organization:update" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().message).toMatch(/agent/i);
    const deny = sink
      .byAction("organization:update")
      .find((e) => e.principalType === "agent" && e.effect === "deny");
    expect(deny).toBeTruthy();
  });

  it("emits a DENY audit for an API-key scope denial (principal coverage)", async () => {
    const keySink = new CapturingSink();
    const res = await authorizeWithAudit(
      {
        principal: {
          type: "api_key",
          id: randomUUID(),
          tenantId: tenantA,
          orgId: orgA,
          scopes: ["api_key:read"],
        },
        action: "api_key:create",
        resource: { type: "api_key", id: orgA, tenantId: tenantA, orgId: orgA },
        context: { requiredPermission: "api_key:create" },
      },
      { sink: keySink, requestId: "req-key" },
    );
    expect(res.decision.allowed).toBe(false);
    expect(res.explanation.message).toMatch(/API key/i);
    expect(keySink.events[0]).toMatchObject({ principalType: "api_key", effect: "deny" });
  });

  it("audit events carry the full required metadata", async () => {
    const deny = sink.byAction("role:assign").find((e) => e.effect === "deny");
    expect(deny).toBeTruthy();
    expect(deny).toMatchObject({
      type: "authz.decision",
      principalType: "user",
      tenantId: tenantA,
      orgId: orgA,
      action: "role:assign",
      resourceType: "role",
      effect: "deny",
      engine: "cedar",
      policyVersion: expect.stringContaining("optimora-base"),
    });
    expect(typeof deny!.resourceId).toBe("string");
    expect(typeof deny!.timestamp).toBe("string");
    expect(typeof deny!.requestId).toBe("string");
    expect(Array.isArray(deny!.denyReasons)).toBe(true);
  });
});

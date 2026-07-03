/**
 * RBAC integration test (T-2.6) — create/update/assign/remove roles via the admin
 * API, prove unauthorized + cross-tenant assignments are denied, and verify the
 * Policy Engine authorizes using the real persisted RBAC data. Requires the dev
 * stack + migrations.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext } from "@optimora/db";
import { authorize } from "@optimora/auth-core";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../server.js";
import { issueAccessToken } from "../auth/tokens.js";
import { assignRole, buildUserPrincipal, seedSystemRoles } from "./service.js";

const SECRET = "test-secret-rbac-0123456789abcdef0123456789";
const sys = getSystemPrisma();

const tenantA = randomUUID();
const orgA = randomUUID();
const tenantB = randomUUID();
const orgB = randomUUID();
const adminUser = randomUUID();
const normalUser = randomUUID();
let adminMembership: string;
let normalMembership: string;
let adminToken: string;
let normalToken: string;
let app: FastifyInstance;

const headers = (token: string, tenant = tenantA, org = orgA) => ({
  authorization: `Bearer ${token}`,
  "x-optimora-tenant": tenant,
  "x-optimora-org": org,
});

beforeAll(async () => {
  // Tenants / orgs / users / memberships.
  await sys.tenant.create({ data: { id: tenantA, slug: `rbac-${tenantA}`, name: "RBAC A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `rbac-${tenantB}`, name: "RBAC B" } });
  await sys.organization.create({
    data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" },
  });
  await sys.organization.create({
    data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" },
  });
  await sys.user.create({ data: { id: adminUser, email: `admin-${adminUser}@x.com` } });
  await sys.user.create({ data: { id: normalUser, email: `user-${normalUser}@x.com` } });
  const am = await sys.membership.create({
    data: { userId: adminUser, organizationId: orgA, role: "admin" },
  });
  const nm = await sys.membership.create({
    data: { userId: normalUser, organizationId: orgA, role: "member" },
  });
  adminMembership = am.id;
  normalMembership = nm.id;

  // Seed system roles and assign: admin -> org_admin, normal -> org_member.
  const { adminRoleId, memberRoleId } = await seedSystemRoles(sys, tenantA, orgA);
  await assignRole(sys, tenantA, adminMembership, adminRoleId);
  await assignRole(sys, tenantA, normalMembership, memberRoleId);

  adminToken = await issueAccessToken(SECRET, {
    sub: adminUser,
    email: "admin@x.com",
    tenantId: tenantA,
  });
  normalToken = await issueAccessToken(SECRET, {
    sub: normalUser,
    email: "user@x.com",
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

/** Authorize an action for a user using their real persisted RBAC data. */
async function userCan(userId: string, permission: string): Promise<boolean> {
  const principal = await withTenantContext(getPrisma(), { tenantId: tenantA, orgId: orgA }, (tx) =>
    buildUserPrincipal(tx, userId, orgA, tenantA),
  );
  return authorize({
    principal,
    action: permission,
    resource: { type: "organization", id: orgA, tenantId: tenantA, orgId: orgA },
    context: { requiredPermission: permission },
  }).allowed;
}

describe("RBAC admin + policy integration", () => {
  let marketingRoleId: string;

  it("an admin creates a custom role", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/roles",
      headers: headers(adminToken),
      payload: {
        key: "marketing",
        name: "Marketing",
        permissions: ["organization:update", "role:read"],
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    marketingRoleId = body.id;
    expect(body.permissions).toContain("organization:update");
  });

  it("an admin updates the role", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/roles/${marketingRoleId}`,
      headers: headers(adminToken),
      payload: { name: "Marketing v2" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Marketing v2");
  });

  it("denies a non-admin (no role:assign) from assigning roles", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/v1/memberships/${normalMembership}/roles`,
      headers: headers(normalToken),
      payload: { roleId: marketingRoleId },
    });
    expect(res.statusCode).toBe(403);
  });

  it("policy uses real RBAC data: normal user cannot update before assignment", async () => {
    expect(await userCan(normalUser, "organization:update")).toBe(false);
  });

  it("an admin assigns the role, and the policy now allows the action", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/v1/memberships/${normalMembership}/roles`,
      headers: headers(adminToken),
      payload: { roleId: marketingRoleId },
    });
    expect(res.statusCode).toBe(201);
    expect(await userCan(normalUser, "organization:update")).toBe(true);
  });

  it("removing the role revokes the capability", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/v1/memberships/${normalMembership}/roles/${marketingRoleId}`,
      headers: headers(adminToken),
    });
    expect(res.statusCode).toBe(200);
    expect(await userCan(normalUser, "organization:update")).toBe(false);
  });

  it("denies cross-tenant: an admin token for tenant A cannot act as tenant B", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/roles",
      headers: headers(adminToken, tenantB, orgB), // resolved tenant B, token tenant A
    });
    expect(res.statusCode).toBe(401);
  });

  it("denies system role mutation", async () => {
    const roles = await app.inject({
      method: "GET",
      url: "/v1/roles",
      headers: headers(adminToken),
    });
    const orgAdmin = roles.json().roles.find((r: { key: string }) => r.key === "org_admin");
    const res = await app.inject({
      method: "DELETE",
      url: `/v1/roles/${orgAdmin.id}`,
      headers: headers(adminToken),
    });
    expect(res.statusCode).toBe(409);
  });
});

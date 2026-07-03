/**
 * Policy Engine integration test (T-2.5) — exercises the REAL Cedar WASM engine
 * end-to-end through the generic authorize() API. Covers the required cases:
 * allowed, denied, cross-tenant denied, missing-context denied, API-key scope
 * denied — plus audit metadata and agent-principal extensibility.
 */
import { describe, it, expect } from "vitest";
import { authorize } from "./authorize.js";
import { CedarPolicyProvider } from "./cedar-provider.js";
import type { AuthorizeRequest } from "./types.js";

const provider = new CedarPolicyProvider();
const auth = (req: AuthorizeRequest) => authorize(req, provider);

const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";
const ORG_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const orgResource = (tenantId: string) => ({
  type: "organization",
  id: "res-1",
  tenantId,
  orgId: ORG_A,
});

describe("Cedar Policy Engine", () => {
  it("ALLOWS an org_admin acting within its tenant (RBAC)", () => {
    const d = auth({
      principal: {
        type: "user",
        id: "u-admin",
        tenantId: TENANT_A,
        orgId: ORG_A,
        roles: ["org_admin"],
      },
      action: "organization:update",
      resource: orgResource(TENANT_A),
    });
    expect(d.allowed).toBe(true);
    expect(d.determiningPolicies.length).toBeGreaterThan(0);
  });

  it("DENIES an org_member performing a write action (RBAC, no matching permit)", () => {
    const d = auth({
      principal: {
        type: "user",
        id: "u-member",
        tenantId: TENANT_A,
        orgId: ORG_A,
        roles: ["org_member"],
      },
      action: "organization:update",
      resource: orgResource(TENANT_A),
    });
    expect(d.allowed).toBe(false);
    expect(d.reasons).toContain("no_matching_permit");
  });

  it("ALLOWS an org_member performing a read action", () => {
    const d = auth({
      principal: {
        type: "user",
        id: "u-member",
        tenantId: TENANT_A,
        orgId: ORG_A,
        roles: ["org_member"],
      },
      action: "organization:read",
      resource: orgResource(TENANT_A),
    });
    expect(d.allowed).toBe(true);
  });

  it("DENIES cross-tenant access even for an admin (ABAC/ReBAC tenant isolation)", () => {
    const d = auth({
      principal: {
        type: "user",
        id: "u-admin",
        tenantId: TENANT_A,
        orgId: ORG_A,
        roles: ["org_admin"],
      },
      action: "organization:read",
      resource: orgResource(TENANT_B), // resource in a different tenant
    });
    expect(d.allowed).toBe(false);
  });

  it("DENIES on missing context (principal with no roles -> no permit)", () => {
    const d = auth({
      principal: { type: "user", id: "u-none", tenantId: TENANT_A, orgId: ORG_A, roles: [] },
      action: "organization:read",
      resource: orgResource(TENANT_A),
    });
    expect(d.allowed).toBe(false);
  });

  it("ALLOWS an API key that holds the required scope (ABAC)", () => {
    const d = auth({
      principal: {
        type: "api_key",
        id: "k1",
        tenantId: TENANT_A,
        orgId: ORG_A,
        scopes: ["api_key:create"],
      },
      action: "api_key:create",
      resource: orgResource(TENANT_A),
      context: { requiredScope: "api_key:create" },
    });
    expect(d.allowed).toBe(true);
  });

  it("DENIES an API key lacking the required scope", () => {
    const d = auth({
      principal: { type: "api_key", id: "k2", tenantId: TENANT_A, orgId: ORG_A, scopes: ["read"] },
      action: "api_key:create",
      resource: orgResource(TENANT_A),
      context: { requiredScope: "api_key:create" },
    });
    expect(d.allowed).toBe(false);
  });

  it("supports agent principals (extensible for T-2.8)", () => {
    const d = auth({
      principal: {
        type: "agent",
        id: "agent-1",
        tenantId: TENANT_A,
        orgId: ORG_A,
        roles: ["agent_operator"],
        scopes: [],
      },
      action: "organization:read",
      resource: orgResource(TENANT_A),
    });
    expect(d.allowed).toBe(true);
  });

  it("ALLOWS via persisted role permissions (data-driven RBAC)", () => {
    const d = auth({
      principal: {
        type: "user",
        id: "u-custom",
        tenantId: TENANT_A,
        orgId: ORG_A,
        roles: ["custom_marketing"],
        permissions: ["organization:update"],
      },
      action: "organization:update",
      resource: orgResource(TENANT_A),
      context: { requiredPermission: "organization:update" },
    });
    expect(d.allowed).toBe(true);
  });

  it("DENIES when the required permission is not in the principal's effective set", () => {
    const d = auth({
      principal: {
        type: "user",
        id: "u-custom",
        tenantId: TENANT_A,
        orgId: ORG_A,
        roles: ["custom_marketing"],
        permissions: ["organization:read"],
      },
      action: "organization:update",
      resource: orgResource(TENANT_A),
      context: { requiredPermission: "organization:update" },
    });
    expect(d.allowed).toBe(false);
  });

  it("DENIES cross-tenant even with the right permission", () => {
    const d = auth({
      principal: {
        type: "user",
        id: "u-custom",
        tenantId: TENANT_A,
        orgId: ORG_A,
        roles: ["custom_marketing"],
        permissions: ["organization:update"],
      },
      action: "organization:update",
      resource: orgResource(TENANT_B),
      context: { requiredPermission: "organization:update" },
    });
    expect(d.allowed).toBe(false);
  });

  it("emits audit-ready metadata on every decision", () => {
    const d = auth({
      principal: { type: "user", id: "u1", tenantId: TENANT_A, roles: ["org_admin"] },
      action: "organization:read",
      resource: orgResource(TENANT_A),
    });
    expect(d.metadata.engine).toMatch(/^cedar:/);
    expect(d.metadata).toMatchObject({
      principalId: "u1",
      principalType: "user",
      action: "organization:read",
    });
  });
});

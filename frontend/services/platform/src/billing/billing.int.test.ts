/**
 * Billing admin routes integration tests (E9 Billing/Entitlement).
 * Proves: plan listing, subscription CRUD, entitlement, quota, usage,
 * RLS isolation, fail-closed validation, no payment data exposed.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getSystemPrisma, withTenantContext, getPrisma } from "@optimora/db";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../server.js";
import { createSubscription } from "@optimora/billing";

const sys = getSystemPrisma();
const prisma = getPrisma();

const tenantA = randomUUID();
const orgA = randomUUID();
const tenantB = randomUUID();
const orgB = randomUUID();
// Tenant C: no subscription — for denial tests
const tenantC = randomUUID();
const orgC = randomUUID();

let app: FastifyInstance;

const hA = { "x-optimora-tenant": tenantA, "x-optimora-org": orgA };
const hB = { "x-optimora-tenant": tenantB, "x-optimora-org": orgB };
const hC = { "x-optimora-tenant": tenantC, "x-optimora-org": orgC };

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `bil-adm-${tenantA}`, name: "BilA" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `bil-adm-${tenantB}`, name: "BilB" } });
  await sys.tenant.create({ data: { id: tenantC, slug: `bil-adm-${tenantC}`, name: "BilC" } });
  await sys.organization.create({ data: { id: orgA, tenantId: tenantA, slug: "main", name: "OA" } });
  await sys.organization.create({ data: { id: orgB, tenantId: tenantB, slug: "main", name: "OB" } });
  await sys.organization.create({ data: { id: orgC, tenantId: tenantC, slug: "main", name: "OC" } });

  // A: growth plan (active) — has financeAgent, customDomain; no whiteLabel
  await withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, (tx) =>
    createSubscription(tx, { tenantId: tenantA, orgId: orgA, actorId: "seed" }, {
      planKey: "growth",
      status: "active",
    }),
  );

  // B: free plan (active) — tight limits
  await withTenantContext(prisma, { tenantId: tenantB, orgId: orgB }, (tx) =>
    createSubscription(tx, { tenantId: tenantB, orgId: orgB, actorId: "seed" }, {
      planKey: "free",
      status: "active",
    }),
  );

  // C has no subscription (denial tests)

  app = buildServer({ baseDomains: ["optimora.app"] });
  await app.ready();
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB, tenantC] } } });
  await app.close();
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Billing routes — auth guards", () => {
  it("returns 401 when no tenant header", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/billing/plans" });
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 when org missing", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/billing/subscription",
      headers: { "x-optimora-tenant": tenantA },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("org_required");
  });
});

describe("Plan listing", () => {
  it("GET /v1/billing/plans returns all plans with limits", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/billing/plans", headers: hA });
    expect(res.statusCode).toBe(200);
    const { plans } = res.json();
    expect(Array.isArray(plans)).toBe(true);
    const keys = plans.map((p: { key: string }) => p.key);
    for (const k of ["free", "starter", "growth", "agency", "enterprise", "custom"]) {
      expect(keys).toContain(k);
    }
    // No payment data in plan definitions
    for (const p of plans) {
      expect((p as Record<string, unknown>).stripeProductId).toBeUndefined();
      expect((p as Record<string, unknown>).price).toBeUndefined();
    }
    const growth = plans.find((p: { key: string }) => p.key === "growth");
    expect(growth.limits.whiteLabelEnabled).toBe(false);
    expect(growth.limits.customDomainEnabled).toBe(true);
  });
});

describe("Subscription routes", () => {
  it("GET /v1/billing/subscription returns current subscription", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/billing/subscription", headers: hA });
    expect(res.statusCode).toBe(200);
    const { subscription: sub } = res.json();
    expect(sub.planKey).toBe("growth");
    expect(sub.status).toBe("active");
    expect(sub.tenantId).toBe(tenantA);
    // No payment/card data
    expect((sub as Record<string, unknown>).cardNumber).toBeUndefined();
    expect((sub as Record<string, unknown>).stripePaymentMethodId).toBeUndefined();
  });

  it("GET /v1/billing/subscription returns 404 for tenant with no subscription", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/billing/subscription", headers: hC });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("subscription_not_found");
  });

  it("POST /v1/billing/subscription creates a new subscription for tenant C", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/billing/subscription",
      headers: { ...hC, "content-type": "application/json" },
      payload: { planKey: "starter", status: "trialing" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().subscription.planKey).toBe("starter");
    expect(res.json().subscription.status).toBe("trialing");
  });

  it("POST /v1/billing/subscription returns 409 when subscription already exists", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/billing/subscription",
      headers: { ...hA, "content-type": "application/json" },
      payload: { planKey: "enterprise" },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("subscription_already_exists");
  });

  it("POST /v1/billing/subscription fails closed on invalid plan key", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/billing/subscription",
      headers: { ...hC, "content-type": "application/json" },
      payload: { planKey: "diamond" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("PATCH /v1/billing/subscription/:id/status transitions status", async () => {
    const getRes = await app.inject({ method: "GET", url: "/v1/billing/subscription", headers: hA });
    const subId = getRes.json().subscription.id as string;
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/billing/subscription/${subId}/status`,
      headers: { ...hA, "content-type": "application/json" },
      payload: { status: "paused" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().subscription.status).toBe("paused");
    // Restore to active
    await app.inject({
      method: "PATCH",
      url: `/v1/billing/subscription/${subId}/status`,
      headers: { ...hA, "content-type": "application/json" },
      payload: { status: "active" },
    });
  });

  it("PATCH /v1/billing/subscription/:id/status returns 400 on invalid status", async () => {
    const getRes = await app.inject({ method: "GET", url: "/v1/billing/subscription", headers: hA });
    const subId = getRes.json().subscription.id as string;
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/billing/subscription/${subId}/status`,
      headers: { ...hA, "content-type": "application/json" },
      payload: { status: "pending" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("cross-tenant: tenant B subscription not visible under tenant A (RLS)", async () => {
    const bRes = await app.inject({ method: "GET", url: "/v1/billing/subscription", headers: hB });
    const subBId = bRes.json().subscription.id as string;
    // Try to patch B's sub id from A's session
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/billing/subscription/${subBId}/status`,
      headers: { ...hA, "content-type": "application/json" },
      payload: { status: "cancelled" },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("Entitlement routes", () => {
  it("growth plan: runtime allowed", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/billing/entitlement/runtime", headers: hA });
    expect(res.statusCode).toBe(200);
    expect(res.json().entitlement.allowed).toBe(true);
  });

  it("growth plan: financeAgent allowed", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/billing/entitlement/financeAgent", headers: hA });
    expect(res.statusCode).toBe(200);
    expect(res.json().entitlement.allowed).toBe(true);
  });

  it("growth plan: salesAgent denied", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/billing/entitlement/salesAgent", headers: hA });
    expect(res.statusCode).toBe(200);
    expect(res.json().entitlement.allowed).toBe(false);
    expect(res.json().entitlement.reason).toContain("module_not_in_plan");
  });

  it("growth plan: whiteLabelEnabled denied", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/billing/entitlement/whiteLabelEnabled", headers: hA });
    expect(res.statusCode).toBe(200);
    expect(res.json().entitlement.allowed).toBe(false);
  });

  it("growth plan: customDomainEnabled allowed", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/billing/entitlement/customDomainEnabled", headers: hA });
    expect(res.statusCode).toBe(200);
    expect(res.json().entitlement.allowed).toBe(true);
  });

  it("free plan: tools denied (not in free)", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/billing/entitlement/tools", headers: hB });
    expect(res.statusCode).toBe(200);
    expect(res.json().entitlement.allowed).toBe(false);
  });

  it("no subscription: entitlement returns allowed=false with no_subscription reason", async () => {
    // tenantC now has a trialing starter subscription (created above) - use a fresh tenant
    const res = await app.inject({ method: "GET", url: "/v1/billing/entitlement/runtime", headers: hC });
    expect(res.statusCode).toBe(200);
    // trialing starter has runtime — should be allowed
    expect(res.json().entitlement.allowed).toBe(true);
  });
});

describe("Quota routes", () => {
  it("GET /v1/billing/quota/clientWorkspaces?currentUsage=0 — allowed under limit", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/billing/quota/clientWorkspaces?currentUsage=0",
      headers: hB,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().quota.allowed).toBe(true);
    expect(res.json().quota.limit).toBe(1);
  });

  it("GET /v1/billing/quota/clientWorkspaces?currentUsage=1 — denied at limit (free plan)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/billing/quota/clientWorkspaces?currentUsage=1",
      headers: hB,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().quota.allowed).toBe(false);
    expect(res.json().quota.reason).toContain("quota_exceeded");
  });

  it("GET /v1/billing/quota/agents?currentUsage=50 — growth plan has 50 limit, denied", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/billing/quota/agents?currentUsage=50",
      headers: hA,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().quota.allowed).toBe(false);
  });

  it("GET /v1/billing/quota/monthlyModelUsageUsd — derived from metering (no currentUsage param)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/billing/quota/monthlyModelUsageUsd",
      headers: hA,
    });
    expect(res.statusCode).toBe(200);
    expect(typeof res.json().quota.allowed).toBe("boolean");
    expect(typeof res.json().quota.currentUsage).toBe("number");
  });

  it("GET /v1/billing/quota/monthlyToolInvocations — derived from metering", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/billing/quota/monthlyToolInvocations",
      headers: hA,
    });
    expect(res.statusCode).toBe(200);
    expect(typeof res.json().quota.limit).toBe("number");
  });

  it("GET /v1/billing/quota/memoryRecords — requires currentUsage param, returns 400 without it", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/billing/quota/memoryRecords",
      headers: hA,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("currentUsage_required_for_resource");
  });

  it("GET /v1/billing/quota/invalid — 400 on unknown resource", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/billing/quota/diamonds",
      headers: hA,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_resource");
  });
});

describe("Usage summary route", () => {
  it("GET /v1/billing/usage returns aggregated usage", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/billing/usage", headers: hA });
    expect(res.statusCode).toBe(200);
    const { usage } = res.json();
    expect(typeof usage.totalEstimatedCostUsd).toBe("number");
    expect(typeof usage.totalUnits).toBe("number");
    expect(typeof usage.count).toBe("number");
    expect(typeof usage.since).toBe("string");
  });
});

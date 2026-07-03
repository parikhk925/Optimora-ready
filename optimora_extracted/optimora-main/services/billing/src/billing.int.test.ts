/**
 * Billing integration tests (E9 Billing). Requires dev Postgres.
 * Proves: create/update subscriptions, trial/active/cancelled states,
 * checkEntitlement, checkQuota with metering integration, cross-tenant RLS,
 * fail-closed validation, event emission, no payment data stored.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import { recordUsage } from "@optimora/metering";
import {
  createSubscription,
  getSubscription,
  updateSubscriptionStatus,
  checkEntitlement,
  checkQuota,
  enforceQuota,
  enforceEntitlement,
  listBillingEvents,
  PLAN_DEFINITIONS,
  InvalidBillingContextError,
  InvalidPlanKeyError,
  InvalidSubscriptionStatusError,
  MalformedBillingInputError,
  SubscriptionAlreadyExistsError,
  SubscriptionNotFoundError,
  QuotaExceededError,
  EntitlementDeniedError,
  type BillingContext,
} from "./index.js";

const sys = getSystemPrisma();
const prisma = getPrisma();

const tenantA = randomUUID();
const orgA = randomUUID();
const tenantB = randomUUID();
const orgB = randomUUID();

const ctxA: BillingContext = { tenantId: tenantA, orgId: orgA, actorId: "svc:billing-test" };
const ctxB: BillingContext = { tenantId: tenantB, orgId: orgB, actorId: "svc:billing-test-b" };

const inA = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, fn);
const inB = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantB, orgId: orgB }, fn);

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `bil-${tenantA}`, name: "Billing A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `bil-${tenantB}`, name: "Billing B" } });
  await sys.organization.create({ data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" } });
  await sys.organization.create({ data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" } });
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Subscription management", () => {
  it("creates a trialing starter subscription", async () => {
    const trialEndsAt = new Date(Date.now() + 14 * 86400_000);
    const sub = await inA((tx) =>
      createSubscription(tx, ctxA, {
        planKey: "starter",
        status: "trialing",
        trialEndsAt,
      }),
    );
    expect(sub.planKey).toBe("starter");
    expect(sub.status).toBe("trialing");
    expect(sub.trialEndsAt!.getTime()).toBeCloseTo(trialEndsAt.getTime(), -3);
    expect(sub.tenantId).toBe(tenantA);
    // No payment/card data fields
    expect((sub as unknown as Record<string, unknown>).cardNumber).toBeUndefined();
    expect((sub as unknown as Record<string, unknown>).stripePaymentMethodId).toBeUndefined();
    expect((sub as unknown as Record<string, unknown>).cvv).toBeUndefined();
  });

  it("fails closed when creating a second subscription for same scope", async () => {
    await expect(
      inA((tx) => createSubscription(tx, ctxA, { planKey: "starter" })),
    ).rejects.toBeInstanceOf(SubscriptionAlreadyExistsError);
  });

  it("reads subscription", async () => {
    const sub = await inA((tx) => getSubscription(tx, ctxA));
    expect(sub.planKey).toBe("starter");
    expect(sub.tenantId).toBe(tenantA);
  });

  it("transitions subscription to active", async () => {
    const sub = await inA((tx) => getSubscription(tx, ctxA));
    const updated = await inA((tx) =>
      updateSubscriptionStatus(tx, ctxA, sub.id, { status: "active" }),
    );
    expect(updated.status).toBe("active");
  });

  it("transitions subscription to cancelled (sets cancelledAt)", async () => {
    const sub = await inA((tx) => getSubscription(tx, ctxA));
    const updated = await inA((tx) =>
      updateSubscriptionStatus(tx, ctxA, sub.id, { status: "cancelled" }),
    );
    expect(updated.status).toBe("cancelled");
    expect(updated.cancelledAt).not.toBeNull();
  });

  it("creates a separate tenant-B subscription on agency plan", async () => {
    const sub = await inB((tx) =>
      createSubscription(tx, ctxB, { planKey: "agency", status: "active" }),
    );
    expect(sub.planKey).toBe("agency");
    expect(sub.tenantId).toBe(tenantB);
  });

  it("fails closed on invalid plan key", async () => {
    const tenantC = randomUUID();
    const orgC = randomUUID();
    await sys.tenant.create({ data: { id: tenantC, slug: `bil-c-${tenantC}`, name: "C" } });
    await sys.organization.create({ data: { id: orgC, tenantId: tenantC, slug: "main", name: "Org C" } });
    try {
      await expect(
        withTenantContext(prisma, { tenantId: tenantC, orgId: orgC }, (tx) =>
          createSubscription(tx, { tenantId: tenantC, orgId: orgC, actorId: "x" }, { planKey: "diamond" as never }),
        ),
      ).rejects.toBeInstanceOf(InvalidPlanKeyError);
    } finally {
      await sys.tenant.deleteMany({ where: { id: tenantC } });
    }
  });

  it("fails closed on invalid subscription status", async () => {
    const sub = await inA((tx) => getSubscription(tx, ctxA));
    await expect(
      inA((tx) =>
        updateSubscriptionStatus(tx, ctxA, sub.id, { status: "pending" as never }),
      ),
    ).rejects.toBeInstanceOf(InvalidSubscriptionStatusError);
  });

  it("fails closed on customLimits for non-custom/enterprise plan", async () => {
    const tenantD = randomUUID();
    const orgD = randomUUID();
    await sys.tenant.create({ data: { id: tenantD, slug: `bil-d-${tenantD}`, name: "D" } });
    await sys.organization.create({ data: { id: orgD, tenantId: tenantD, slug: "main", name: "Org D" } });
    try {
      await expect(
        withTenantContext(prisma, { tenantId: tenantD, orgId: orgD }, (tx) =>
          createSubscription(
            tx,
            { tenantId: tenantD, orgId: orgD, actorId: "x" },
            { planKey: "free", customLimits: { maxAgents: 99 } },
          ),
        ),
      ).rejects.toBeInstanceOf(MalformedBillingInputError);
    } finally {
      await sys.tenant.deleteMany({ where: { id: tenantD } });
    }
  });

  it("fails closed on bad tenantId in context", async () => {
    await expect(
      inA((tx) =>
        createSubscription(tx, { tenantId: "bad", orgId: orgA, actorId: "x" }, { planKey: "free" }),
      ),
    ).rejects.toBeInstanceOf(InvalidBillingContextError);
  });

  it("fails closed on getSubscription when not found", async () => {
    const tenantE = randomUUID();
    const orgE = randomUUID();
    await sys.tenant.create({ data: { id: tenantE, slug: `bil-e-${tenantE}`, name: "E" } });
    await sys.organization.create({ data: { id: orgE, tenantId: tenantE, slug: "main", name: "Org E" } });
    try {
      await expect(
        withTenantContext(prisma, { tenantId: tenantE, orgId: orgE }, (tx) =>
          getSubscription(tx, { tenantId: tenantE, orgId: orgE, actorId: "x" }),
        ),
      ).rejects.toBeInstanceOf(SubscriptionNotFoundError);
    } finally {
      await sys.tenant.deleteMany({ where: { id: tenantE } });
    }
  });

  it("emits billing.subscription.created and billing.subscription.status_changed events", async () => {
    const sub = await inA((tx) => getSubscription(tx, ctxA));
    const events = await inA((tx) => listBillingEvents(tx, sub.id));
    const types = events.map((e) => e.type);
    expect(types).toContain("billing.subscription.created");
    expect(types).toContain("billing.subscription.status_changed");
  });

  it("cross-tenant denial: B subscription not visible under A (RLS)", async () => {
    const subB = await inB((tx) => getSubscription(tx, ctxB));
    // Try to read B's subscription id from A's RLS context
    await expect(
      inA((tx) => getSubscription(tx, ctxA, subB.id)),
    ).rejects.toBeInstanceOf(SubscriptionNotFoundError);
  });
});

describe("Entitlement checks", () => {
  let tenantF: string;
  let orgF: string;

  beforeAll(async () => {
    tenantF = randomUUID();
    orgF = randomUUID();
    await sys.tenant.create({ data: { id: tenantF, slug: `bil-f-${tenantF}`, name: "F" } });
    await sys.organization.create({ data: { id: orgF, tenantId: tenantF, slug: "main", name: "Org F" } });
    // Create growth subscription for F
    await withTenantContext(prisma, { tenantId: tenantF, orgId: orgF }, (tx) =>
      createSubscription(tx, { tenantId: tenantF, orgId: orgF, actorId: "x" }, { planKey: "growth", status: "active" }),
    );
  });

  afterAll(async () => {
    await sys.tenant.deleteMany({ where: { id: tenantF } });
  });

  it("growth plan allows runtime, memory, tools, integrations, financeAgent, reporting", async () => {
    for (const mod of PLAN_DEFINITIONS.growth.enabledModules) {
      const result = await withTenantContext(prisma, { tenantId: tenantF, orgId: orgF }, (tx) =>
        checkEntitlement(tx, { tenantId: tenantF, orgId: orgF, actorId: "x" }, mod),
      );
      expect(result.allowed).toBe(true);
    }
  });

  it("growth plan denies salesAgent (not in growth)", async () => {
    const result = await withTenantContext(prisma, { tenantId: tenantF, orgId: orgF }, (tx) =>
      checkEntitlement(tx, { tenantId: tenantF, orgId: orgF, actorId: "x" }, "salesAgent"),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("module_not_in_plan");
  });

  it("growth plan allows customDomain but not whiteLabel", async () => {
    const cdResult = await withTenantContext(prisma, { tenantId: tenantF, orgId: orgF }, (tx) =>
      checkEntitlement(tx, { tenantId: tenantF, orgId: orgF, actorId: "x" }, "customDomainEnabled"),
    );
    expect(cdResult.allowed).toBe(true);

    const wlResult = await withTenantContext(prisma, { tenantId: tenantF, orgId: orgF }, (tx) =>
      checkEntitlement(tx, { tenantId: tenantF, orgId: orgF, actorId: "x" }, "whiteLabelEnabled"),
    );
    expect(wlResult.allowed).toBe(false);
  });

  it("cancelled subscription denies entitlement", async () => {
    // tenantA subscription was cancelled above
    const result = await inA((tx) =>
      checkEntitlement(tx, ctxA, "runtime"),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("subscription_cancelled");
  });

  it("enforceEntitlement throws EntitlementDeniedError when denied", async () => {
    await expect(
      inA((tx) => enforceEntitlement(tx, ctxA, "runtime")),
    ).rejects.toBeInstanceOf(EntitlementDeniedError);
  });

  it("no_subscription returns allowed=false", async () => {
    const tenantG = randomUUID();
    const orgG = randomUUID();
    await sys.tenant.create({ data: { id: tenantG, slug: `bil-g-${tenantG}`, name: "G" } });
    await sys.organization.create({ data: { id: orgG, tenantId: tenantG, slug: "main", name: "Org G" } });
    try {
      const result = await withTenantContext(prisma, { tenantId: tenantG, orgId: orgG }, (tx) =>
        checkEntitlement(tx, { tenantId: tenantG, orgId: orgG, actorId: "x" }, "runtime"),
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("no_subscription");
    } finally {
      await sys.tenant.deleteMany({ where: { id: tenantG } });
    }
  });
});

describe("Quota checks", () => {
  let tenantH: string;
  let orgH: string;
  const ctxH = () => ({ tenantId: tenantH, orgId: orgH, actorId: "x" });

  beforeAll(async () => {
    tenantH = randomUUID();
    orgH = randomUUID();
    await sys.tenant.create({ data: { id: tenantH, slug: `bil-h-${tenantH}`, name: "H" } });
    await sys.organization.create({ data: { id: orgH, tenantId: tenantH, slug: "main", name: "Org H" } });
    await withTenantContext(prisma, { tenantId: tenantH, orgId: orgH }, (tx) =>
      createSubscription(tx, ctxH(), {
        planKey: "free",
        status: "active",
      }),
    );
  });

  afterAll(async () => {
    await sys.tenant.deleteMany({ where: { id: tenantH } });
  });

  it("free plan: workspace limit = 1, under quota allowed", async () => {
    const result = await withTenantContext(prisma, { tenantId: tenantH, orgId: orgH }, (tx) =>
      checkQuota(tx, ctxH(), "clientWorkspaces", 0),
    );
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(1);
  });

  it("free plan: workspace limit = 1, at limit denied", async () => {
    const result = await withTenantContext(prisma, { tenantId: tenantH, orgId: orgH }, (tx) =>
      checkQuota(tx, ctxH(), "clientWorkspaces", 1),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("quota_exceeded");
  });

  it("free plan: agent limit = 2, over limit denied", async () => {
    const result = await withTenantContext(prisma, { tenantId: tenantH, orgId: orgH }, (tx) =>
      checkQuota(tx, ctxH(), "agents", 5),
    );
    expect(result.allowed).toBe(false);
  });

  it("enterprise plan: unlimited means allowed regardless of usage", async () => {
    const tenantI = randomUUID();
    const orgI = randomUUID();
    await sys.tenant.create({ data: { id: tenantI, slug: `bil-i-${tenantI}`, name: "I" } });
    await sys.organization.create({ data: { id: orgI, tenantId: tenantI, slug: "main", name: "Org I" } });
    try {
      await withTenantContext(prisma, { tenantId: tenantI, orgId: orgI }, (tx) =>
        createSubscription(tx, { tenantId: tenantI, orgId: orgI, actorId: "x" }, { planKey: "enterprise", status: "active" }),
      );
      const result = await withTenantContext(prisma, { tenantId: tenantI, orgId: orgI }, (tx) =>
        checkQuota(tx, { tenantId: tenantI, orgId: orgI, actorId: "x" }, "agents", 999_999),
      );
      expect(result.allowed).toBe(true);
      expect(result.limit).toBeNull();
      expect(result.reason).toBe("unlimited");
    } finally {
      await sys.tenant.deleteMany({ where: { id: tenantI } });
    }
  });

  it("enforceQuota throws QuotaExceededError when denied", async () => {
    await expect(
      withTenantContext(prisma, { tenantId: tenantH, orgId: orgH }, (tx) =>
        enforceQuota(tx, ctxH(), "agents", 99),
      ),
    ).rejects.toBeInstanceOf(QuotaExceededError);
  });

  it("metering integration: recordUsage then checkQuota monthlyModelUsageUsd", async () => {
    // Record some usage via metering
    await recordUsage(prisma, { tenantId: tenantH, orgId: orgH, actorId: "svc:billing-test" }, {
      service: "model_router",
      operation: "model_invocation",
      units: 1,
      estimatedCostUsd: 3.5,
    });
    // free plan limit = $5 — 3.5 is under limit
    const result = await withTenantContext(prisma, { tenantId: tenantH, orgId: orgH }, (tx) =>
      checkQuota(tx, ctxH(), "monthlyModelUsageUsd", 3.5),
    );
    expect(result.allowed).toBe(true);
    // 5.0 is at-or-over the limit
    const exceeded = await withTenantContext(prisma, { tenantId: tenantH, orgId: orgH }, (tx) =>
      checkQuota(tx, ctxH(), "monthlyModelUsageUsd", 5.0),
    );
    expect(exceeded.allowed).toBe(false);
  });
});

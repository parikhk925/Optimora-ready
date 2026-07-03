/**
 * Billing / Plans / Entitlement admin routes.
 * All routes require resolved tenant context (global hook).
 * No payment/card data is accepted or returned.
 * Fail closed on missing subscription, expired/cancelled state, over-quota.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  checkEntitlement,
  checkQuota,
  createSubscription,
  getSubscription,
  updateSubscriptionStatus,
  PLAN_DEFINITIONS,
  PLAN_KEYS,
  InvalidPlanKeyError,
  InvalidSubscriptionStatusError,
  MalformedBillingInputError,
  SubscriptionAlreadyExistsError,
  SubscriptionNotFoundError,
  type BillingContext,
  type QuotaResource,
} from "@optimora/billing";
import { aggregateUsage } from "@optimora/metering";

function requireOrg(req: FastifyRequest, reply: FastifyReply): string | null {
  const ctx = req.tenantContext!;
  if (!ctx.orgId) {
    void reply.code(400).send({ error: "org_required" });
    return null;
  }
  return ctx.orgId;
}

/** Start of current calendar month (UTC) — used to bound monthly usage queries. */
function monthStart(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function registerBillingRoutes(app: FastifyInstance): void {

  // ---- Plans ----

  app.get("/v1/billing/plans", async (req, reply) => {
    if (!req.tenantContext) return reply.code(401).send({ error: "unauthorized" });
    const plans = PLAN_KEYS.map((key) => ({
      key,
      limits: PLAN_DEFINITIONS[key],
    }));
    return reply.send({ plans });
  });

  // ---- Subscription ----

  app.get("/v1/billing/subscription", async (req, reply) => {
    if (!req.tenantContext) return reply.code(401).send({ error: "unauthorized" });
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const ctx = req.tenantContext!;
    const billingCtx: BillingContext = { tenantId: ctx.tenantId, orgId, actorId: "admin" };
    try {
      const sub = await req.runScoped!((tx) => getSubscription(tx, billingCtx));
      return reply.send({ subscription: sub });
    } catch (err) {
      if (err instanceof SubscriptionNotFoundError) {
        return reply.code(404).send({ error: "subscription_not_found" });
      }
      throw err;
    }
  });

  app.post("/v1/billing/subscription", async (req, reply) => {
    if (!req.tenantContext) return reply.code(401).send({ error: "unauthorized" });
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const ctx = req.tenantContext!;
    const body = req.body as Record<string, unknown> | undefined;
    if (!body) return reply.code(400).send({ error: "body_required" });
    const billingCtx: BillingContext = { tenantId: ctx.tenantId, orgId, actorId: "admin" };
    try {
      const sub = await req.runScoped!((tx) =>
        createSubscription(tx, billingCtx, {
          planKey: body.planKey as never,
          status: (body.status as never) ?? "trialing",
          trialEndsAt: body.trialEndsAt ? new Date(body.trialEndsAt as string) : undefined,
          currentPeriodEnd: body.currentPeriodEnd ? new Date(body.currentPeriodEnd as string) : undefined,
          externalRef: typeof body.externalRef === "string" ? body.externalRef : undefined,
        }),
      );
      return reply.code(201).send({ subscription: sub });
    } catch (err) {
      if (err instanceof InvalidPlanKeyError || err instanceof InvalidSubscriptionStatusError || err instanceof MalformedBillingInputError) {
        return reply.code(400).send({ error: (err as Error).message });
      }
      if (err instanceof SubscriptionAlreadyExistsError) {
        return reply.code(409).send({ error: "subscription_already_exists" });
      }
      throw err;
    }
  });

  app.patch("/v1/billing/subscription/:id/status", async (req, reply) => {
    if (!req.tenantContext) return reply.code(401).send({ error: "unauthorized" });
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const ctx = req.tenantContext!;
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown> | undefined;
    if (!body?.status) return reply.code(400).send({ error: "status_required" });
    const billingCtx: BillingContext = { tenantId: ctx.tenantId, orgId, actorId: "admin" };
    try {
      const sub = await req.runScoped!((tx) =>
        updateSubscriptionStatus(tx, billingCtx, id, {
          status: body.status as never,
          cancelledAt: body.cancelledAt ? new Date(body.cancelledAt as string) : undefined,
        }),
      );
      return reply.send({ subscription: sub });
    } catch (err) {
      if (err instanceof InvalidSubscriptionStatusError) {
        return reply.code(400).send({ error: (err as Error).message });
      }
      if (err instanceof SubscriptionNotFoundError) {
        return reply.code(404).send({ error: "subscription_not_found" });
      }
      throw err;
    }
  });

  // ---- Entitlement ----

  app.get("/v1/billing/entitlement/:feature", async (req, reply) => {
    if (!req.tenantContext) return reply.code(401).send({ error: "unauthorized" });
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const ctx = req.tenantContext!;
    const { feature } = req.params as { feature: string };
    const billingCtx: BillingContext = { tenantId: ctx.tenantId, orgId, actorId: "admin" };
    const result = await req.runScoped!((tx) => checkEntitlement(tx, billingCtx, feature));
    return reply.send({ entitlement: result });
  });

  // ---- Quota ----

  /**
   * GET /v1/billing/quota/:resource?currentUsage=<number>
   * If currentUsage is omitted for metering-backed resources, we derive it from the usage table.
   */
  app.get("/v1/billing/quota/:resource", async (req, reply) => {
    if (!req.tenantContext) return reply.code(401).send({ error: "unauthorized" });
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const ctx = req.tenantContext!;
    const { resource } = req.params as { resource: string };
    const { currentUsage: rawUsage } = req.query as Record<string, string | undefined>;

    const VALID_RESOURCES: QuotaResource[] = [
      "clientWorkspaces", "agents", "monthlyTasks", "monthlyModelUsageUsd",
      "monthlyToolInvocations", "integrations", "memoryRecords", "seats",
    ];
    if (!VALID_RESOURCES.includes(resource as QuotaResource)) {
      return reply.code(400).send({ error: "invalid_resource" });
    }

    let currentUsage: number;

    if (rawUsage !== undefined) {
      currentUsage = Number(rawUsage);
      if (isNaN(currentUsage)) return reply.code(400).send({ error: "invalid_currentUsage" });
    } else if (resource === "monthlyModelUsageUsd") {
      // Derive from metering: sum cost since month start
      const agg = await req.runScoped!((tx) =>
        aggregateUsage(tx, { tenantId: ctx.tenantId, orgId, since: monthStart() }),
      );
      currentUsage = agg.totalEstimatedCostUsd;
    } else if (resource === "monthlyToolInvocations") {
      const agg = await req.runScoped!((tx) =>
        aggregateUsage(tx, { tenantId: ctx.tenantId, orgId, since: monthStart() }),
      );
      currentUsage = agg.count;
    } else {
      // Caller must provide currentUsage for non-metering resources
      return reply.code(400).send({ error: "currentUsage_required_for_resource" });
    }

    const billingCtx: BillingContext = { tenantId: ctx.tenantId, orgId, actorId: "admin" };
    const result = await req.runScoped!((tx) =>
      checkQuota(tx, billingCtx, resource as QuotaResource, currentUsage),
    );
    return reply.send({ quota: result });
  });

  // ---- Usage summary ----

  app.get("/v1/billing/usage", async (req, reply) => {
    if (!req.tenantContext) return reply.code(401).send({ error: "unauthorized" });
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const ctx = req.tenantContext!;
    const { since } = req.query as Record<string, string | undefined>;
    const sinceDate = since ? new Date(since) : monthStart();

    const agg = await req.runScoped!((tx) =>
      aggregateUsage(tx, { tenantId: ctx.tenantId, orgId, since: sinceDate }),
    );
    return reply.send({
      usage: {
        totalEstimatedCostUsd: agg.totalEstimatedCostUsd,
        totalUnits: agg.totalUnits,
        count: agg.count,
        since: sinceDate.toISOString(),
      },
    });
  });
}

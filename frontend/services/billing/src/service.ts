import type { TxClient } from "@optimora/db";
import { getPlanLimits } from "./plans.js";
import {
  createSubscriptionRecord,
  emitBillingEvent,
  getSubscriptionById,
  getSubscriptionRecord,
  listBillingEvents,
  updateSubscriptionRecord,
} from "./store.js";
import {
  ACTIVE_STATUSES,
  PLAN_KEYS,
  SUBSCRIPTION_STATUSES,
  type BillingContext,
  type CreateSubscriptionInput,
  type EntitlementCheckResult,
  type QuotaCheckResult,
  type QuotaResource,
  type SubscriptionView,
  type UpdateSubscriptionStatusInput,
  EntitlementDeniedError,
  InvalidBillingContextError,
  InvalidPlanKeyError,
  InvalidSubscriptionStatusError,
  MalformedBillingInputError,
  QuotaExceededError,
  SubscriptionAlreadyExistsError,
  SubscriptionNotFoundError,
} from "./types.js";

function validateContext(ctx: BillingContext): void {
  if (!ctx.tenantId || !/^[0-9a-f-]{36}$/.test(ctx.tenantId)) {
    throw new InvalidBillingContextError("Invalid tenantId in billing context.");
  }
}

function validatePlanKey(planKey: string): void {
  if (!(PLAN_KEYS as readonly string[]).includes(planKey)) {
    throw new InvalidPlanKeyError(`Unknown plan: ${planKey}. Valid: ${PLAN_KEYS.join(", ")}`);
  }
}

function validateStatus(status: string): void {
  if (!(SUBSCRIPTION_STATUSES as readonly string[]).includes(status)) {
    throw new InvalidSubscriptionStatusError(`Unknown status: ${status}. Valid: ${SUBSCRIPTION_STATUSES.join(", ")}`);
  }
}

// ---- Subscriptions ----

export async function createSubscription(
  tx: TxClient,
  ctx: BillingContext,
  input: CreateSubscriptionInput,
): Promise<SubscriptionView> {
  validateContext(ctx);
  validatePlanKey(input.planKey);
  const status = input.status ?? "trialing";
  validateStatus(status);

  if (input.customLimits && Object.keys(input.customLimits).length > 0 && input.planKey !== "custom" && input.planKey !== "enterprise") {
    throw new MalformedBillingInputError("customLimits are only allowed on 'custom' or 'enterprise' plans.");
  }

  const existing = await getSubscriptionRecord(tx, ctx.tenantId, ctx.orgId ?? null);
  if (existing) throw new SubscriptionAlreadyExistsError("A subscription already exists for this tenant/org scope.");

  const sub = await createSubscriptionRecord(tx, {
    tenantId: ctx.tenantId,
    orgId: ctx.orgId ?? null,
    planKey: input.planKey,
    status,
    trialEndsAt: input.trialEndsAt ?? null,
    currentPeriodStart: input.currentPeriodStart ?? new Date(),
    currentPeriodEnd: input.currentPeriodEnd ?? null,
    customLimits: input.customLimits ?? {},
    externalRef: input.externalRef ?? null,
  });

  await emitBillingEvent(tx, {
    tenantId: ctx.tenantId,
    subId: sub.id,
    type: "billing.subscription.created",
    payload: { actorId: ctx.actorId, planKey: sub.planKey, status: sub.status },
  });

  return sub;
}

export async function getSubscription(
  tx: TxClient,
  ctx: BillingContext,
  subId?: string,
): Promise<SubscriptionView> {
  validateContext(ctx);
  const sub = subId
    ? await getSubscriptionById(tx, subId)
    : await getSubscriptionRecord(tx, ctx.tenantId, ctx.orgId ?? null);
  if (!sub) throw new SubscriptionNotFoundError("No subscription found for this scope.");
  return sub;
}

export async function updateSubscriptionStatus(
  tx: TxClient,
  ctx: BillingContext,
  subId: string,
  input: UpdateSubscriptionStatusInput,
): Promise<SubscriptionView> {
  validateContext(ctx);
  validateStatus(input.status);

  const existing = await getSubscriptionById(tx, subId);
  if (!existing) throw new SubscriptionNotFoundError(`Subscription ${subId} not found.`);

  const updated = await updateSubscriptionRecord(tx, subId, {
    status: input.status,
    ...(input.cancelledAt !== undefined && { cancelledAt: input.cancelledAt }),
    ...(input.status === "cancelled" && !input.cancelledAt && { cancelledAt: new Date() }),
  });

  await emitBillingEvent(tx, {
    tenantId: ctx.tenantId,
    subId,
    type: "billing.subscription.status_changed",
    payload: { actorId: ctx.actorId, from: existing.status, to: input.status },
  });

  return updated;
}

// ---- Entitlement ----

/**
 * Checks whether a feature/module is enabled in the active subscription's plan.
 * Does NOT throw — returns structured result for caller to act on.
 */
export async function checkEntitlement(
  tx: TxClient,
  ctx: BillingContext,
  feature: string,
): Promise<EntitlementCheckResult> {
  validateContext(ctx);

  const sub = await getSubscriptionRecord(tx, ctx.tenantId, ctx.orgId ?? null);
  if (!sub) {
    return { allowed: false, feature, reason: "no_subscription" };
  }
  if (!ACTIVE_STATUSES.has(sub.status as never)) {
    return { allowed: false, feature, reason: `subscription_${sub.status}` };
  }

  const limits = getPlanLimits(sub.planKey, sub.customLimits);

  // Feature-specific checks
  if (feature === "whiteLabelEnabled") {
    return {
      allowed: limits.whiteLabelEnabled,
      feature,
      reason: limits.whiteLabelEnabled ? "allowed" : "plan_does_not_include_white_label",
    };
  }
  if (feature === "customDomainEnabled") {
    return {
      allowed: limits.customDomainEnabled,
      feature,
      reason: limits.customDomainEnabled ? "allowed" : "plan_does_not_include_custom_domain",
    };
  }

  // Module check
  const allowed = limits.enabledModules.includes(feature);
  return {
    allowed,
    feature,
    reason: allowed ? "allowed" : `module_not_in_plan_${sub.planKey}`,
  };
}

/**
 * Checks whether the current usage is within the plan's quota for a resource.
 * Does NOT throw — returns structured result.
 * Caller provides currentUsage (fetched from metering or count query).
 */
export async function checkQuota(
  tx: TxClient,
  ctx: BillingContext,
  resource: QuotaResource,
  currentUsage: number,
): Promise<QuotaCheckResult> {
  validateContext(ctx);

  const sub = await getSubscriptionRecord(tx, ctx.tenantId, ctx.orgId ?? null);
  if (!sub) {
    return { allowed: false, resource, limit: 0, currentUsage, reason: "no_subscription" };
  }
  if (!ACTIVE_STATUSES.has(sub.status as never)) {
    return { allowed: false, resource, limit: 0, currentUsage, reason: `subscription_${sub.status}` };
  }

  const limits = getPlanLimits(sub.planKey, sub.customLimits);
  const limitMap: Record<QuotaResource, number | null> = {
    clientWorkspaces: limits.maxClientWorkspaces,
    agents: limits.maxAgents,
    monthlyTasks: limits.maxMonthlyTasks,
    monthlyModelUsageUsd: limits.maxMonthlyModelUsageUsd,
    monthlyToolInvocations: limits.maxMonthlyToolInvocations,
    integrations: limits.maxIntegrations,
    memoryRecords: limits.maxMemoryRecords,
    seats: limits.maxSeats,
  };

  const limit = limitMap[resource];
  if (limit === null) {
    return { allowed: true, resource, limit: null, currentUsage, reason: "unlimited" };
  }
  const allowed = currentUsage < limit;
  return {
    allowed,
    limit,
    currentUsage,
    resource,
    reason: allowed ? "within_quota" : `quota_exceeded_${resource}`,
  };
}

/**
 * Like checkQuota but throws QuotaExceededError when denied.
 */
export async function enforceQuota(
  tx: TxClient,
  ctx: BillingContext,
  resource: QuotaResource,
  currentUsage: number,
): Promise<void> {
  const result = await checkQuota(tx, ctx, resource, currentUsage);
  if (!result.allowed) throw new QuotaExceededError(result.reason);
}

/**
 * Like checkEntitlement but throws EntitlementDeniedError when denied.
 */
export async function enforceEntitlement(
  tx: TxClient,
  ctx: BillingContext,
  feature: string,
): Promise<void> {
  const result = await checkEntitlement(tx, ctx, feature);
  if (!result.allowed) throw new EntitlementDeniedError(result.reason);
}

export { listBillingEvents, getPlanLimits };

/**
 * Usage Metering service (E9 Metering). Deterministic, tenant-aware, fail-closed:
 * records usage events and enforces cost budgets. No Stripe/billing. Billing/export
 * are future seams. Fail-closed on missing tenant, malformed input, cross-tenant refs.
 */
import type { PrismaClient, TxClient } from "@optimora/db";
import { withTenantContext } from "@optimora/db";
import {
  aggregateUsage,
  emitMeteringEvent,
  insertUsageRecord,
  type AggregateFilter,
} from "./store.js";
import {
  DEFAULT_ORG_BUDGET_USD,
  InvalidMeteringContextError,
  MalformedUsageInputError,
  METERING_OPERATIONS,
  METERING_SERVICES,
  type CostGuardInput,
  type CostGuardResult,
  type MeteringContext,
  type RecordUsageInput,
  type UsageRecordView,
} from "./types.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateContext(ctx: MeteringContext): void {
  if (!UUID_RE.test(ctx.tenantId ?? "") || !UUID_RE.test(ctx.orgId ?? "")) {
    throw new InvalidMeteringContextError("Missing or invalid tenant/org context.");
  }
  if (!ctx.actorId || ctx.actorId.trim() === "") {
    throw new InvalidMeteringContextError("Missing actorId.");
  }
}

function validateInput(input: RecordUsageInput): void {
  if (!METERING_SERVICES.includes(input.service as never)) {
    throw new MalformedUsageInputError(`Unknown metering service: "${input.service}".`);
  }
  if (!METERING_OPERATIONS.includes(input.operation as never)) {
    throw new MalformedUsageInputError(`Unknown metering operation: "${input.operation}".`);
  }
  if (typeof input.units !== "number" || input.units < 0 || !isFinite(input.units)) {
    throw new MalformedUsageInputError("units must be a non-negative finite number.");
  }
  if (typeof input.estimatedCostUsd !== "number" || input.estimatedCostUsd < 0 || !isFinite(input.estimatedCostUsd)) {
    throw new MalformedUsageInputError("estimatedCostUsd must be a non-negative finite number.");
  }
  if (input.agentId !== undefined && input.agentId !== null && !UUID_RE.test(input.agentId)) {
    throw new MalformedUsageInputError("Malformed agentId.");
  }
  if (input.taskId !== undefined && input.taskId !== null && !UUID_RE.test(input.taskId)) {
    throw new MalformedUsageInputError("Malformed taskId.");
  }
}

/**
 * Record a usage event. Commits in its own tenant-scoped transaction so the record
 * persists even if the caller performs additional work afterward. Emits a
 * metering.recorded audit event alongside the record.
 */
export async function recordUsage(
  prisma: PrismaClient,
  ctx: MeteringContext,
  input: RecordUsageInput,
): Promise<UsageRecordView> {
  validateContext(ctx);
  validateInput(input);
  return withTenantContext(prisma, ctx, async (tx) => {
    const record = await insertUsageRecord(tx, {
      tenantId: ctx.tenantId,
      orgId: ctx.orgId,
      agentId: input.agentId ?? null,
      taskId: input.taskId ?? null,
      actorId: ctx.actorId,
      service: input.service,
      operation: input.operation,
      units: input.units,
      estimatedCostUsd: input.estimatedCostUsd,
      sourceRef: input.sourceRef ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    });
    await emitMeteringEvent(tx, {
      tenantId: ctx.tenantId,
      usageRecordId: record.id,
      type: "metering.recorded",
      payload: {
        service: input.service,
        operation: input.operation,
        units: input.units,
        estimatedCostUsd: input.estimatedCostUsd,
      },
    });
    return record;
  });
}

/**
 * Check whether adding `additionalCostUsd` to the org's current spend stays within
 * budget. Deterministic: reads current aggregate from DB, compares against ceiling.
 * Does NOT mutate state — callers call recordUsage separately after the check.
 * Returns a structured result; does NOT throw on over-budget (fail-open would be worse:
 * callers decide whether to gate or warn).
 */
export async function checkCostAllowed(
  tx: TxClient,
  ctx: MeteringContext,
  input: CostGuardInput,
): Promise<CostGuardResult> {
  validateContext(ctx);
  if (input.orgId !== ctx.orgId) {
    throw new InvalidMeteringContextError("Cross-tenant cost guard check denied.");
  }
  if (typeof input.additionalCostUsd !== "number" || input.additionalCostUsd < 0 || !isFinite(input.additionalCostUsd)) {
    throw new MalformedUsageInputError("additionalCostUsd must be a non-negative finite number.");
  }

  const filter: AggregateFilter = { tenantId: ctx.tenantId, orgId: ctx.orgId };
  if (input.agentId) filter.agentId = input.agentId;

  const agg = await aggregateUsage(tx, filter);
  const ceiling = input.budgetCeilingUsd ?? DEFAULT_ORG_BUDGET_USD;
  const projected = agg.totalEstimatedCostUsd + input.additionalCostUsd;
  const allowed = projected <= ceiling;

  return {
    allowed,
    reason: allowed
      ? "within_budget"
      : `Projected spend $${projected.toFixed(4)} exceeds ceiling $${ceiling.toFixed(2)}`,
    currentSpendUsd: agg.totalEstimatedCostUsd,
    budgetCeilingUsd: ceiling,
    projectedSpendUsd: projected,
  };
}

export async function getAggregatedUsage(tx: TxClient, ctx: MeteringContext, filter?: Omit<AggregateFilter, "tenantId">) {
  validateContext(ctx);
  return aggregateUsage(tx, { tenantId: ctx.tenantId, ...filter });
}

export { getUsageRecord, listMeteringEvents } from "./store.js";

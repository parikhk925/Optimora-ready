/**
 * @optimora/metering — Usage Metering / Cost Guard Foundation (E9 Metering).
 *
 * Deterministic, tenant-aware, fail-closed usage accounting and cost guard.
 * No Stripe/billing dependency. Billing/export integrations are future seams.
 * Does not redesign Runtime, Model Router, Tools, Integrations, Approval,
 * Context, Memory, Task Engine, Agent ABI, Cognition, Policy, or Org Graph.
 */
export const PACKAGE_NAME = "@optimora/metering" as const;

export {
  recordUsage,
  checkCostAllowed,
  getAggregatedUsage,
  getUsageRecord,
  listMeteringEvents,
} from "./service.js";
export { aggregateUsage, emitMeteringEvent } from "./store.js";
export {
  METERING_SERVICES,
  METERING_OPERATIONS,
  DEFAULT_ORG_BUDGET_USD,
  type MeteringService,
  type MeteringOperation,
  type MeteringContext,
  type RecordUsageInput,
  type UsageRecordView,
  type UsageAggregate,
  type CostGuardInput,
  type CostGuardResult,
  MeteringError,
  InvalidMeteringContextError,
  MalformedUsageInputError,
  BudgetExceededError,
} from "./types.js";

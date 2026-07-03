/**
 * Usage Metering / Cost Guard Foundation types (E9 Metering).
 * Deterministic, tenant-aware, fail-closed. Tracks usage events from model
 * invocations, tool invocations, connector invocations, and runtime runs.
 * No Stripe/billing dependency. Billing/export integrations are future seams.
 */

export const METERING_SERVICES = [
  "model_router",
  "tools",
  "integrations",
  "runtime",
  "approval",
  "context",
  "memory",
] as const;
export type MeteringService = (typeof METERING_SERVICES)[number];

export const METERING_OPERATIONS = [
  "model_invocation",
  "tool_execution",
  "connector_invocation",
  "agent_run",
  "context_assembly",
  "memory_query",
  "approval_request",
] as const;
export type MeteringOperation = (typeof METERING_OPERATIONS)[number];

export interface MeteringContext {
  tenantId: string;
  orgId: string;
  /** The agent, system, or run recording this usage. */
  actorId: string;
}

export interface RecordUsageInput {
  agentId?: string | null;
  taskId?: string | null;
  service: MeteringService;
  operation: MeteringOperation;
  /** Dimensionless usage units (e.g. tokens, calls, bytes). */
  units: number;
  estimatedCostUsd: number;
  /** Opaque reference to the source record (invocation id, run id, etc.). */
  sourceRef?: string | null;
  /** Overrides event timestamp; defaults to now. */
  occurredAt?: Date;
}

export interface UsageRecordView {
  id: string;
  tenantId: string;
  orgId: string;
  agentId: string | null;
  taskId: string | null;
  actorId: string;
  service: MeteringService;
  operation: MeteringOperation;
  units: number;
  estimatedCostUsd: number;
  currency: "USD";
  sourceRef: string | null;
  occurredAt: Date;
  createdAt: Date;
}

export interface UsageAggregate {
  tenantId: string;
  orgId: string | null;
  agentId: string | null;
  taskId: string | null;
  totalUnits: number;
  totalEstimatedCostUsd: number;
}

export interface CostGuardInput {
  orgId: string;
  agentId?: string | null;
  additionalCostUsd: number;
  /** Hard ceiling in USD. Defaults to DEFAULT_ORG_BUDGET_USD if unset. */
  budgetCeilingUsd?: number;
}

export interface CostGuardResult {
  allowed: boolean;
  reason: string;
  currentSpendUsd: number;
  budgetCeilingUsd: number;
  projectedSpendUsd: number;
}

/** Default org-level spend ceiling when no explicit budget is provided. */
export const DEFAULT_ORG_BUDGET_USD = 100;

export class MeteringError extends Error {}
export class InvalidMeteringContextError extends MeteringError {}
export class MalformedUsageInputError extends MeteringError {}
export class BudgetExceededError extends MeteringError {}

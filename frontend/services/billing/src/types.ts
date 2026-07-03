export const PLAN_KEYS = ["free", "starter", "growth", "agency", "enterprise", "custom"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const SUBSCRIPTION_STATUSES = [
  "trialing", "active", "past_due", "paused", "cancelled", "expired",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Statuses that permit feature/quota access. */
export const ACTIVE_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  "trialing", "active",
]);

export interface PlanLimits {
  maxClientWorkspaces: number | null;
  maxAgents: number | null;
  maxMonthlyTasks: number | null;
  maxMonthlyModelUsageUsd: number | null;
  maxMonthlyToolInvocations: number | null;
  maxIntegrations: number | null;
  maxMemoryRecords: number | null;
  maxSeats: number | null;
  enabledModules: string[];
  whiteLabelEnabled: boolean;
  customDomainEnabled: boolean;
}

export interface BillingContext {
  tenantId: string;
  orgId?: string;
  actorId: string;
}

export interface CreateSubscriptionInput {
  planKey: PlanKey;
  status?: SubscriptionStatus;
  trialEndsAt?: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  customLimits?: Partial<PlanLimits>;
  externalRef?: string;
}

export interface UpdateSubscriptionStatusInput {
  status: SubscriptionStatus;
  cancelledAt?: Date;
}

export type QuotaResource =
  | "clientWorkspaces"
  | "agents"
  | "monthlyTasks"
  | "monthlyModelUsageUsd"
  | "monthlyToolInvocations"
  | "integrations"
  | "memoryRecords"
  | "seats";

export interface QuotaCheckResult {
  allowed: boolean;
  resource: QuotaResource;
  limit: number | null;
  currentUsage: number;
  reason: string;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  feature: string;
  reason: string;
}

export interface SubscriptionView {
  id: string;
  tenantId: string;
  orgId: string | null;
  planKey: string;
  status: string;
  trialEndsAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
  customLimits: Partial<PlanLimits>;
  externalRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// --- Error hierarchy ---

export class BillingError extends Error {}
export class InvalidBillingContextError extends BillingError {}
export class SubscriptionNotFoundError extends BillingError {}
export class SubscriptionAlreadyExistsError extends BillingError {}
export class InvalidPlanKeyError extends BillingError {}
export class InvalidSubscriptionStatusError extends BillingError {}
export class SubscriptionInactiveError extends BillingError {}
export class QuotaExceededError extends BillingError {}
export class EntitlementDeniedError extends BillingError {}
export class MalformedBillingInputError extends BillingError {}

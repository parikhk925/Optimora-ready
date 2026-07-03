/**
 * Model Router types (E9 Model Routing). A deterministic, tenant-aware,
 * fail-closed routing layer that selects a provider for a model request based on
 * task type, agent role, quality/cost/latency constraints, provider availability,
 * and policy — then dispatches through the chosen provider. Implements the
 * runtime ModelProvider interface so it is a drop-in for executeRun. No paid/
 * external calls — stub providers only for now. Fails closed on missing tenant,
 * invalid agent/task, unavailable provider, over-budget, unauthorized model use,
 * malformed request, or cross-tenant access.
 */
import type { Principal } from "@optimora/auth-core";
import type { ModelProvider, ModelRequest, ModelResult } from "@optimora/runtime";

// Re-export so callers only need @optimora/model-router.
export type { ModelProvider, ModelRequest, ModelResult };

export interface RouterContext {
  tenantId: string;
  orgId: string;
  agentId: string;
  taskId?: string;
  principal?: Principal;
  requiredPermission?: string;
}

/** Routing policy hints supplied by the caller (all optional). */
export interface RoutingPolicy {
  /** Agent declared role — used to prefer capability-matched providers. */
  role?: string;
  /** Quality tier: "high" | "standard" | "draft". */
  qualityTier?: "high" | "standard" | "draft";
  /** Hard cost ceiling in USD for this invocation. Default: no ceiling. */
  costCeilingUsd?: number;
  /** Latency preference: "low" | "normal". */
  latencyPreference?: "low" | "normal";
  /** Explicit allowed provider names (empty = all registered providers). */
  allowedProviders?: string[];
  /** Safety/profile constraints (free-form tags checked against provider caps). */
  safetyProfile?: string[];
}

/** A registered provider entry with availability + cost metadata. */
export interface ProviderRegistration {
  provider: ModelProvider;
  /** Declared cost per token in USD (output tokens). 0 for stubs. */
  costPerTokenUsd: number;
  /** Quality tier this provider serves. */
  qualityTiers: Array<"high" | "standard" | "draft">;
  /** Latency class: "low" | "normal". */
  latencyClass: "low" | "normal";
  /** Safety/capability tags. */
  caps: string[];
  available: boolean;
}

/** Persisted invocation record (no secrets, no raw prompt/completion). */
export interface InvocationView {
  id: string;
  tenantId: string;
  orgId: string;
  agentId: string;
  taskId: string | null;
  providerName: string;
  qualityTier: string;
  costCeilingUsd: number | null;
  estimatedCostUsd: number;
  tokensIn: number;
  tokensOut: number;
  status: "succeeded" | "failed";
  failureReason: string | null;
  createdAt: Date;
}

export class ModelRouterError extends Error {}
export class InvalidRouterContextError extends ModelRouterError {}
export class NoProviderAvailableError extends ModelRouterError {}
export class CostCeilingExceededError extends ModelRouterError {}
export class UnauthorizedModelError extends ModelRouterError {}
export class MalformedRouterRequestError extends ModelRouterError {}

/**
 * Model Router (E9 Model Routing). Deterministic, tenant-aware, fail-closed:
 * selects a provider via the ProviderRegistry, enforces cost/budget/policy checks,
 * dispatches the request, records the invocation (no secrets stored), and emits a
 * routing event. Implements ModelProvider so it is a drop-in for executeRun.
 *
 * Fail-closed cases: missing/invalid tenant or agent, malformed request, no
 * available provider, cost ceiling exceeded, policy denial.
 * NO paid/external model calls — all registered providers must be stubs for now.
 */
import type { TxClient } from "@optimora/db";
import { authorize } from "@optimora/auth-core";
import type { ModelRequest, ModelResult } from "@optimora/runtime";
import { ProviderRegistry } from "./registry.js";
import { createInvocation, emitRoutingEvent } from "./store.js";
import {
  CostCeilingExceededError,
  InvalidRouterContextError,
  MalformedRouterRequestError,
  NoProviderAvailableError,
  UnauthorizedModelError,
  type InvocationView,
  type RouterContext,
  type RoutingPolicy,
} from "./types.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateContext(ctx: RouterContext): void {
  if (!UUID_RE.test(ctx.tenantId ?? "") || !UUID_RE.test(ctx.orgId ?? "")) {
    throw new InvalidRouterContextError("Missing or invalid tenant/org context.");
  }
  if (!UUID_RE.test(ctx.agentId ?? "")) {
    throw new InvalidRouterContextError("Missing or invalid agentId.");
  }
}

function validateRequest(req: ModelRequest): void {
  if (!req || typeof req.role !== "string" || req.role.trim() === "") {
    throw new MalformedRouterRequestError("ModelRequest.role must be a non-empty string.");
  }
  if (typeof req.input !== "object" || req.input === null || Array.isArray(req.input)) {
    throw new MalformedRouterRequestError("ModelRequest.input must be a plain object.");
  }
}

function policyDenies(ctx: RouterContext, providerName: string): boolean {
  if (!ctx.principal) return false;
  const action = ctx.requiredPermission ?? "model:invoke";
  const decision = authorize({
    principal: ctx.principal,
    action,
    resource: { type: "model_invocation", id: providerName, tenantId: ctx.tenantId, orgId: ctx.orgId },
    context: { requiredPermission: action },
  });
  return !decision.allowed;
}

/** Estimate cost in USD: tokensOut * costPerToken (stubs → $0). */
function estimateCost(tokensOut: number, costPerTokenUsd: number): number {
  return tokensOut * costPerTokenUsd;
}

export interface RouteResult {
  invocation: InvocationView;
  result: ModelResult;
}

export async function routeAndInvoke(
  tx: TxClient,
  ctx: RouterContext,
  request: ModelRequest,
  policy: RoutingPolicy,
  registry: ProviderRegistry,
): Promise<RouteResult> {
  validateContext(ctx);
  validateRequest(request);

  const reg = registry.select(policy);
  if (!reg) {
    throw new NoProviderAvailableError("No available provider matches the routing policy.");
  }

  if (policyDenies(ctx, reg.provider.name)) {
    throw new UnauthorizedModelError(`Model invocation denied for provider "${reg.provider.name}".`);
  }

  // Dispatch (stub — no paid calls).
  const result = await reg.provider.complete(request);

  const estimatedCost = estimateCost(result.tokensOut, reg.costPerTokenUsd);
  if (policy.costCeilingUsd !== undefined && estimatedCost > policy.costCeilingUsd) {
    throw new CostCeilingExceededError(
      `Estimated cost $${estimatedCost.toFixed(6)} exceeds ceiling $${policy.costCeilingUsd}.`,
    );
  }

  const tier = policy.qualityTier ?? "standard";
  const invocation = await createInvocation(tx, {
    tenantId: ctx.tenantId,
    orgId: ctx.orgId,
    agentId: ctx.agentId,
    taskId: ctx.taskId ?? null,
    providerName: reg.provider.name,
    qualityTier: tier,
    costCeilingUsd: policy.costCeilingUsd ?? null,
    estimatedCostUsd: estimatedCost,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    status: "succeeded",
  });
  await emitRoutingEvent(tx, {
    tenantId: ctx.tenantId,
    invocationId: invocation.id,
    type: "model.routed",
    payload: {
      provider: reg.provider.name,
      tier,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      estimatedCostUsd: estimatedCost,
    },
  });

  return { invocation, result };
}

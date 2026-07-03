/**
 * @optimora/model-router — Model Routing layer (E9 Model Routing).
 *
 * Deterministic, tenant-aware, fail-closed routing layer: selects a registered
 * provider (stub-only for now — NO paid/external calls), enforces cost/budget/
 * policy constraints, records the invocation (no secrets), and emits a routing
 * audit event. Implements ModelProvider so it is a drop-in for the runtime's
 * executeRun. Does not redesign the Runtime, Context Fabric, Memory, Task Engine,
 * Agent ABI, Cognition, Policy, or Org Graph.
 */
export const PACKAGE_NAME = "@optimora/model-router" as const;

export { routeAndInvoke, type RouteResult } from "./router.js";
export { ProviderRegistry } from "./registry.js";
export { getInvocation, listRoutingEvents, emitRoutingEvent } from "./store.js";
export {
  type ModelProvider,
  type ModelRequest,
  type ModelResult,
  type RouterContext,
  type RoutingPolicy,
  type ProviderRegistration,
  type InvocationView,
  ModelRouterError,
  InvalidRouterContextError,
  NoProviderAvailableError,
  CostCeilingExceededError,
  UnauthorizedModelError,
  MalformedRouterRequestError,
} from "./types.js";

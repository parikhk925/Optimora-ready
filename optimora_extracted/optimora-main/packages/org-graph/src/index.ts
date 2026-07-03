/**
 * @optimora/org-graph — the typed, versioned Org Graph (T-3.1).
 * Postgres recursive-CTE traversal; tenant-isolated via RLS. No graph database.
 */
export const PACKAGE_NAME = "@optimora/org-graph" as const;

export * from "./types.js";
export {
  createNode,
  updateNode,
  getNode,
  listNodes,
  listNodeVersions,
  createEdge,
  listEdges,
  type CreateNodeInput,
  type UpdateNodeInput,
  type CreateEdgeInput,
} from "./store.js";
export { descendants, ancestors, isReachable } from "./traversal.js";
export { emitOrgEvent, listOrgEvents } from "./events.js";
export { reconcileOrg, type ReconcileAction, type ReconcileResult } from "./reconcile.js";
export {
  setBudget,
  getEffectiveLimit,
  getUsed,
  getAvailable,
  reserve,
  release,
  recordSpend,
  BudgetError,
  BudgetContextMissingError,
  BudgetExceededError,
  InvalidAmountError,
  type NodeBudgetView,
  type EffectiveLimit,
  type ReservationView,
  type SpendView,
} from "./budget.js";

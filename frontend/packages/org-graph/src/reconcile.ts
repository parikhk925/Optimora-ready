/**
 * Minimal reconciliation loop foundation (T-3.1).
 *
 * This is intentionally NOT the planning engine. It is the durable observe -> diff
 * -> emit skeleton the Continuous Company Loop will build on: it scans the current
 * org graph, detects simple structural gaps, and emits reconciliation events.
 * A future task plugs real controllers (planning/decision) into this loop.
 */
import type { TxClient } from "@optimora/db";
import { emitOrgEvent } from "./events.js";
import { listEdges, listNodes } from "./store.js";

export interface ReconcileAction {
  action: string;
  nodeId?: string;
  detail?: Record<string, unknown>;
}

export interface ReconcileResult {
  tenantId: string;
  orgId: string;
  observed: { nodes: number; edges: number };
  actions: ReconcileAction[];
}

/**
 * Run one reconciliation pass over an org's graph. Emits a `reconcile.tick`
 * event plus a `reconcile.action` event per detected gap, and returns a summary.
 *
 * Current minimal rule: any non-executive node without an incoming `manages` or
 * `reports_to` edge is "unmanaged" and flagged for attention.
 */
export async function reconcileOrg(
  tx: TxClient,
  tenantId: string,
  orgId: string,
): Promise<ReconcileResult> {
  const [nodes, edges] = await Promise.all([listNodes(tx, orgId), listEdges(tx, orgId)]);

  const hasManager = new Set<string>();
  for (const e of edges) {
    if (e.type === "manages" || e.type === "reports_to") {
      // `manages`: from manages to (to has a manager). `reports_to`: from reports to (from has a manager).
      hasManager.add(e.type === "manages" ? e.toNodeId : e.fromNodeId);
    }
  }

  const actions: ReconcileAction[] = [];
  for (const n of nodes) {
    if (n.type !== "executive" && n.status === "active" && !hasManager.has(n.id)) {
      actions.push({ action: "unmanaged_node", nodeId: n.id, detail: { nodeType: n.type } });
    }
  }

  await emitOrgEvent(tx, {
    tenantId,
    orgId,
    type: "reconcile.tick",
    payload: { nodes: nodes.length, edges: edges.length, actionCount: actions.length },
  });
  for (const a of actions) {
    await emitOrgEvent(tx, { tenantId, orgId, type: "reconcile.action", payload: { ...a } });
  }

  return { tenantId, orgId, observed: { nodes: nodes.length, edges: edges.length }, actions };
}

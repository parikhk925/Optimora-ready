/**
 * Deterministic message routing (T-10.1). Resolves the Org Graph relationship
 * that authorizes a message and expands broadcast scopes to members. All reads
 * are tenant-scoped via the supplied TxClient (RLS), so cross-tenant nodes are
 * invisible and routing fails closed. A provider seam is left for future
 * LLM-assisted routing; deterministic routing is the default and only path now.
 */
import type { TxClient } from "@optimora/db";
import { descendants, isReachable, listEdges } from "@optimora/org-graph";
import type { Relationship } from "./types.js";

/** Immediate managers of a node (nodes with a `manages` edge into it). */
async function immediateManagers(tx: TxClient, nodeId: string): Promise<Set<string>> {
  const edges = await listEdges(tx);
  return new Set(
    edges.filter((e) => e.type === "manages" && e.toNodeId === nodeId).map((e) => e.fromNodeId),
  );
}

/** Is there a `collaborates_with` edge (either direction) between a and b? */
async function collaborates(tx: TxClient, a: string, b: string): Promise<boolean> {
  const edges = await listEdges(tx);
  return edges.some(
    (e) =>
      e.type === "collaborates_with" &&
      ((e.fromNodeId === a && e.toNodeId === b) || (e.fromNodeId === b && e.toNodeId === a)),
  );
}

/**
 * Resolve the relationship authorizing senderNodeId -> recipientNodeId, or null
 * if none exists (deny / fail closed). System senders are handled by the engine.
 */
export async function resolveRelationship(
  tx: TxClient,
  senderNodeId: string,
  recipientNodeId: string,
): Promise<Relationship | null> {
  if (senderNodeId === recipientNodeId) return null;

  // Downward: sender manages recipient (directly or transitively).
  if (await isReachable(tx, senderNodeId, recipientNodeId, "manages")) {
    return "manager_to_subordinate";
  }
  // Upward (escalation): recipient manages sender.
  if (await isReachable(tx, recipientNodeId, senderNodeId, "manages")) {
    return "subordinate_to_manager";
  }
  // Peer: explicit collaboration edge.
  if (await collaborates(tx, senderNodeId, recipientNodeId)) {
    return "peer";
  }
  // Sibling peers: a shared immediate manager.
  const [sm, rm] = await Promise.all([
    immediateManagers(tx, senderNodeId),
    immediateManagers(tx, recipientNodeId),
  ]);
  for (const m of sm) {
    if (rm.has(m)) return "peer_sibling";
  }
  return null;
}

/**
 * Members of a department/team scope: its `manages` descendants that are agents
 * or managers. Deterministic order (by descendant traversal). Excludes the scope
 * node itself.
 */
export async function resolveBroadcastMembers(
  tx: TxClient,
  scopeNodeId: string,
): Promise<string[]> {
  const nodes = await descendants(tx, scopeNodeId, "manages");
  return nodes.filter((n) => n.type === "agent" || n.type === "manager").map((n) => n.id);
}

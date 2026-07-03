/**
 * Org Graph traversal via Postgres recursive CTEs (T-3.1).
 *
 * All queries run on a tenant-scoped TxClient, so RLS confines traversal to the
 * current tenant automatically. The CTEs carry a visited-path array to stay
 * terminating even if a cycle ever slipped in (defense-in-depth alongside
 * cycle prevention at write time).
 */
import { Prisma, type TxClient } from "@optimora/db";
import type { EdgeType, OrgNode } from "./types.js";

interface RawNode {
  id: string;
  tenant_id: string;
  org_id: string;
  type: string;
  name: string;
  status: string;
  version: number;
  data: unknown;
  created_at: Date;
  updated_at: Date;
  depth: number;
}

function mapNode(r: RawNode): OrgNode & { depth: number } {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    orgId: r.org_id,
    type: r.type as OrgNode["type"],
    name: r.name,
    status: r.status,
    version: r.version,
    data: (r.data ?? {}) as Record<string, unknown>,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    depth: Number(r.depth),
  };
}

/**
 * Descendants of `startId` following `edgeType` in the from->to direction
 * (e.g. for "manages", the people/units the start node manages, transitively).
 */
export async function descendants(
  tx: TxClient,
  startId: string,
  edgeType: EdgeType,
): Promise<Array<OrgNode & { depth: number }>> {
  const rows = await tx.$queryRaw<RawNode[]>`
    WITH RECURSIVE walk AS (
      SELECT e."to_node_id" AS node_id, 1 AS depth, ARRAY[e."from_node_id", e."to_node_id"] AS path
      FROM "org_edges" e
      WHERE e."from_node_id" = ${startId}::uuid AND e."type" = ${edgeType}
      UNION ALL
      SELECT e."to_node_id", w.depth + 1, w.path || e."to_node_id"
      FROM "org_edges" e
      JOIN walk w ON e."from_node_id" = w.node_id
      WHERE e."type" = ${edgeType} AND NOT e."to_node_id" = ANY(w.path)
    )
    SELECT n.*, MIN(w.depth) AS depth
    FROM walk w
    JOIN "org_nodes" n ON n.id = w.node_id
    GROUP BY n.id
    ORDER BY depth ASC, n.name ASC
  `;
  return rows.map(mapNode);
}

/**
 * Ancestors of `startId` following `edgeType` (the to->from direction): the
 * chain above the node (e.g. its managers / reporting line).
 */
export async function ancestors(
  tx: TxClient,
  startId: string,
  edgeType: EdgeType,
): Promise<Array<OrgNode & { depth: number }>> {
  const rows = await tx.$queryRaw<RawNode[]>`
    WITH RECURSIVE walk AS (
      SELECT e."from_node_id" AS node_id, 1 AS depth, ARRAY[e."to_node_id", e."from_node_id"] AS path
      FROM "org_edges" e
      WHERE e."to_node_id" = ${startId}::uuid AND e."type" = ${edgeType}
      UNION ALL
      SELECT e."from_node_id", w.depth + 1, w.path || e."from_node_id"
      FROM "org_edges" e
      JOIN walk w ON e."to_node_id" = w.node_id
      WHERE e."type" = ${edgeType} AND NOT e."from_node_id" = ANY(w.path)
    )
    SELECT n.*, MIN(w.depth) AS depth
    FROM walk w
    JOIN "org_nodes" n ON n.id = w.node_id
    GROUP BY n.id
    ORDER BY depth ASC, n.name ASC
  `;
  return rows.map(mapNode);
}

/**
 * Is `targetId` reachable from `startId` via `edgeType` (from->to)? Used for
 * cycle prevention: adding from->to is a cycle if `from` is reachable from `to`.
 */
export async function isReachable(
  tx: TxClient,
  startId: string,
  targetId: string,
  edgeType: EdgeType,
): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ hit: boolean }>>`
    WITH RECURSIVE walk AS (
      SELECT e."to_node_id" AS node_id, ARRAY[e."from_node_id", e."to_node_id"] AS path
      FROM "org_edges" e
      WHERE e."from_node_id" = ${startId}::uuid AND e."type" = ${edgeType}
      UNION ALL
      SELECT e."to_node_id", w.path || e."to_node_id"
      FROM "org_edges" e
      JOIN walk w ON e."from_node_id" = w.node_id
      WHERE e."type" = ${edgeType} AND NOT e."to_node_id" = ANY(w.path)
    )
    SELECT EXISTS (SELECT 1 FROM walk WHERE node_id = ${targetId}::uuid) AS hit
  `;
  return rows[0]?.hit === true;
}

// Re-export Prisma for raw-type tooling that needs it.
export { Prisma };

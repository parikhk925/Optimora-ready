/**
 * Org Graph store (T-3.1): typed, versioned nodes + edges with cycle prevention.
 * All operations run on a tenant-scoped TxClient (RLS enforces isolation), and
 * mutations append an immutable version snapshot and emit an outbox event.
 */
import type { TxClient } from "@optimora/db";
import {
  CycleError,
  InvalidEdgeTypeError,
  InvalidNodeTypeError,
  NodeNotFoundError,
  isEdgeType,
  isHierarchical,
  isNodeType,
  type EdgeType,
  type NodeType,
  type OrgEdge,
  type OrgNode,
} from "./types.js";
import { isReachable } from "./traversal.js";
import { emitOrgEvent } from "./events.js";

function mapNode(r: {
  id: string;
  tenantId: string;
  orgId: string;
  type: string;
  name: string;
  status: string;
  version: number;
  data: unknown;
  createdAt: Date;
  updatedAt: Date;
}): OrgNode {
  return {
    id: r.id,
    tenantId: r.tenantId,
    orgId: r.orgId,
    type: r.type as NodeType,
    name: r.name,
    status: r.status,
    version: r.version,
    data: (r.data ?? {}) as Record<string, unknown>,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

async function snapshot(tx: TxClient, node: OrgNode): Promise<void> {
  await tx.orgNodeVersion.create({
    data: {
      nodeId: node.id,
      tenantId: node.tenantId,
      version: node.version,
      type: node.type,
      name: node.name,
      status: node.status,
      data: node.data as object,
    },
  });
}

export interface CreateNodeInput {
  tenantId: string;
  orgId: string;
  type: NodeType;
  name: string;
  data?: Record<string, unknown>;
}

export async function createNode(tx: TxClient, input: CreateNodeInput): Promise<OrgNode> {
  if (!isNodeType(input.type)) throw new InvalidNodeTypeError(`Invalid node type: ${input.type}`);
  const created = await tx.orgNode.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      type: input.type,
      name: input.name,
      data: (input.data ?? {}) as object,
    },
  });
  const node = mapNode(created);
  await snapshot(tx, node);
  await emitOrgEvent(tx, {
    tenantId: node.tenantId,
    orgId: node.orgId,
    type: "org.node.created",
    payload: { nodeId: node.id, nodeType: node.type, version: node.version },
  });
  return node;
}

export interface UpdateNodeInput {
  name?: string;
  status?: string;
  data?: Record<string, unknown>;
}

/** Update a node: bumps version, appends a snapshot, emits an event. */
export async function updateNode(
  tx: TxClient,
  nodeId: string,
  input: UpdateNodeInput,
): Promise<OrgNode> {
  const existing = await tx.orgNode.findUnique({ where: { id: nodeId } });
  if (!existing) throw new NodeNotFoundError(nodeId);
  const updated = await tx.orgNode.update({
    where: { id: nodeId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.data !== undefined ? { data: input.data as object } : {}),
      version: { increment: 1 },
    },
  });
  const node = mapNode(updated);
  await snapshot(tx, node);
  await emitOrgEvent(tx, {
    tenantId: node.tenantId,
    orgId: node.orgId,
    type: "org.node.updated",
    payload: { nodeId: node.id, version: node.version },
  });
  return node;
}

export async function getNode(tx: TxClient, nodeId: string): Promise<OrgNode | null> {
  const r = await tx.orgNode.findUnique({ where: { id: nodeId } });
  return r ? mapNode(r) : null;
}

export async function listNodeVersions(tx: TxClient, nodeId: string) {
  return tx.orgNodeVersion.findMany({ where: { nodeId }, orderBy: { version: "asc" } });
}

export interface CreateEdgeInput {
  tenantId: string;
  orgId: string;
  fromNodeId: string;
  toNodeId: string;
  type: EdgeType;
}

export async function createEdge(tx: TxClient, input: CreateEdgeInput): Promise<OrgEdge> {
  if (!isEdgeType(input.type)) throw new InvalidEdgeTypeError(`Invalid edge type: ${input.type}`);
  if (input.fromNodeId === input.toNodeId) {
    throw new CycleError("A node cannot have a self-referential hierarchical edge.");
  }

  // Both endpoints must exist (and be visible in this tenant via RLS).
  const [from, to] = await Promise.all([
    tx.orgNode.findUnique({ where: { id: input.fromNodeId }, select: { id: true } }),
    tx.orgNode.findUnique({ where: { id: input.toNodeId }, select: { id: true } }),
  ]);
  if (!from || !to) throw new NodeNotFoundError(!from ? input.fromNodeId : input.toNodeId);

  // Cycle prevention for hierarchical edges: adding from->to is a cycle if
  // `from` is already reachable from `to` along this edge type.
  if (isHierarchical(input.type)) {
    if (await isReachable(tx, input.toNodeId, input.fromNodeId, input.type)) {
      throw new CycleError();
    }
  }

  const edge = await tx.orgEdge.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      fromNodeId: input.fromNodeId,
      toNodeId: input.toNodeId,
      type: input.type,
    },
  });
  await emitOrgEvent(tx, {
    tenantId: input.tenantId,
    orgId: input.orgId,
    type: "org.edge.created",
    payload: { edgeId: edge.id, edgeType: input.type, from: input.fromNodeId, to: input.toNodeId },
  });
  return { ...edge, type: edge.type as EdgeType };
}

export async function listNodes(tx: TxClient, orgId?: string): Promise<OrgNode[]> {
  const rows = await tx.orgNode.findMany({
    where: orgId ? { orgId } : undefined,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapNode);
}

export async function listEdges(tx: TxClient, orgId?: string): Promise<OrgEdge[]> {
  const rows = await tx.orgEdge.findMany({
    where: orgId ? { orgId } : undefined,
    orderBy: { createdAt: "asc" },
  });
  return rows.map((e) => ({ ...e, type: e.type as EdgeType }));
}

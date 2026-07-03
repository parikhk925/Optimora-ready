/**
 * Org Graph domain types (T-3.1).
 *
 * The organization is a typed, versioned directed graph. Authority/budget/goals
 * flow along edges (modeled in later tasks). This package is the stable seam;
 * the store uses Postgres recursive CTEs (no separate graph database).
 */

export const NODE_TYPES = ["executive", "department", "team", "manager", "agent"] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const EDGE_TYPES = ["manages", "reports_to", "delegates_to", "collaborates_with"] as const;
export type EdgeType = (typeof EDGE_TYPES)[number];

/**
 * Hierarchical (acyclic) edge types — cycles are rejected for these.
 * `collaborates_with` is peer-to-peer and may form cycles.
 */
export const HIERARCHICAL_EDGE_TYPES: readonly EdgeType[] = [
  "manages",
  "reports_to",
  "delegates_to",
];

export function isNodeType(value: string): value is NodeType {
  return (NODE_TYPES as readonly string[]).includes(value);
}
export function isEdgeType(value: string): value is EdgeType {
  return (EDGE_TYPES as readonly string[]).includes(value);
}
export function isHierarchical(type: EdgeType): boolean {
  return HIERARCHICAL_EDGE_TYPES.includes(type);
}

export interface OrgNode {
  id: string;
  tenantId: string;
  orgId: string;
  type: NodeType;
  name: string;
  status: string;
  version: number;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgEdge {
  id: string;
  tenantId: string;
  orgId: string;
  fromNodeId: string;
  toNodeId: string;
  type: EdgeType;
  createdAt: Date;
}

export interface OrgEvent {
  id: string;
  tenantId: string;
  orgId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export class OrgGraphError extends Error {}
export class InvalidNodeTypeError extends OrgGraphError {}
export class InvalidEdgeTypeError extends OrgGraphError {}
export class NodeNotFoundError extends OrgGraphError {}
export class CycleError extends OrgGraphError {
  constructor(message = "Edge would create a cycle in a hierarchical relationship.") {
    super(message);
    this.name = "CycleError";
  }
}

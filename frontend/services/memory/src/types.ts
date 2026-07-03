/**
 * Agent Memory Store types (E9 Memory). A deterministic, tenant-aware,
 * fail-closed memory plane: stores, queries, and archives agent-scoped memory
 * records. Vector/embedding retrieval sits behind the MemoryRetriever seam whose
 * default is a deterministic tag/recency/importance filter stub — no paid AI
 * calls, no real embeddings. Plugs into the Context Fabric retriever seam. Fails
 * closed on missing tenant, invalid agent, invalid scope, unauthorized access,
 * malformed record, or cross-tenant access.
 */
import type { Principal } from "@optimora/auth-core";

export const MEMORY_TYPES = [
  "fact",
  "preference",
  "instruction",
  "observation",
  "critique",
  "learning",
  "task_note",
] as const;
export type MemoryType = (typeof MEMORY_TYPES)[number];

export const MEMORY_STATUSES = ["active", "archived"] as const;
export type MemoryStatus = (typeof MEMORY_STATUSES)[number];

export interface MemoryContext {
  tenantId: string;
  orgId: string;
  principal?: Principal;
  requiredPermission?: string;
}

export interface CreateMemoryInput {
  agentId: string;
  taskId?: string;
  type: MemoryType;
  content: string;
  tags?: string[];
  /** 0–1 importance weight, used for deterministic ranking. Default 0.5. */
  importance?: number;
  /** Freeform metadata. */
  meta?: Record<string, unknown>;
}

export interface MemoryView {
  id: string;
  tenantId: string;
  orgId: string;
  agentId: string;
  taskId: string | null;
  type: MemoryType;
  content: string;
  tags: string[];
  importance: number;
  meta: Record<string, unknown>;
  status: MemoryStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryQuery {
  agentId?: string;
  taskId?: string;
  type?: MemoryType;
  /** Must contain ALL provided tags (AND). */
  tags?: string[];
  status?: MemoryStatus;
  /** Deterministic ordering: importance desc, then createdAt desc. */
  limit?: number;
  offset?: number;
}

/** Deterministic retrieval result for the Context Fabric seam. */
export interface MemoryRetrievalResult {
  records: MemoryView[];
  totalMatched: number;
}

/**
 * Memory retriever abstraction. The default stub filters by the query fields
 * deterministically (no embeddings, no vector search, no paid calls). A real
 * semantic/vector provider plugs in here later.
 */
export interface MemoryRetriever {
  readonly name: string;
  retrieve(records: MemoryView[], query: MemoryQuery): MemoryView[];
}

export class MemoryError extends Error {}
export class InvalidMemoryContextError extends MemoryError {}
export class MissingMemoryError extends MemoryError {}
export class InvalidMemoryInputError extends MemoryError {}
export class UnauthorizedMemoryError extends MemoryError {}

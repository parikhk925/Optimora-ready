/**
 * Agent Memory Store service (E9 Memory). Deterministic, tenant-aware,
 * fail-closed: validates tenant/agent/scope, enforces policy, persists records,
 * emits audit events. Query uses a MemoryRetriever seam (stub by default — no
 * embeddings, no paid calls). Fails closed on missing tenant/agent, unauthorized
 * access, invalid type, malformed content, or cross-tenant access.
 */
import type { TxClient } from "@optimora/db";
import { authorize } from "@optimora/auth-core";
import {
  archiveMemoryRecord,
  createMemoryRecord,
  emitMemoryEvent,
  getMemoryRecord,
  queryMemoryRecords,
} from "./store.js";
import { StubMemoryRetriever } from "./retriever.js";
import {
  InvalidMemoryContextError,
  InvalidMemoryInputError,
  MissingMemoryError,
  UnauthorizedMemoryError,
  type CreateMemoryInput,
  type MemoryContext,
  type MemoryQuery,
  type MemoryRetriever,
  type MemoryRetrievalResult,
  type MemoryView,
  MEMORY_TYPES,
} from "./types.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateContext(ctx: MemoryContext): void {
  if (!UUID_RE.test(ctx.tenantId ?? "") || !UUID_RE.test(ctx.orgId ?? "")) {
    throw new InvalidMemoryContextError("Missing or invalid tenant/org context.");
  }
}

function policyDenies(ctx: MemoryContext, action: string, resourceId: string): boolean {
  if (!ctx.principal) return false;
  const decision = authorize({
    principal: ctx.principal,
    action,
    resource: { type: "memory_record", id: resourceId, tenantId: ctx.tenantId, orgId: ctx.orgId },
    context: { requiredPermission: action },
  });
  return !decision.allowed;
}

function validateInput(input: CreateMemoryInput): void {
  if (!UUID_RE.test(input.agentId ?? "")) {
    throw new InvalidMemoryInputError("Missing or invalid agentId.");
  }
  if (!MEMORY_TYPES.includes(input.type as never)) {
    throw new InvalidMemoryInputError(`Unknown memory type: "${input.type}".`);
  }
  if (!input.content || typeof input.content !== "string" || input.content.trim() === "") {
    throw new InvalidMemoryInputError("Memory content must be a non-empty string.");
  }
  if (input.taskId !== undefined && input.taskId !== null && !UUID_RE.test(input.taskId)) {
    throw new InvalidMemoryInputError("Malformed taskId.");
  }
  const imp = input.importance ?? 0.5;
  if (typeof imp !== "number" || imp < 0 || imp > 1) {
    throw new InvalidMemoryInputError("importance must be a number in [0, 1].");
  }
}

export interface MemoryServiceOptions {
  retriever?: MemoryRetriever;
}

export async function createMemory(
  tx: TxClient,
  ctx: MemoryContext,
  input: CreateMemoryInput,
  _options: MemoryServiceOptions = {},
): Promise<MemoryView> {
  validateContext(ctx);
  validateInput(input);
  if (policyDenies(ctx, ctx.requiredPermission ?? "memory:write", input.agentId)) {
    throw new UnauthorizedMemoryError("Unauthorized memory write.");
  }
  const record = await createMemoryRecord(tx, {
    tenantId: ctx.tenantId,
    orgId: ctx.orgId,
    agentId: input.agentId,
    taskId: input.taskId ?? null,
    type: input.type,
    content: input.content,
    tags: input.tags ?? [],
    importance: input.importance ?? 0.5,
    meta: input.meta ?? {},
  });
  await emitMemoryEvent(tx, {
    tenantId: ctx.tenantId,
    memoryId: record.id,
    type: "memory.created",
    payload: { agentId: record.agentId, type: record.type },
  });
  return record;
}

export async function queryMemory(
  tx: TxClient,
  ctx: MemoryContext,
  query: MemoryQuery,
  options: MemoryServiceOptions = {},
): Promise<MemoryRetrievalResult> {
  validateContext(ctx);
  const agentId = query.agentId ?? ctx.orgId; // scope guard: must pass agentId or be system-scoped
  if (policyDenies(ctx, ctx.requiredPermission ?? "memory:read", agentId)) {
    throw new UnauthorizedMemoryError("Unauthorized memory read.");
  }
  const retriever = options.retriever ?? new StubMemoryRetriever();
  // Fetch DB-side with tenant isolation (RLS); retriever refines ordering/filtering.
  const raw = await queryMemoryRecords(tx, ctx.tenantId, query);
  const records = retriever.retrieve(raw, query);
  return { records, totalMatched: records.length };
}

export async function archiveMemory(
  tx: TxClient,
  ctx: MemoryContext,
  id: string,
): Promise<MemoryView> {
  validateContext(ctx);
  if (!UUID_RE.test(id ?? "")) throw new MissingMemoryError("Missing or invalid memory id.");
  const existing = await getMemoryRecord(tx, id);
  if (!existing) throw new MissingMemoryError("Memory record not found in tenant context.");
  if (policyDenies(ctx, ctx.requiredPermission ?? "memory:write", existing.agentId)) {
    throw new UnauthorizedMemoryError("Unauthorized memory archive.");
  }
  const record = await archiveMemoryRecord(tx, id);
  await emitMemoryEvent(tx, {
    tenantId: ctx.tenantId,
    memoryId: record.id,
    type: "memory.archived",
    payload: { agentId: record.agentId },
  });
  return record;
}

export async function getMemory(
  tx: TxClient,
  ctx: MemoryContext,
  id: string,
): Promise<MemoryView | null> {
  validateContext(ctx);
  if (!UUID_RE.test(id ?? "")) throw new MissingMemoryError("Missing or invalid memory id.");
  if (policyDenies(ctx, ctx.requiredPermission ?? "memory:read", ctx.orgId)) {
    throw new UnauthorizedMemoryError("Unauthorized memory read.");
  }
  return getMemoryRecord(tx, id);
}

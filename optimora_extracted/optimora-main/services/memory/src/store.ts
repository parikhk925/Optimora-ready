/**
 * Memory record + event persistence (E9 Memory). Tenant-scoped via the supplied
 * TxClient (RLS). Records are mutable only for archive; content is write-once.
 */
import type { TxClient } from "@optimora/db";
import type { MemoryQuery, MemoryStatus, MemoryType, MemoryView } from "./types.js";

interface MemoryRow {
  id: string;
  tenantId: string;
  orgId: string;
  agentId: string;
  taskId: string | null;
  type: string;
  content: string;
  tags: string[];
  importance: number;
  meta: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

function toView(r: MemoryRow): MemoryView {
  return {
    id: r.id,
    tenantId: r.tenantId,
    orgId: r.orgId,
    agentId: r.agentId,
    taskId: r.taskId,
    type: r.type as MemoryType,
    content: r.content,
    tags: r.tags,
    importance: r.importance,
    meta: (r.meta ?? {}) as Record<string, unknown>,
    status: r.status as MemoryStatus,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function createMemoryRecord(
  tx: TxClient,
  input: {
    tenantId: string;
    orgId: string;
    agentId: string;
    taskId?: string | null;
    type: MemoryType;
    content: string;
    tags: string[];
    importance: number;
    meta: Record<string, unknown>;
  },
): Promise<MemoryView> {
  const row = (await tx.memoryRecord.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      agentId: input.agentId,
      taskId: input.taskId ?? null,
      type: input.type,
      content: input.content,
      tags: input.tags,
      importance: input.importance,
      meta: input.meta as object,
    },
  })) as MemoryRow;
  return toView(row);
}

export async function getMemoryRecord(tx: TxClient, id: string): Promise<MemoryView | null> {
  const row = (await tx.memoryRecord.findUnique({ where: { id } })) as MemoryRow | null;
  return row ? toView(row) : null;
}

export async function archiveMemoryRecord(tx: TxClient, id: string): Promise<MemoryView> {
  const row = (await tx.memoryRecord.update({
    where: { id },
    data: { status: "archived" },
  })) as MemoryRow;
  return toView(row);
}

export async function queryMemoryRecords(
  tx: TxClient,
  tenantId: string,
  query: MemoryQuery,
): Promise<MemoryView[]> {
  const where: Record<string, unknown> = { tenantId };
  if (query.agentId) where["agentId"] = query.agentId;
  if (query.taskId) where["taskId"] = query.taskId;
  if (query.type) where["type"] = query.type;
  if (query.status) where["status"] = query.status;
  if (query.tags && query.tags.length > 0) where["tags"] = { hasEvery: query.tags };

  const rows = (await tx.memoryRecord.findMany({
    where,
    orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
    take: query.limit ?? 100,
    skip: query.offset ?? 0,
  })) as MemoryRow[];
  return rows.map(toView);
}

export async function emitMemoryEvent(
  tx: TxClient,
  input: { tenantId: string; memoryId: string; type: string; payload?: Record<string, unknown> },
): Promise<void> {
  await tx.memoryEvent.create({
    data: {
      tenantId: input.tenantId,
      memoryId: input.memoryId,
      type: input.type,
      payload: (input.payload ?? {}) as object,
    },
  });
}

export async function listMemoryEvents(tx: TxClient, memoryId: string) {
  return tx.memoryEvent.findMany({ where: { memoryId }, orderBy: { createdAt: "asc" } });
}

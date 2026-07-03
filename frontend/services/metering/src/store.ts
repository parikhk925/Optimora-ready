/**
 * Usage record + metering event persistence (E9 Metering). Tenant-scoped via
 * TxClient (RLS). Records are append-only; no mutation after insert.
 */
import type { TxClient } from "@optimora/db";
import type { MeteringOperation, MeteringService, UsageRecordView } from "./types.js";

interface UsageRow {
  id: string;
  tenantId: string;
  orgId: string;
  agentId: string | null;
  taskId: string | null;
  actorId: string;
  service: string;
  operation: string;
  units: number;
  estimatedCostUsd: number;
  currency: string;
  sourceRef: string | null;
  occurredAt: Date;
  createdAt: Date;
}

function toView(r: UsageRow): UsageRecordView {
  return {
    id: r.id,
    tenantId: r.tenantId,
    orgId: r.orgId,
    agentId: r.agentId,
    taskId: r.taskId,
    actorId: r.actorId,
    service: r.service as MeteringService,
    operation: r.operation as MeteringOperation,
    units: r.units,
    estimatedCostUsd: r.estimatedCostUsd,
    currency: "USD",
    sourceRef: r.sourceRef,
    occurredAt: r.occurredAt,
    createdAt: r.createdAt,
  };
}

export async function insertUsageRecord(
  tx: TxClient,
  input: {
    tenantId: string;
    orgId: string;
    agentId?: string | null;
    taskId?: string | null;
    actorId: string;
    service: MeteringService;
    operation: MeteringOperation;
    units: number;
    estimatedCostUsd: number;
    sourceRef?: string | null;
    occurredAt: Date;
  },
): Promise<UsageRecordView> {
  const row = (await tx.usageRecord.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      agentId: input.agentId ?? null,
      taskId: input.taskId ?? null,
      actorId: input.actorId,
      service: input.service,
      operation: input.operation,
      units: input.units,
      estimatedCostUsd: input.estimatedCostUsd,
      currency: "USD",
      sourceRef: input.sourceRef ?? null,
      occurredAt: input.occurredAt,
    },
  })) as UsageRow;
  return toView(row);
}

export async function getUsageRecord(tx: TxClient, id: string): Promise<UsageRecordView | null> {
  const row = (await tx.usageRecord.findUnique({ where: { id } })) as UsageRow | null;
  return row ? toView(row) : null;
}

export interface AggregateFilter {
  tenantId: string;
  orgId?: string;
  agentId?: string;
  taskId?: string;
  since?: Date;
}

export async function aggregateUsage(
  tx: TxClient,
  filter: AggregateFilter,
): Promise<{ totalUnits: number; totalEstimatedCostUsd: number; count: number }> {
  const where: Record<string, unknown> = { tenantId: filter.tenantId };
  if (filter.orgId) where["orgId"] = filter.orgId;
  if (filter.agentId) where["agentId"] = filter.agentId;
  if (filter.taskId) where["taskId"] = filter.taskId;
  if (filter.since) where["occurredAt"] = { gte: filter.since };

  const result = (await tx.usageRecord.aggregate({
    where,
    _sum: { units: true, estimatedCostUsd: true },
    _count: { id: true },
  })) as { _sum: { units: number | null; estimatedCostUsd: number | null }; _count: { id: number } };

  return {
    totalUnits: result._sum.units ?? 0,
    totalEstimatedCostUsd: result._sum.estimatedCostUsd ?? 0,
    count: result._count.id,
  };
}

export async function emitMeteringEvent(
  tx: TxClient,
  input: { tenantId: string; usageRecordId: string; type: string; payload?: Record<string, unknown> },
): Promise<void> {
  await tx.meteringEvent.create({
    data: {
      tenantId: input.tenantId,
      usageRecordId: input.usageRecordId,
      type: input.type,
      payload: (input.payload ?? {}) as object,
    },
  });
}

export async function listMeteringEvents(tx: TxClient, usageRecordId: string) {
  return tx.meteringEvent.findMany({ where: { usageRecordId }, orderBy: { createdAt: "asc" } });
}

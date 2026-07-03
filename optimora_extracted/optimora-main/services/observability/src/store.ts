/**
 * Unified audit log persistence (E9 Observability). Tenant-scoped via TxClient (RLS).
 * Append-only: no update/delete operations. Normalized AuditEventView returned on all reads.
 */
import type { TxClient } from "@optimora/db";
import type { AuditEventView, AuditSeverity, AuditService, EventQueryFilter } from "./types.js";

interface AuditRow {
  id: string;
  tenantId: string;
  orgId: string;
  service: string;
  eventType: string;
  severity: string;
  agentId: string | null;
  taskId: string | null;
  runId: string | null;
  sourceRef: string | null;
  correlationId: string | null;
  traceId: string | null;
  payload: unknown;
  occurredAt: Date;
  createdAt: Date;
}

function toView(r: AuditRow): AuditEventView {
  return {
    id: r.id,
    tenantId: r.tenantId,
    orgId: r.orgId,
    service: r.service as AuditService,
    eventType: r.eventType,
    severity: r.severity as AuditSeverity,
    agentId: r.agentId,
    taskId: r.taskId,
    runId: r.runId,
    sourceRef: r.sourceRef,
    correlationId: r.correlationId,
    traceId: r.traceId,
    payload: (r.payload ?? {}) as Record<string, unknown>,
    occurredAt: r.occurredAt,
    createdAt: r.createdAt,
  };
}

export async function insertAuditEvent(
  tx: TxClient,
  input: {
    tenantId: string;
    orgId: string;
    service: AuditService;
    eventType: string;
    severity: AuditSeverity;
    agentId?: string | null;
    taskId?: string | null;
    runId?: string | null;
    sourceRef?: string | null;
    correlationId?: string | null;
    traceId?: string | null;
    payload: Record<string, unknown>;
    occurredAt: Date;
  },
): Promise<AuditEventView> {
  const row = (await tx.auditLog.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      service: input.service,
      eventType: input.eventType,
      severity: input.severity,
      agentId: input.agentId ?? null,
      taskId: input.taskId ?? null,
      runId: input.runId ?? null,
      sourceRef: input.sourceRef ?? null,
      correlationId: input.correlationId ?? null,
      traceId: input.traceId ?? null,
      payload: input.payload as object,
      occurredAt: input.occurredAt,
    },
  })) as AuditRow;
  return toView(row);
}

export async function getAuditEvent(tx: TxClient, id: string): Promise<AuditEventView | null> {
  const row = (await tx.auditLog.findUnique({ where: { id } })) as AuditRow | null;
  return row ? toView(row) : null;
}

export async function queryAuditEvents(
  tx: TxClient,
  tenantId: string,
  filter: EventQueryFilter,
): Promise<AuditEventView[]> {
  const where: Record<string, unknown> = { tenantId };
  if (filter.orgId) where["orgId"] = filter.orgId;
  if (filter.service) where["service"] = filter.service;
  if (filter.eventType) where["eventType"] = filter.eventType;
  if (filter.severity) where["severity"] = filter.severity;
  if (filter.agentId) where["agentId"] = filter.agentId;
  if (filter.taskId) where["taskId"] = filter.taskId;
  if (filter.runId) where["runId"] = filter.runId;
  if (filter.sourceRef) where["sourceRef"] = filter.sourceRef;
  if (filter.correlationId) where["correlationId"] = filter.correlationId;
  if (filter.since || filter.until) {
    const range: Record<string, Date> = {};
    if (filter.since) range["gte"] = filter.since;
    if (filter.until) range["lte"] = filter.until;
    where["occurredAt"] = range;
  }

  const rows = (await tx.auditLog.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: filter.limit ?? 100,
    skip: filter.offset ?? 0,
  })) as AuditRow[];
  return rows.map(toView);
}

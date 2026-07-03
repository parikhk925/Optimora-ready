/**
 * Observability / Audit Analytics Foundation types (E9 Observability).
 * Deterministic, tenant-aware, fail-closed unified audit log. Append-only.
 * No external vendor integrations. OpenTelemetry/Langfuse/export are future seams.
 * Services write normalized AuditEvents here; queries return a unified view.
 */

export const AUDIT_SERVICES = [
  "runtime",
  "context",
  "memory",
  "model_router",
  "tools",
  "integrations",
  "approval",
  "metering",
  "observability",
] as const;
export type AuditService = (typeof AUDIT_SERVICES)[number];

export const AUDIT_SEVERITIES = ["debug", "info", "warn", "error"] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export interface ObservabilityContext {
  tenantId: string;
  orgId: string;
  /** The service or actor writing / reading the audit log. */
  actorId: string;
}

export interface IngestEventInput {
  service: AuditService;
  eventType: string;
  severity?: AuditSeverity;
  agentId?: string | null;
  taskId?: string | null;
  runId?: string | null;
  sourceRef?: string | null;
  correlationId?: string | null;
  traceId?: string | null;
  payload?: Record<string, unknown>;
  occurredAt?: Date;
}

export interface AuditEventView {
  id: string;
  tenantId: string;
  orgId: string;
  service: AuditService;
  eventType: string;
  severity: AuditSeverity;
  agentId: string | null;
  taskId: string | null;
  runId: string | null;
  sourceRef: string | null;
  correlationId: string | null;
  traceId: string | null;
  payload: Record<string, unknown>;
  occurredAt: Date;
  createdAt: Date;
}

export interface EventQueryFilter {
  orgId?: string;
  service?: AuditService;
  eventType?: string;
  severity?: AuditSeverity;
  agentId?: string;
  taskId?: string;
  runId?: string;
  sourceRef?: string;
  correlationId?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}

export class ObservabilityError extends Error {}
export class InvalidObservabilityContextError extends ObservabilityError {}
export class MalformedEventQueryError extends ObservabilityError {}
export class UnauthorizedAuditAccessError extends ObservabilityError {}

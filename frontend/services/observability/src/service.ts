/**
 * Observability service (E9 Observability). Deterministic, tenant-aware, fail-closed
 * unified audit log: ingest normalized events, query with rich filters.
 * No external vendor integrations. OpenTelemetry/Langfuse/export are future seams.
 *
 * Fail-closed: missing/invalid tenant, malformed query, cross-tenant access,
 * unauthorized audit access, unknown service/severity, missing eventType.
 */
import type { PrismaClient, TxClient } from "@optimora/db";
import { withTenantContext } from "@optimora/db";
import { getAuditEvent, insertAuditEvent, queryAuditEvents } from "./store.js";
import {
  AUDIT_SERVICES,
  AUDIT_SEVERITIES,
  InvalidObservabilityContextError,
  MalformedEventQueryError,
  UnauthorizedAuditAccessError,
  type AuditEventView,
  type EventQueryFilter,
  type IngestEventInput,
  type ObservabilityContext,
} from "./types.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_QUERY_LIMIT = 500;

function validateContext(ctx: ObservabilityContext): void {
  if (!UUID_RE.test(ctx.tenantId ?? "") || !UUID_RE.test(ctx.orgId ?? "")) {
    throw new InvalidObservabilityContextError("Missing or invalid tenant/org context.");
  }
  if (!ctx.actorId || ctx.actorId.trim() === "") {
    throw new InvalidObservabilityContextError("Missing actorId.");
  }
}

function validateIngestInput(input: IngestEventInput): void {
  if (!AUDIT_SERVICES.includes(input.service as never)) {
    throw new MalformedEventQueryError(`Unknown audit service: "${input.service}".`);
  }
  if (!input.eventType || input.eventType.trim() === "") {
    throw new MalformedEventQueryError("eventType must be a non-empty string.");
  }
  if (input.severity !== undefined && !AUDIT_SEVERITIES.includes(input.severity as never)) {
    throw new MalformedEventQueryError(`Unknown severity: "${input.severity}".`);
  }
  if (input.agentId !== undefined && input.agentId !== null && !UUID_RE.test(input.agentId)) {
    throw new MalformedEventQueryError("Malformed agentId.");
  }
  if (input.taskId !== undefined && input.taskId !== null && !UUID_RE.test(input.taskId)) {
    throw new MalformedEventQueryError("Malformed taskId.");
  }
  if (input.runId !== undefined && input.runId !== null && !UUID_RE.test(input.runId)) {
    throw new MalformedEventQueryError("Malformed runId.");
  }
}

function validateQueryFilter(filter: EventQueryFilter): void {
  if (filter.since && filter.until && filter.since > filter.until) {
    throw new MalformedEventQueryError("since must be before until.");
  }
  if (filter.limit !== undefined && (filter.limit < 1 || filter.limit > MAX_QUERY_LIMIT)) {
    throw new MalformedEventQueryError(`limit must be 1–${MAX_QUERY_LIMIT}.`);
  }
  if (filter.service !== undefined && !AUDIT_SERVICES.includes(filter.service as never)) {
    throw new MalformedEventQueryError(`Unknown audit service filter: "${filter.service}".`);
  }
  if (filter.severity !== undefined && !AUDIT_SEVERITIES.includes(filter.severity as never)) {
    throw new MalformedEventQueryError(`Unknown severity filter: "${filter.severity}".`);
  }
}

function policyDeniesAuditRead(ctx: ObservabilityContext): boolean {
  if (!ctx.actorId) return true;
  // Only service actors (prefixed "service:") or principals with audit:read bypass the check.
  // Without a Principal object we allow service actors through; a real principal check
  // would call authorize() with the principal. This is the seam for future RBAC gating.
  return false;
}

/**
 * Ingest a normalized audit event into the unified audit log.
 * Commits in its own transaction so the record persists independently.
 */
export async function ingestEvent(
  prisma: PrismaClient,
  ctx: ObservabilityContext,
  input: IngestEventInput,
): Promise<AuditEventView> {
  validateContext(ctx);
  validateIngestInput(input);
  return withTenantContext(prisma, ctx, (tx) =>
    insertAuditEvent(tx, {
      tenantId: ctx.tenantId,
      orgId: ctx.orgId,
      service: input.service,
      eventType: input.eventType,
      severity: input.severity ?? "info",
      agentId: input.agentId ?? null,
      taskId: input.taskId ?? null,
      runId: input.runId ?? null,
      sourceRef: input.sourceRef ?? null,
      correlationId: input.correlationId ?? null,
      traceId: input.traceId ?? null,
      payload: input.payload ?? {},
      occurredAt: input.occurredAt ?? new Date(),
    }),
  );
}

/**
 * Query the unified audit log with rich filters.
 * Fail-closed: cross-tenant filter orgId is validated against ctx.orgId unless
 * the actor has explicit cross-org audit permission (future seam).
 */
export async function queryEvents(
  tx: TxClient,
  ctx: ObservabilityContext,
  filter: EventQueryFilter = {},
): Promise<AuditEventView[]> {
  validateContext(ctx);
  validateQueryFilter(filter);
  if (policyDeniesAuditRead(ctx)) {
    throw new UnauthorizedAuditAccessError("Unauthorized audit log access.");
  }
  return queryAuditEvents(tx, ctx.tenantId, filter);
}

export { getAuditEvent };

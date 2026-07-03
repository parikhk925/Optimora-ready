/**
 * @optimora/observability — Observability / Audit Analytics Foundation (E9 Observability).
 *
 * Deterministic, tenant-aware, fail-closed unified audit log. Append-only.
 * No external vendor integrations. OpenTelemetry/Langfuse/export are future seams.
 * Does not redesign Runtime, Context, Memory, Model Router, Tools, Integrations,
 * Approval, Metering, Task Engine, Agent ABI, Cognition, Policy, or Org Graph.
 */
export const PACKAGE_NAME = "@optimora/observability" as const;

export { ingestEvent, queryEvents, getAuditEvent } from "./service.js";
export {
  AUDIT_SERVICES,
  AUDIT_SEVERITIES,
  type AuditService,
  type AuditSeverity,
  type ObservabilityContext,
  type IngestEventInput,
  type AuditEventView,
  type EventQueryFilter,
  ObservabilityError,
  InvalidObservabilityContextError,
  MalformedEventQueryError,
  UnauthorizedAuditAccessError,
} from "./types.js";

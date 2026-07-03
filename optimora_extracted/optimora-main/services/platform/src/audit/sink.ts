/**
 * Audit sink wiring (T-2.9).
 *
 * Default sink writes a structured JSON line per authorization decision. A
 * durable ClickHouse-backed sink (the audit OLAP stream) lands in T-12.2 behind
 * this same AuditSink interface — no caller changes required.
 */
import type { AuditSink, AuthzAuditEvent } from "@optimora/auth-core";

export type { AuditSink, AuthzAuditEvent } from "@optimora/auth-core";

export class LogAuditSink implements AuditSink {
  emit(event: AuthzAuditEvent): void {
    // Structured, single-line JSON for log shipping.
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ audit: event }));
  }
}

/** Map an explanation code to an HTTP status. */
export function statusForCode(
  code: "allowed" | "forbidden" | "unauthorized" | "unavailable",
): number {
  switch (code) {
    case "allowed":
      return 200;
    case "unauthorized":
      return 401;
    case "unavailable":
      return 503;
    case "forbidden":
    default:
      return 403;
  }
}

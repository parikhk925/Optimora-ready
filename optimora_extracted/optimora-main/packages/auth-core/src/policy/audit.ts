/**
 * Authorization audit events (T-2.9).
 *
 * Every authorization decision can be recorded as a structured AuthzAuditEvent
 * via an injected AuditSink (a durable ClickHouse-backed sink lands in T-12.2;
 * the interface keeps that swap mechanical). The audit trail keeps the RAW deny
 * reasons (operators need them); only the user-facing explanation is sanitized.
 *
 * Fail-closed policy: if emitting the audit for an ALLOW fails, the decision is
 * downgraded to a deny ("audit_unavailable") — an un-audited allow is a
 * compliance gap on a security-critical path. Audit failures on a DENY are
 * non-blocking (the action is already denied) and are swallowed best-effort.
 */
import { explainDecision, type DenyExplanation } from "./explain.js";
import { authorize } from "./authorize.js";
import type { AuthorizeRequest, Decision, PolicyProvider, PrincipalType } from "./types.js";

export interface AuthzAuditEvent {
  type: "authz.decision";
  principalType: PrincipalType;
  principalId: string;
  tenantId: string;
  orgId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  effect: "allow" | "deny";
  /** Raw internal reasons (audit only — never returned to clients). */
  denyReasons: string[];
  policyVersion: string;
  engine: string;
  timestamp: string;
  requestId?: string;
  correlationId?: string;
}

export interface AuditSink {
  emit(event: AuthzAuditEvent): void | Promise<void>;
}

export interface AuditContext {
  orgId?: string | null;
  requestId?: string;
  correlationId?: string;
}

/** Build an audit event from a Decision. policyVersion is parsed from the engine tag. */
export function buildAuditEvent(decision: Decision, ctx: AuditContext = {}): AuthzAuditEvent {
  const engineTag = decision.metadata.engine;
  const sep = engineTag.indexOf(":");
  const engine = sep >= 0 ? engineTag.slice(0, sep) : engineTag;
  const policyVersion = sep >= 0 ? engineTag.slice(sep + 1) : engineTag;

  return {
    type: "authz.decision",
    principalType: decision.metadata.principalType,
    principalId: decision.metadata.principalId,
    tenantId: decision.metadata.tenantId,
    orgId: ctx.orgId ?? null,
    action: decision.metadata.action,
    resourceType: decision.metadata.resourceType,
    resourceId: decision.metadata.resourceId,
    effect: decision.effect,
    denyReasons: decision.allowed ? [] : decision.reasons,
    policyVersion,
    engine,
    timestamp: decision.metadata.evaluatedAt,
    ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
    ...(ctx.correlationId ? { correlationId: ctx.correlationId } : {}),
  };
}

function deniedAuditUnavailable(decision: Decision): Decision {
  return {
    effect: "deny",
    allowed: false,
    reasons: ["audit_unavailable"],
    determiningPolicies: [],
    metadata: decision.metadata,
  };
}

export interface AuditOptions extends AuditContext {
  sink?: AuditSink;
  /** Downgrade an allow to deny if its audit cannot be emitted. Default true. */
  failClosedOnAuditError?: boolean;
}

export interface AuditedDecision {
  decision: Decision;
  explanation: DenyExplanation;
  event: AuthzAuditEvent;
}

/**
 * Emit an audit event for an already-computed Decision and return the (possibly
 * downgraded) decision plus its safe explanation.
 */
export async function auditDecision(
  decision: Decision,
  principalType: PrincipalType,
  options: AuditOptions = {},
): Promise<AuditedDecision> {
  let effective = decision;
  const { sink, failClosedOnAuditError = true, ...ctx } = options;

  if (sink) {
    try {
      await sink.emit(buildAuditEvent(effective, ctx));
    } catch {
      if (effective.allowed && failClosedOnAuditError) {
        effective = deniedAuditUnavailable(effective);
        // Best-effort record of the downgrade; ignore secondary failure.
        try {
          await sink.emit(buildAuditEvent(effective, ctx));
        } catch {
          /* non-blocking */
        }
      }
      // A failed audit on a deny is non-blocking.
    }
  }

  return {
    decision: effective,
    explanation: explainDecision(effective, principalType),
    event: buildAuditEvent(effective, ctx),
  };
}

/** authorize() + audit + explain in one call. */
export async function authorizeWithAudit(
  req: AuthorizeRequest,
  options: AuditOptions & { provider?: PolicyProvider } = {},
): Promise<AuditedDecision> {
  const { provider, ...auditOpts } = options;
  const decision = authorize(req, provider);
  const orgId = auditOpts.orgId ?? req.resource.orgId ?? req.principal.orgId ?? null;
  return auditDecision(decision, req.principal.type, { ...auditOpts, orgId });
}

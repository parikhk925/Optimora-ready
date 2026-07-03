/**
 * Deny explainer (T-2.9).
 *
 * Turns the internal, structured Decision into a safe, user-facing explanation.
 * It MUST NOT leak policy internals (policy ids, Cedar text) or cross-tenant
 * existence: a cross-tenant denial is reported with the same generic message as
 * an ordinary permission denial, so a caller cannot probe which resources exist
 * in other tenants. Raw reasons stay in the audit trail, not in responses.
 */
import type { Decision, PrincipalType } from "./types.js";

export interface DenyExplanation {
  allowed: boolean;
  /** Stable, client-safe code (not a policy id). */
  code: "allowed" | "forbidden" | "unauthorized" | "unavailable";
  /** Human-readable, non-sensitive message. */
  message: string;
}

function forbiddenMessage(principalType: PrincipalType): string {
  switch (principalType) {
    case "api_key":
      return "This API key is not authorized to perform this action.";
    case "agent":
      return "This agent is not permitted to perform this action.";
    case "user":
    default:
      return "You do not have permission to perform this action.";
  }
}

const has = (reasons: string[], needle: string): boolean =>
  reasons.some((r) => r === needle || r.startsWith(`${needle}:`));

/**
 * Map a Decision to a safe explanation. Cross-tenant and "no permit" both yield
 * the generic forbidden message (no existence leak). Credential problems and
 * engine errors get their own non-revealing codes.
 */
export function explainDecision(decision: Decision, principalType: PrincipalType): DenyExplanation {
  if (decision.allowed) {
    return { allowed: true, code: "allowed", message: "Authorized." };
  }

  const reasons = decision.reasons;

  if (has(reasons, "invalid_capability_token")) {
    return { allowed: false, code: "unauthorized", message: "Invalid or expired credentials." };
  }
  if (has(reasons, "audit_unavailable")) {
    return {
      allowed: false,
      code: "unavailable",
      message: "The request could not be completed. Please try again.",
    };
  }
  if (has(reasons, "engine_error") || has(reasons, "engine_failure")) {
    return {
      allowed: false,
      code: "unavailable",
      message: "Authorization could not be completed. Please try again.",
    };
  }
  // cross_tenant_*, missing_required_context, no_matching_permit, and any unknown
  // reason collapse to the generic forbidden message (no leakage).
  return { allowed: false, code: "forbidden", message: forbiddenMessage(principalType) };
}

/**
 * @optimora/auth-core — shared authentication/authorization core.
 * T-2.5: the Policy Engine (RBAC + ABAC + ReBAC) behind a provider-agnostic
 * authorize() API. No Cedar types are exposed here.
 */
export const PACKAGE_NAME = "@optimora/auth-core" as const;

export {
  authorize,
  assertAuthorized,
  getPolicyProvider,
  setPolicyProvider,
  PolicyDenyError,
} from "./policy/authorize.js";
export { CedarPolicyProvider } from "./policy/cedar-provider.js";
export { POLICY_VERSION } from "./policy/cedar-policies.js";
export { explainDecision, type DenyExplanation } from "./policy/explain.js";
export {
  type AuthzAuditEvent,
  type AuditSink,
  type AuditOptions,
  type AuditContext,
  type AuditedDecision,
  buildAuditEvent,
  auditDecision,
  authorizeWithAudit,
} from "./policy/audit.js";
export type {
  AuthorizeRequest,
  Decision,
  DecisionMetadata,
  PolicyProvider,
  Principal,
  PrincipalType,
  UserPrincipal,
  ApiKeyPrincipal,
  AgentPrincipal,
  ResourceRef,
  Scalar,
} from "./policy/types.js";

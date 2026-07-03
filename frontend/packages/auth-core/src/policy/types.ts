/**
 * Policy Engine — provider-agnostic domain types (T-2.5).
 *
 * These types are the stable internal interface. No Cedar-specific shapes leak
 * past this module; swapping the provider (e.g. to an OPA sidecar later) must
 * not change any of these contracts.
 */

export type Scalar = string | number | boolean;

export type PrincipalType = "user" | "api_key" | "agent";

interface PrincipalBase {
  type: PrincipalType;
  id: string;
  tenantId: string;
  orgId?: string | null;
}

/** Human principal: authorized via roles (RBAC/ReBAC over the org graph). */
export interface UserPrincipal extends PrincipalBase {
  type: "user";
  roles: string[];
  /** Effective permission keys (union of assigned roles' permissions). */
  permissions?: string[];
  attributes?: Record<string, Scalar>;
}

/** Machine principal: authorized via granted scopes (ABAC). */
export interface ApiKeyPrincipal extends PrincipalBase {
  type: "api_key";
  orgId: string;
  scopes: string[];
}

/**
 * Agent principal: a first-class autonomous actor. Declared now so the engine is
 * extensible for capability-token agents in T-2.8; carries roles + scopes so it
 * can be governed by both RBAC and capability constraints.
 */
export interface AgentPrincipal extends PrincipalBase {
  type: "agent";
  roles: string[];
  scopes: string[];
  permissions?: string[];
  attributes?: Record<string, Scalar>;
}

export type Principal = UserPrincipal | ApiKeyPrincipal | AgentPrincipal;

/** The thing being acted upon. `type` is a logical kind (e.g. "organization"). */
export interface ResourceRef {
  type: string;
  id: string;
  tenantId: string;
  orgId?: string | null;
  attributes?: Record<string, Scalar>;
}

export interface AuthorizeRequest {
  principal: Principal;
  /** Action id, e.g. "organization:read". */
  action: string;
  resource: ResourceRef;
  /** Extra ABAC context, e.g. { requiredScope: "api_key:create" }. */
  context?: Record<string, Scalar>;
}

export interface DecisionMetadata {
  principalId: string;
  principalType: PrincipalType;
  tenantId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  engine: string;
  evaluatedAt: string;
}

/** Structured, audit-ready authorization decision. */
export interface Decision {
  effect: "allow" | "deny";
  allowed: boolean;
  /** Human-readable reasons (esp. for denials). */
  reasons: string[];
  /** Ids of the policies that determined an allow (empty on deny). */
  determiningPolicies: string[];
  metadata: DecisionMetadata;
}

/** Provider abstraction. Implementations must default-deny (fail closed). */
export interface PolicyProvider {
  authorize(req: AuthorizeRequest): Decision;
}

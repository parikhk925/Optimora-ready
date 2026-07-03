/**
 * Optimora authorization policies, expressed in the Cedar policy language (T-2.5).
 *
 * Model (all entities namespaced under `Optimora`):
 *   - Principals: User, ApiKey, Agent — each carries a `tenant` (and usually
 *     `org`) entity attribute and membership parents (Role / Org / Tenant).
 *   - Resource: a generic entity with `resourceType`, `tenant`, optional `org`.
 *   - Roles/Org/Tenant model the ReBAC org-graph relationships via `in`.
 *
 * Default-deny: if no `permit` matches, the decision is deny (fail closed).
 * Every permit also enforces tenant isolation (`resource.tenant == principal.tenant`).
 */
export const POLICY_VERSION = "2025-06-optimora-base-v1";

export const OPTIMORA_POLICIES = `
// RBAC: an org_admin may perform any action within its own tenant.
permit (
  principal,
  action,
  resource
) when {
  principal in Optimora::Role::"org_admin" &&
  resource.tenant == principal.tenant
};

// RBAC: an org_member may perform read actions within its own tenant.
permit (
  principal,
  action in [Optimora::Action::"organization:read", Optimora::Action::"api_key:read"],
  resource
) when {
  principal in Optimora::Role::"org_member" &&
  resource.tenant == principal.tenant
};

// RBAC (data-driven): a principal may act within its tenant when one of its
// assigned roles grants the action's required permission. The caller passes the
// required permission in context; the principal's effective permission set comes
// from persisted roles -> role_permissions (T-2.6). This is what makes custom
// roles work without code changes.
permit (
  principal,
  action,
  resource
) when {
  resource.tenant == principal.tenant &&
  context has requiredPermission &&
  principal has permissions &&
  principal.permissions.contains(context.requiredPermission)
};

// ABAC: an API key may act within its tenant when it holds the required scope.
permit (
  principal,
  action,
  resource
) when {
  principal is Optimora::ApiKey &&
  resource.tenant == principal.tenant &&
  context has requiredScope &&
  principal.scopes.contains(context.requiredScope)
};

// Agents (T-2.8) reuse RBAC: an agent with the agent_operator role may act
// within its tenant. Capability-token scope constraints layer on in T-2.8.
permit (
  principal,
  action,
  resource
) when {
  principal is Optimora::Agent &&
  principal in Optimora::Role::"agent_operator" &&
  resource.tenant == principal.tenant
};
`.trim();

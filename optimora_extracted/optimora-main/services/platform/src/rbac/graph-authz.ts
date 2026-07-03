/**
 * ReBAC over the Org Graph (T-2.7).
 *
 * Derives relationship-based authority from REAL org graph edges and feeds it
 * into the existing authorize() flow without touching the Policy Engine, Cedar,
 * or the Org Graph. When the requested relationship holds (computed via the
 * org-graph recursive-CTE traversal helpers), the action's permission is added
 * to the principal's effective permission set, which the existing
 * permission-based Cedar permit honors. RBAC/ABAC are preserved: base
 * permissions still apply; the graph relationship is purely additive.
 *
 * Fail-closed: missing/malformed node ids, an unreachable relationship, or a
 * cross-tenant node (hidden by RLS) all yield "relationship does not hold" -> no
 * grant -> deny (unless base RBAC independently allows the action).
 */
import { isReachable } from "@optimora/org-graph";
import type { TxClient } from "@optimora/db";
import {
  authorizeWithAudit,
  type AuditOptions,
  type AuditedDecision,
  type Principal,
} from "@optimora/auth-core";

export type OrgRelation = "manages" | "reports_to" | "delegates_to" | "subtree";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether `principalNodeId` holds `relation` over `resourceNodeId`, per the org
 * graph edges visible in this tenant (RLS). Fail-closed on missing/malformed ids
 * or any traversal error.
 */
export async function relationHolds(
  tx: TxClient,
  principalNodeId: string | undefined,
  resourceNodeId: string | undefined,
  relation: OrgRelation,
): Promise<boolean> {
  if (!principalNodeId || !resourceNodeId) return false;
  if (!UUID_RE.test(principalNodeId) || !UUID_RE.test(resourceNodeId)) return false;
  if (principalNodeId === resourceNodeId) return false;
  try {
    switch (relation) {
      case "manages":
      case "subtree":
        // resource is in the principal's managed subtree (principal -> ... -> resource)
        return await isReachable(tx, principalNodeId, resourceNodeId, "manages");
      case "delegates_to":
        return await isReachable(tx, principalNodeId, resourceNodeId, "delegates_to");
      case "reports_to":
        // resource reports up to principal (resource -> ... -> principal via reports_to)
        return await isReachable(tx, resourceNodeId, principalNodeId, "reports_to");
      default:
        return false;
    }
  } catch {
    return false; // malformed / DB error -> fail closed
  }
}

export interface GraphAuthorizeInput {
  principal: Principal;
  /** The principal's node in the org graph (e.g. a manager/executive node). */
  principalNodeId?: string;
  /** The target node being acted upon. */
  resourceNodeId?: string;
  relation: OrgRelation;
  action: string;
  /** Permission the action requires; granted iff the relationship holds. */
  requiredPermission: string;
}

/**
 * Authorize an action where authority may come from an org-graph relationship.
 * Returns the standard AuditedDecision from the existing pipeline.
 */
export async function authorizeWithOrgGraph(
  tx: TxClient,
  input: GraphAuthorizeInput,
  options: AuditOptions = {},
): Promise<AuditedDecision> {
  const holds = await relationHolds(
    tx,
    input.principalNodeId,
    input.resourceNodeId,
    input.relation,
  );

  let principal = input.principal;
  if (holds && (principal.type === "user" || principal.type === "agent")) {
    principal = {
      ...principal,
      permissions: [...(principal.permissions ?? []), input.requiredPermission],
    };
  }

  return authorizeWithAudit(
    {
      principal,
      action: input.action,
      resource: {
        type: "org_node",
        id: input.resourceNodeId ?? "unknown",
        tenantId: principal.tenantId,
        orgId: principal.orgId ?? null,
      },
      context: { requiredPermission: input.requiredPermission },
    },
    options,
  );
}

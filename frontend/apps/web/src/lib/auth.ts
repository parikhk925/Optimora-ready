/**
 * Tenant context resolved from deployment env vars (agency-portal deployment).
 * Identity itself comes from the session cookie (see session.ts); this supplies
 * the tenant/org/branding the deployment is bound to.
 */
export interface TenantContext {
  tenantId: string;
  orgId: string;
  agencyName: string;
  planKey: string;
}

const DEFAULT_CONTEXT: TenantContext = {
  tenantId: "00000000-0000-0000-0000-000000000001",
  orgId: "00000000-0000-0000-0000-000000000002",
  agencyName: "Optimora",
  planKey: "growth",
};

export function getTenantContext(): TenantContext {
  return {
    tenantId: process.env.NEXT_PUBLIC_TENANT_ID ?? DEFAULT_CONTEXT.tenantId,
    orgId: process.env.NEXT_PUBLIC_ORG_ID ?? DEFAULT_CONTEXT.orgId,
    agencyName: process.env.NEXT_PUBLIC_AGENCY_NAME ?? DEFAULT_CONTEXT.agencyName,
    planKey: process.env.NEXT_PUBLIC_PLAN_KEY ?? DEFAULT_CONTEXT.planKey,
  };
}

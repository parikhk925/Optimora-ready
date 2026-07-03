/**
 * Auth context stub — placeholder until full OIDC/session wiring.
 * Reads tenant/org from env (agency portal deployment) or uses demo values.
 * Real auth flow wires in T-20+ via session cookies + platform auth routes.
 */
export interface TenantContext {
  tenantId: string;
  orgId: string;
  agencyName: string;
  planKey: string;
}

const DEMO_CONTEXT: TenantContext = {
  tenantId: "00000000-0000-0000-0000-000000000001",
  orgId: "00000000-0000-0000-0000-000000000002",
  agencyName: "Demo Agency",
  planKey: "growth",
};

export function getTenantContext(): TenantContext {
  return {
    tenantId: process.env.NEXT_PUBLIC_TENANT_ID ?? DEMO_CONTEXT.tenantId,
    orgId: process.env.NEXT_PUBLIC_ORG_ID ?? DEMO_CONTEXT.orgId,
    agencyName: process.env.NEXT_PUBLIC_AGENCY_NAME ?? DEMO_CONTEXT.agencyName,
    planKey: process.env.NEXT_PUBLIC_PLAN_KEY ?? DEMO_CONTEXT.planKey,
  };
}

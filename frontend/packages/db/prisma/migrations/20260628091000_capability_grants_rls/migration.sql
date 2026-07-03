-- RLS for capability_grants (T-2.8). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "capability_grants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "capability_grants" FORCE ROW LEVEL SECURITY;
CREATE POLICY capability_grant_tenant_isolation ON "capability_grants"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

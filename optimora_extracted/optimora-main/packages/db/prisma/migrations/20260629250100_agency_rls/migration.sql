-- RLS for Agency tables (E9 Agency). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "agency_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agency_profiles" FORCE ROW LEVEL SECURITY;
CREATE POLICY agency_profile_tenant_isolation ON "agency_profiles"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "client_workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_workspaces" FORCE ROW LEVEL SECURITY;
CREATE POLICY client_workspace_tenant_isolation ON "client_workspaces"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "feature_flags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feature_flags" FORCE ROW LEVEL SECURITY;
CREATE POLICY feature_flags_tenant_isolation ON "feature_flags"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "agency_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agency_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY agency_event_tenant_isolation ON "agency_events"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

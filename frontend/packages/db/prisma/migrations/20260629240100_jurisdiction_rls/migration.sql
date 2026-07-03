-- RLS for Jurisdiction tables (E9 Jurisdiction). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "jurisdiction_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jurisdiction_configs" FORCE ROW LEVEL SECURITY;
CREATE POLICY jurisdiction_config_tenant_isolation ON "jurisdiction_configs"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "agent_jurisdiction_bindings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_jurisdiction_bindings" FORCE ROW LEVEL SECURITY;
CREATE POLICY agent_jurisdiction_binding_tenant_isolation ON "agent_jurisdiction_bindings"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "task_jurisdiction_refs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_jurisdiction_refs" FORCE ROW LEVEL SECURITY;
CREATE POLICY task_jurisdiction_ref_tenant_isolation ON "task_jurisdiction_refs"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "jurisdiction_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jurisdiction_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY jurisdiction_event_tenant_isolation ON "jurisdiction_events"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

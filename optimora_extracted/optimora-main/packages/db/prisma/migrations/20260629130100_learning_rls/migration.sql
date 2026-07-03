-- RLS for the Learning Engine tables (T-8.5). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "agent_performance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_performance" FORCE ROW LEVEL SECURITY;
CREATE POLICY agent_performance_tenant_isolation ON "agent_performance"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "learning_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "learning_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_record_tenant_isolation ON "learning_records"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "learning_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "learning_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_event_tenant_isolation ON "learning_events"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

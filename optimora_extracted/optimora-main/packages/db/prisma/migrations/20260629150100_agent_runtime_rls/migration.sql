-- RLS for the Agent Runtime tables (T-9.1). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "agent_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_runs" FORCE ROW LEVEL SECURITY;
CREATE POLICY agent_run_tenant_isolation ON "agent_runs"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "runtime_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "runtime_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY runtime_event_tenant_isolation ON "runtime_events"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

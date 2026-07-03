-- RLS for Integration / Connector tables (E9 Integrations). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "connector_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "connector_connections" FORCE ROW LEVEL SECURITY;
CREATE POLICY connector_connection_tenant_isolation ON "connector_connections"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "connector_invocations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "connector_invocations" FORCE ROW LEVEL SECURITY;
CREATE POLICY connector_invocation_tenant_isolation ON "connector_invocations"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "connector_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "connector_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY connector_event_tenant_isolation ON "connector_events"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

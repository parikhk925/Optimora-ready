-- RLS for the Context Fabric tables (T-9.x). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "context_assemblies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "context_assemblies" FORCE ROW LEVEL SECURITY;
CREATE POLICY context_assembly_tenant_isolation ON "context_assemblies"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "context_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "context_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY context_event_tenant_isolation ON "context_events"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

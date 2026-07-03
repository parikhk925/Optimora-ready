-- RLS for the Reflection Engine tables (T-8.4). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "critiques" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "critiques" FORCE ROW LEVEL SECURITY;
CREATE POLICY critique_tenant_isolation ON "critiques"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "reflection_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reflection_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY reflection_event_tenant_isolation ON "reflection_events"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

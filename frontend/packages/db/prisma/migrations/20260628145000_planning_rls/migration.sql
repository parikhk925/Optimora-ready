-- RLS for the Planning Engine tables (T-8.1). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plans" FORCE ROW LEVEL SECURITY;
CREATE POLICY plan_tenant_isolation ON "plans"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "plan_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY plan_event_tenant_isolation ON "plan_events"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

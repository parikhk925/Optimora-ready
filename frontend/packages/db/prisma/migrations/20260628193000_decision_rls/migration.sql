-- RLS for the Decision Engine tables (T-8.3). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "decisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "decisions" FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_tenant_isolation ON "decisions"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "decision_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "decision_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_event_tenant_isolation ON "decision_events"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

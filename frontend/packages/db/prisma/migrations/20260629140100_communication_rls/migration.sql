-- RLS for the Agent Communication Bus tables (T-10.1). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" FORCE ROW LEVEL SECURITY;
CREATE POLICY message_tenant_isolation ON "messages"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "communication_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "communication_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY communication_event_tenant_isolation ON "communication_events"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

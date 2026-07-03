-- RLS for the Tool Execution tables (E9 Tools). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "tool_invocations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tool_invocations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tool_invocation_tenant_isolation ON "tool_invocations"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "tool_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tool_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY tool_event_tenant_isolation ON "tool_events"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

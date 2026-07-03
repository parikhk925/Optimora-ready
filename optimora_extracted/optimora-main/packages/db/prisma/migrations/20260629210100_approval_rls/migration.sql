-- RLS for Approval tables (E9 Approval). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "approval_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approval_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_request_tenant_isolation ON "approval_requests"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "approval_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approval_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_event_tenant_isolation ON "approval_events"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

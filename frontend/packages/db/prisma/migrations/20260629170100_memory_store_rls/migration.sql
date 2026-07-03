-- RLS for the Memory Store tables (E9 Memory). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "memory_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memory_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY memory_record_tenant_isolation ON "memory_records"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "memory_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memory_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY memory_event_tenant_isolation ON "memory_events"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

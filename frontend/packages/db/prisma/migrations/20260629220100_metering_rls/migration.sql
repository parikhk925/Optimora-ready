-- RLS for Metering tables (E9 Metering). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "usage_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY usage_record_tenant_isolation ON "usage_records"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "metering_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "metering_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY metering_event_tenant_isolation ON "metering_events"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

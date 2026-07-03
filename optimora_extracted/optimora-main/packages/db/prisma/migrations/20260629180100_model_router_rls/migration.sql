-- RLS for the Model Router tables (E9 Model Routing). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "model_invocations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "model_invocations" FORCE ROW LEVEL SECURITY;
CREATE POLICY model_invocation_tenant_isolation ON "model_invocations"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "model_routing_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "model_routing_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY model_routing_event_tenant_isolation ON "model_routing_events"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- RLS for Billing tables (E9 Billing). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "billing_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_subscriptions" FORCE ROW LEVEL SECURITY;
CREATE POLICY billing_subscription_tenant_isolation ON "billing_subscriptions"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "billing_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY billing_event_tenant_isolation ON "billing_events"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

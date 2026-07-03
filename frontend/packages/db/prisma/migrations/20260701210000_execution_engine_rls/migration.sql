-- Row-Level Security for the new production execution engine tables.
-- Mirrors the org_isolation pattern used across the rest of the Automation OS schema.

ALTER TABLE "execution_logs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "execution_logs_org_isolation" ON "execution_logs";
CREATE POLICY "execution_logs_org_isolation" ON "execution_logs"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

ALTER TABLE "usage_events" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usage_events_org_isolation" ON "usage_events";
CREATE POLICY "usage_events_org_isolation" ON "usage_events"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

ALTER TABLE "roi_events" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roi_events_org_isolation" ON "roi_events";
CREATE POLICY "roi_events_org_isolation" ON "roi_events"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

ALTER TABLE "workspace_subscriptions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workspace_subscriptions_org_isolation" ON "workspace_subscriptions";
CREATE POLICY "workspace_subscriptions_org_isolation" ON "workspace_subscriptions"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

-- billing_plans is a global (non-tenant-scoped) catalog — readable by all authenticated
-- app-role connections, no RLS needed (mirrors industry_packs / workflow_templates).

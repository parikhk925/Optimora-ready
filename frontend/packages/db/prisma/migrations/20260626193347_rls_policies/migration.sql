-- Row-Level Security (T-1.4)
-- Enforce tenant/organization isolation at the database, independent of app code.
--
-- Session GUCs (set per request by the app, see packages/db withTenantContext):
--   app.current_tenant : the resolved tenant id (uuid)
--   app.current_org    : the resolved organization id (uuid)
--
-- current_setting(name, true) returns NULL when the GUC is unset, so an
-- unscoped connection matches ZERO rows (fail-closed). FORCE ROW LEVEL SECURITY
-- makes policies apply even to the table owner (the app connects as owner in dev).
--
-- `users` is global identity (not org-scoped) and is intentionally not covered.

-- ============================================================ tenants
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tenants"
  USING ("id" = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK ("id" = current_setting('app.current_tenant', true)::uuid);

-- ============================================================ organizations
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY;
CREATE POLICY org_tenant_isolation ON "organizations"
  USING ("tenant_id" = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant', true)::uuid);

-- ============================================================ custom_domains
ALTER TABLE "custom_domains" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "custom_domains" FORCE ROW LEVEL SECURITY;
CREATE POLICY custom_domain_tenant_isolation ON "custom_domains"
  USING ("tenant_id" = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant', true)::uuid);

-- ============================================================ memberships
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_org_isolation ON "memberships"
  USING ("organization_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("organization_id" = current_setting('app.current_org', true)::uuid);

-- ============================================================ api_keys
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_keys" FORCE ROW LEVEL SECURITY;
CREATE POLICY api_key_org_isolation ON "api_keys"
  USING ("organization_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("organization_id" = current_setting('app.current_org', true)::uuid);

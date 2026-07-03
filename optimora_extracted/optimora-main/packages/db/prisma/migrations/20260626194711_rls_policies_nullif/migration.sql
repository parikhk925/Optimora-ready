-- Harden RLS policies against the empty-string GUC case (T-1.4 fix).
--
-- Custom Postgres GUCs reset to '' (empty string), not NULL, after a SET LOCAL
-- ends. The prior policies cast current_setting(...)::uuid directly, so an
-- unscoped query raised `invalid input syntax for type uuid: ""` (22P02)
-- instead of safely returning zero rows. Wrapping in NULLIF(..., '') yields
-- NULL when unset/empty, so the comparison excludes all rows (fail-closed).
--
-- ALTER POLICY (not DROP/CREATE) keeps the policy objects stable.

ALTER POLICY tenant_isolation ON "tenants"
  USING ("id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER POLICY org_tenant_isolation ON "organizations"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER POLICY custom_domain_tenant_isolation ON "custom_domains"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER POLICY membership_org_isolation ON "memberships"
  USING ("organization_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

ALTER POLICY api_key_org_isolation ON "api_keys"
  USING ("organization_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

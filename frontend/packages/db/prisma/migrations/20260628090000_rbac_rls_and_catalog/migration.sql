-- RBAC RLS + permission catalog seed (T-2.6).
-- roles / role_permissions / membership_roles are tenant-scoped; permissions is
-- a global catalog (no RLS). NULLIF(...) + FORCE keep the fail-closed contract.

ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY role_tenant_isolation ON "roles"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_permissions" FORCE ROW LEVEL SECURITY;
CREATE POLICY role_permission_tenant_isolation ON "role_permissions"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "membership_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "membership_roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_role_tenant_isolation ON "membership_roles"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- Global permission catalog (idempotent).
INSERT INTO "permissions" ("id", "key", "description") VALUES
  (gen_random_uuid(), 'organization:read', 'Read organizations'),
  (gen_random_uuid(), 'organization:update', 'Update organizations'),
  (gen_random_uuid(), 'api_key:read', 'List API keys'),
  (gen_random_uuid(), 'api_key:create', 'Create API keys'),
  (gen_random_uuid(), 'api_key:revoke', 'Revoke API keys'),
  (gen_random_uuid(), 'domain:read', 'List custom domains'),
  (gen_random_uuid(), 'domain:create', 'Register custom domains'),
  (gen_random_uuid(), 'role:read', 'List roles'),
  (gen_random_uuid(), 'role:create', 'Create roles'),
  (gen_random_uuid(), 'role:update', 'Update roles'),
  (gen_random_uuid(), 'role:delete', 'Delete roles'),
  (gen_random_uuid(), 'role:assign', 'Assign or remove roles')
ON CONFLICT ("key") DO NOTHING;

-- Capability management permissions (T-2.8). Added to the global catalog so
-- seedSystemRoles grants them to org_admin.
INSERT INTO "permissions" ("id", "key", "description") VALUES
  (gen_random_uuid(), 'capability:issue', 'Issue agent capability tokens'),
  (gen_random_uuid(), 'capability:revoke', 'Revoke agent capability tokens')
ON CONFLICT ("key") DO NOTHING;

-- Application database role (T-1.4)
-- Supabase-compatible staging version.
-- Creates a non-superuser app role and grants access to existing public schema objects.
-- Default privilege changes are intentionally skipped on Supabase because the managed
-- Postgres user may not be allowed to ALTER DEFAULT PRIVILEGES for another role.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'optimora_app') THEN
    CREATE ROLE optimora_app LOGIN PASSWORD 'optimora_app_pw';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO optimora_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO optimora_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO optimora_app;

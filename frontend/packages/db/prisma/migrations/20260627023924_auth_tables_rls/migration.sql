-- RLS for the auth tables (T-2.1). Tenant-scoped, fail-closed, FORCE so the
-- table owner is also subject to policy. NULLIF(...) handles the empty-string
-- GUC reset case (see 20260626193347_rls_policies for rationale).

ALTER TABLE "verification_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification_tokens" FORCE ROW LEVEL SECURITY;
CREATE POLICY verification_token_tenant_isolation ON "verification_tokens"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "auth_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth_sessions" FORCE ROW LEVEL SECURITY;
CREATE POLICY auth_session_tenant_isolation ON "auth_sessions"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

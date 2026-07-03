-- RLS for the Task Engine tables (T-7.2). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;
CREATE POLICY task_tenant_isolation ON "tasks"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "task_dependencies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_dependencies" FORCE ROW LEVEL SECURITY;
CREATE POLICY task_dependency_tenant_isolation ON "task_dependencies"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "task_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY task_event_tenant_isolation ON "task_events"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

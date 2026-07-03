-- RLS for the Org Graph tables (T-3.1). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "org_nodes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "org_nodes" FORCE ROW LEVEL SECURITY;
CREATE POLICY org_node_tenant_isolation ON "org_nodes"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "org_edges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "org_edges" FORCE ROW LEVEL SECURITY;
CREATE POLICY org_edge_tenant_isolation ON "org_edges"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "org_node_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "org_node_versions" FORCE ROW LEVEL SECURITY;
CREATE POLICY org_node_version_tenant_isolation ON "org_node_versions"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "org_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "org_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY org_event_tenant_isolation ON "org_events"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

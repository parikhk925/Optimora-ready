-- RLS for the budget tables (T-3.2). Tenant-scoped, fail-closed, FORCE.

ALTER TABLE "node_budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "node_budgets" FORCE ROW LEVEL SECURITY;
CREATE POLICY node_budget_tenant_isolation ON "node_budgets"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "budget_reservations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "budget_reservations" FORCE ROW LEVEL SECURITY;
CREATE POLICY budget_reservation_tenant_isolation ON "budget_reservations"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "budget_ledger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "budget_ledger" FORCE ROW LEVEL SECURITY;
CREATE POLICY budget_ledger_tenant_isolation ON "budget_ledger"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

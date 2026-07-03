-- CreateTable
CREATE TABLE "node_budgets" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "limit_amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "node_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_reservations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),

    CONSTRAINT "budget_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_ledger" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reservation_id" UUID,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "node_budgets_node_id_key" ON "node_budgets"("node_id");

-- CreateIndex
CREATE INDEX "node_budgets_tenant_id_idx" ON "node_budgets"("tenant_id");

-- CreateIndex
CREATE INDEX "budget_reservations_tenant_id_idx" ON "budget_reservations"("tenant_id");

-- CreateIndex
CREATE INDEX "budget_reservations_node_id_idx" ON "budget_reservations"("node_id");

-- CreateIndex
CREATE INDEX "budget_ledger_tenant_id_idx" ON "budget_ledger"("tenant_id");

-- CreateIndex
CREATE INDEX "budget_ledger_node_id_idx" ON "budget_ledger"("node_id");

-- AddForeignKey
ALTER TABLE "node_budgets" ADD CONSTRAINT "node_budgets_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "org_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

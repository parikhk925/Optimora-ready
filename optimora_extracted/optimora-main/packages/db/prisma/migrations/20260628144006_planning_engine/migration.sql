-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "plan_id" UUID;

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'planning',
    "target_node_id" UUID,
    "budget_reservation_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plans_tenant_id_idx" ON "plans"("tenant_id");

-- CreateIndex
CREATE INDEX "plans_org_id_idx" ON "plans"("org_id");

-- CreateIndex
CREATE INDEX "plan_events_tenant_id_idx" ON "plan_events"("tenant_id");

-- CreateIndex
CREATE INDEX "plan_events_plan_id_idx" ON "plan_events"("plan_id");

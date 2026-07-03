-- CreateTable: usage_records (E9 Metering). Append-only, tenant-scoped.
CREATE TABLE "usage_records" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "agent_id" UUID,
    "task_id" UUID,
    "actor_id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "units" DOUBLE PRECISION NOT NULL,
    "estimated_cost_usd" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source_ref" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable: metering_events (E9 Metering). Audit outbox, tenant-scoped.
CREATE TABLE "metering_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "usage_record_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metering_events_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "usage_records_tenant_id_idx" ON "usage_records"("tenant_id");
CREATE INDEX "usage_records_org_id_idx" ON "usage_records"("org_id");
CREATE INDEX "usage_records_agent_id_idx" ON "usage_records"("agent_id");
CREATE INDEX "usage_records_task_id_idx" ON "usage_records"("task_id");
CREATE INDEX "usage_records_occurred_at_idx" ON "usage_records"("occurred_at");
CREATE INDEX "metering_events_tenant_id_idx" ON "metering_events"("tenant_id");
CREATE INDEX "metering_events_usage_record_id_idx" ON "metering_events"("usage_record_id");

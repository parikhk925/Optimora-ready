-- CreateTable
CREATE TABLE "memory_records" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "task_id" UUID,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "importance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "memory_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "memory_records_tenant_id_idx" ON "memory_records"("tenant_id");

-- CreateIndex
CREATE INDEX "memory_records_org_id_idx" ON "memory_records"("org_id");

-- CreateIndex
CREATE INDEX "memory_records_agent_id_idx" ON "memory_records"("agent_id");

-- CreateIndex
CREATE INDEX "memory_records_task_id_idx" ON "memory_records"("task_id");

-- CreateIndex
CREATE INDEX "memory_records_type_idx" ON "memory_records"("type");

-- CreateIndex
CREATE INDEX "memory_records_status_idx" ON "memory_records"("status");

-- CreateIndex
CREATE INDEX "memory_events_tenant_id_idx" ON "memory_events"("tenant_id");

-- CreateIndex
CREATE INDEX "memory_events_memory_id_idx" ON "memory_events"("memory_id");

-- CreateTable
CREATE TABLE "model_invocations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "task_id" UUID,
    "provider_name" TEXT NOT NULL,
    "quality_tier" TEXT NOT NULL,
    "cost_ceiling_usd" DOUBLE PRECISION,
    "estimated_cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tokens_in" INTEGER NOT NULL DEFAULT 0,
    "tokens_out" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'succeeded',
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_invocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_routing_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "invocation_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_routing_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "model_invocations_tenant_id_idx" ON "model_invocations"("tenant_id");

-- CreateIndex
CREATE INDEX "model_invocations_org_id_idx" ON "model_invocations"("org_id");

-- CreateIndex
CREATE INDEX "model_invocations_agent_id_idx" ON "model_invocations"("agent_id");

-- CreateIndex
CREATE INDEX "model_invocations_task_id_idx" ON "model_invocations"("task_id");

-- CreateIndex
CREATE INDEX "model_routing_events_tenant_id_idx" ON "model_routing_events"("tenant_id");

-- CreateIndex
CREATE INDEX "model_routing_events_invocation_id_idx" ON "model_routing_events"("invocation_id");

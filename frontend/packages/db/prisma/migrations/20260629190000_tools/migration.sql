-- CreateTable
CREATE TABLE "tool_invocations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "task_id" UUID,
    "tool_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'succeeded',
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_invocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "invocation_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tool_invocations_tenant_id_idx" ON "tool_invocations"("tenant_id");

-- CreateIndex
CREATE INDEX "tool_invocations_org_id_idx" ON "tool_invocations"("org_id");

-- CreateIndex
CREATE INDEX "tool_invocations_agent_id_idx" ON "tool_invocations"("agent_id");

-- CreateIndex
CREATE INDEX "tool_invocations_task_id_idx" ON "tool_invocations"("task_id");

-- CreateIndex
CREATE INDEX "tool_invocations_tool_name_idx" ON "tool_invocations"("tool_name");

-- CreateIndex
CREATE INDEX "tool_events_tenant_id_idx" ON "tool_events"("tenant_id");

-- CreateIndex
CREATE INDEX "tool_events_invocation_id_idx" ON "tool_events"("invocation_id");

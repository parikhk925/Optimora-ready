-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "requester_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "action_payload" JSONB NOT NULL DEFAULT '{}',
    "agent_id" UUID,
    "task_id" UUID,
    "run_id" UUID,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "approver_id" TEXT,
    "approver_note" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "approval_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_requests_tenant_id_idx" ON "approval_requests"("tenant_id");
CREATE INDEX "approval_requests_org_id_idx" ON "approval_requests"("org_id");
CREATE INDEX "approval_requests_state_idx" ON "approval_requests"("state");
CREATE INDEX "approval_requests_agent_id_idx" ON "approval_requests"("agent_id");
CREATE INDEX "approval_requests_task_id_idx" ON "approval_requests"("task_id");
CREATE INDEX "approval_events_tenant_id_idx" ON "approval_events"("tenant_id");
CREATE INDEX "approval_events_approval_id_idx" ON "approval_events"("approval_id");

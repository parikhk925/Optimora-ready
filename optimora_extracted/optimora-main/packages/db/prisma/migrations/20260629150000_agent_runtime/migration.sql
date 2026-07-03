-- CreateTable
CREATE TABLE "agent_runs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "agent_version" INTEGER NOT NULL,
    "agent_hash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "model_provider" TEXT NOT NULL,
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB,
    "tool_calls" JSONB NOT NULL DEFAULT '[]',
    "tokens_in" INTEGER NOT NULL DEFAULT 0,
    "tokens_out" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "failure_reason" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runtime_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "runtime_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_runs_tenant_id_idx" ON "agent_runs"("tenant_id");

-- CreateIndex
CREATE INDEX "agent_runs_org_id_idx" ON "agent_runs"("org_id");

-- CreateIndex
CREATE INDEX "agent_runs_task_id_idx" ON "agent_runs"("task_id");

-- CreateIndex
CREATE INDEX "agent_runs_agent_id_idx" ON "agent_runs"("agent_id");

-- CreateIndex
CREATE INDEX "runtime_events_tenant_id_idx" ON "runtime_events"("tenant_id");

-- CreateIndex
CREATE INDEX "runtime_events_run_id_idx" ON "runtime_events"("run_id");

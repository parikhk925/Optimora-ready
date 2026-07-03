-- CreateTable
CREATE TABLE "context_assemblies" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "agent_version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'assembled',
    "retriever" TEXT NOT NULL,
    "budget_max_tokens" INTEGER NOT NULL,
    "used_tokens" INTEGER NOT NULL DEFAULT 0,
    "truncated" BOOLEAN NOT NULL DEFAULT false,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "context_assemblies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "assembly_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "context_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "context_assemblies_tenant_id_idx" ON "context_assemblies"("tenant_id");

-- CreateIndex
CREATE INDEX "context_assemblies_org_id_idx" ON "context_assemblies"("org_id");

-- CreateIndex
CREATE INDEX "context_assemblies_task_id_idx" ON "context_assemblies"("task_id");

-- CreateIndex
CREATE INDEX "context_assemblies_agent_id_idx" ON "context_assemblies"("agent_id");

-- CreateIndex
CREATE INDEX "context_events_tenant_id_idx" ON "context_events"("tenant_id");

-- CreateIndex
CREATE INDEX "context_events_assembly_id_idx" ON "context_events"("assembly_id");

-- CreateTable
CREATE TABLE "critiques" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "agent_id" UUID,
    "agent_version" INTEGER,
    "agent_hash" TEXT,
    "quality_score" DOUBLE PRECISION NOT NULL,
    "result" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "violated_rules" JSONB NOT NULL DEFAULT '[]',
    "missing_requirements" JSONB NOT NULL DEFAULT '[]',
    "suggested_fixes" JSONB NOT NULL DEFAULT '[]',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "reviewer_type" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "retry_recommended" BOOLEAN NOT NULL DEFAULT false,
    "escalation_recommended" BOOLEAN NOT NULL DEFAULT false,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "critiques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reflection_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "critique_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reflection_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "critiques_tenant_id_idx" ON "critiques"("tenant_id");

-- CreateIndex
CREATE INDEX "critiques_org_id_idx" ON "critiques"("org_id");

-- CreateIndex
CREATE INDEX "critiques_task_id_idx" ON "critiques"("task_id");

-- CreateIndex
CREATE INDEX "reflection_events_tenant_id_idx" ON "reflection_events"("tenant_id");

-- CreateIndex
CREATE INDEX "reflection_events_critique_id_idx" ON "reflection_events"("critique_id");

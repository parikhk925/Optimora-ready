-- CreateTable
CREATE TABLE "agent_performance" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "avg_quality" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "success_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "failure_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revision_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "escalation_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reputation" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_records" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "agent_version" INTEGER,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "rationale" JSONB NOT NULL DEFAULT '{}',
    "proposed_change" JSONB NOT NULL DEFAULT '{}',
    "eval_gate_passed" BOOLEAN NOT NULL DEFAULT false,
    "eval_gate_reason" TEXT,
    "based_on_critiques" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "learning_record_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_performance_tenant_id_agent_id_key" ON "agent_performance"("tenant_id", "agent_id");

-- CreateIndex
CREATE INDEX "agent_performance_tenant_id_idx" ON "agent_performance"("tenant_id");

-- CreateIndex
CREATE INDEX "agent_performance_org_id_idx" ON "agent_performance"("org_id");

-- CreateIndex
CREATE INDEX "learning_records_tenant_id_idx" ON "learning_records"("tenant_id");

-- CreateIndex
CREATE INDEX "learning_records_org_id_idx" ON "learning_records"("org_id");

-- CreateIndex
CREATE INDEX "learning_records_agent_id_idx" ON "learning_records"("agent_id");

-- CreateIndex
CREATE INDEX "learning_events_tenant_id_idx" ON "learning_events"("tenant_id");

-- CreateIndex
CREATE INDEX "learning_events_learning_record_id_idx" ON "learning_events"("learning_record_id");

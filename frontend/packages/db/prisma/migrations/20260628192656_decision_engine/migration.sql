-- CreateTable
CREATE TABLE "decisions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "subject_id" UUID,
    "target_node_id" UUID,
    "target_agent_id" UUID,
    "basis" TEXT NOT NULL DEFAULT 'deterministic',
    "rationale" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "decision_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "decisions_tenant_id_idx" ON "decisions"("tenant_id");

-- CreateIndex
CREATE INDEX "decisions_org_id_idx" ON "decisions"("org_id");

-- CreateIndex
CREATE INDEX "decision_events_tenant_id_idx" ON "decision_events"("tenant_id");

-- CreateIndex
CREATE INDEX "decision_events_decision_id_idx" ON "decision_events"("decision_id");

-- CreateTable: audit_logs (E9 Observability). Unified, append-only, tenant-scoped.
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "service" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "agent_id" UUID,
    "task_id" UUID,
    "run_id" UUID,
    "source_ref" TEXT,
    "correlation_id" TEXT,
    "trace_id" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");
CREATE INDEX "audit_logs_org_id_idx" ON "audit_logs"("org_id");
CREATE INDEX "audit_logs_service_idx" ON "audit_logs"("service");
CREATE INDEX "audit_logs_event_type_idx" ON "audit_logs"("event_type");
CREATE INDEX "audit_logs_agent_id_idx" ON "audit_logs"("agent_id");
CREATE INDEX "audit_logs_task_id_idx" ON "audit_logs"("task_id");
CREATE INDEX "audit_logs_run_id_idx" ON "audit_logs"("run_id");
CREATE INDEX "audit_logs_correlation_id_idx" ON "audit_logs"("correlation_id");
CREATE INDEX "audit_logs_occurred_at_idx" ON "audit_logs"("occurred_at");

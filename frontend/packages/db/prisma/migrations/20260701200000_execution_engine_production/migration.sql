-- Production Workflow Execution Engine — additive migration.
-- Adds step-type/retry/duration/error tracking to workflow steps, version lock
-- to deployed workflows/runs, execution logs, usage events, ROI events, and a
-- billing plan/subscription catalog. No destructive changes; existing columns
-- and data are untouched.

-- ── workflow_template_steps ─────────────────────────────────────────────────
ALTER TABLE "workflow_template_steps"
  ADD COLUMN "step_type" TEXT NOT NULL DEFAULT 'action',
  ADD COLUMN "config" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "max_retries" INTEGER NOT NULL DEFAULT 0;

-- ── deployed_workflows ───────────────────────────────────────────────────────
ALTER TABLE "deployed_workflows"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "published_at" TIMESTAMP(3);

-- ── deployed_workflow_steps ──────────────────────────────────────────────────
ALTER TABLE "deployed_workflow_steps"
  ADD COLUMN "step_type" TEXT NOT NULL DEFAULT 'action',
  ADD COLUMN "config" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "retry_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "max_retries" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "duration_ms" INTEGER,
  ADD COLUMN "error" JSONB;

-- ── workflow_runs ────────────────────────────────────────────────────────────
ALTER TABLE "workflow_runs"
  ADD COLUMN "trigger_type" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "workflow_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "cancelled_at" TIMESTAMP(3);

-- ── workflow_run_steps ───────────────────────────────────────────────────────
ALTER TABLE "workflow_run_steps"
  ADD COLUMN "step_type" TEXT NOT NULL DEFAULT 'action',
  ADD COLUMN "error" JSONB,
  ADD COLUMN "retry_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "max_retries" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "duration_ms" INTEGER;

CREATE UNIQUE INDEX "workflow_run_steps_run_id_step_number_key" ON "workflow_run_steps"("run_id", "step_number");

-- ── workspace_integrations ───────────────────────────────────────────────────
ALTER TABLE "workspace_integrations"
  ADD COLUMN "auth_type" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN "last_error_at" TIMESTAMP(3);

-- ── execution_logs ───────────────────────────────────────────────────────────
CREATE TABLE "execution_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "org_id" UUID NOT NULL,
  "workspace_id" UUID,
  "workflow_run_id" UUID NOT NULL,
  "workflow_run_step_id" UUID,
  "level" TEXT NOT NULL DEFAULT 'info',
  "message" TEXT NOT NULL,
  "data" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "execution_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "execution_logs_tenant_id_idx" ON "execution_logs"("tenant_id");
CREATE INDEX "execution_logs_org_id_idx" ON "execution_logs"("org_id");
CREATE INDEX "execution_logs_workspace_id_idx" ON "execution_logs"("workspace_id");
CREATE INDEX "execution_logs_workflow_run_id_idx" ON "execution_logs"("workflow_run_id");
CREATE INDEX "execution_logs_workflow_run_step_id_idx" ON "execution_logs"("workflow_run_step_id");
CREATE INDEX "execution_logs_created_at_idx" ON "execution_logs"("created_at");
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_workflow_run_id_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── usage_events ─────────────────────────────────────────────────────────────
CREATE TABLE "usage_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "org_id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "workflow_run_id" UUID,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "usage_events_tenant_id_idx" ON "usage_events"("tenant_id");
CREATE INDEX "usage_events_org_id_idx" ON "usage_events"("org_id");
CREATE INDEX "usage_events_workspace_id_idx" ON "usage_events"("workspace_id");
CREATE INDEX "usage_events_event_type_idx" ON "usage_events"("event_type");
CREATE INDEX "usage_events_created_at_idx" ON "usage_events"("created_at");
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── roi_events ───────────────────────────────────────────────────────────────
CREATE TABLE "roi_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "org_id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "workflow_run_id" UUID,
  "deployed_workflow_id" UUID,
  "metric_key" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unit" TEXT NOT NULL DEFAULT 'count',
  "source" TEXT NOT NULL DEFAULT 'demo',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "roi_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "roi_events_tenant_id_idx" ON "roi_events"("tenant_id");
CREATE INDEX "roi_events_org_id_idx" ON "roi_events"("org_id");
CREATE INDEX "roi_events_workspace_id_idx" ON "roi_events"("workspace_id");
CREATE INDEX "roi_events_workflow_run_id_idx" ON "roi_events"("workflow_run_id");
CREATE INDEX "roi_events_metric_key_idx" ON "roi_events"("metric_key");
CREATE INDEX "roi_events_created_at_idx" ON "roi_events"("created_at");
ALTER TABLE "roi_events" ADD CONSTRAINT "roi_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── billing_plans ────────────────────────────────────────────────────────────
CREATE TABLE "billing_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price_monthly_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "max_workflow_runs_per_month" INTEGER,
  "max_agent_runs_per_month" INTEGER,
  "max_integration_actions_per_month" INTEGER,
  "max_seats" INTEGER,
  "features" JSONB NOT NULL DEFAULT '[]',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "billing_plans_key_key" ON "billing_plans"("key");

-- ── workspace_subscriptions ──────────────────────────────────────────────────
CREATE TABLE "workspace_subscriptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "org_id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "checkout_required" BOOLEAN NOT NULL DEFAULT false,
  "external_ref" TEXT,
  "current_period_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "current_period_end" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workspace_subscriptions_workspace_id_key" ON "workspace_subscriptions"("workspace_id");
CREATE INDEX "workspace_subscriptions_tenant_id_idx" ON "workspace_subscriptions"("tenant_id");
CREATE INDEX "workspace_subscriptions_org_id_idx" ON "workspace_subscriptions"("org_id");
CREATE INDEX "workspace_subscriptions_plan_id_idx" ON "workspace_subscriptions"("plan_id");
ALTER TABLE "workspace_subscriptions" ADD CONSTRAINT "workspace_subscriptions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_subscriptions" ADD CONSTRAINT "workspace_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "billing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

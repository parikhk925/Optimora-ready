-- Migration: automation_os
-- Adds: industry_packs, agent_definitions, workflow_templates, deployed_workflows,
--        workflow_runs, workflow_approvals, integration infrastructure,
--        data_sources, activity_logs, roi_snapshots, automation_events

-- ── Industry Pack catalog (global) ──────────────────────────────────────────

CREATE TABLE "industry_packs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hours_saved" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'demo_mode',
    "target_buyer" TEXT NOT NULL DEFAULT '',
    "business_outcome" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "industry_packs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "industry_packs_key_key" ON "industry_packs"("key");

CREATE TABLE "industry_pack_workflows" (
    "pack_id" UUID NOT NULL,
    "workflow_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "industry_pack_workflows_pkey" PRIMARY KEY ("pack_id","workflow_key")
);

CREATE TABLE "industry_pack_agents" (
    "pack_id" UUID NOT NULL,
    "agent_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "industry_pack_agents_pkey" PRIMARY KEY ("pack_id","agent_key")
);

-- ── Agent definition catalog (global) ────────────────────────────────────────

CREATE TABLE "agent_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "inputs" JSONB NOT NULL DEFAULT '[]',
    "outputs" JSONB NOT NULL DEFAULT '[]',
    "approval_required" BOOLEAN NOT NULL DEFAULT false,
    "integration_required" BOOLEAN NOT NULL DEFAULT false,
    "integrations" JSONB NOT NULL DEFAULT '[]',
    "compatible_workflows" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'demo_mode',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_definitions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "agent_definitions_key_key" ON "agent_definitions"("key");

-- ── Workflow template catalog (global) ────────────────────────────────────────

CREATE TABLE "workflow_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "business_use_case" TEXT NOT NULL DEFAULT '',
    "required_integrations" JSONB NOT NULL DEFAULT '[]',
    "sample_output" TEXT NOT NULL DEFAULT '',
    "roi_estimate" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'demo_mode',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workflow_templates_key_key" ON "workflow_templates"("key");

CREATE TABLE "workflow_template_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "step_number" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "agent_key" TEXT NOT NULL,
    "human_checkpoint" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "workflow_template_steps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "workflow_template_steps_workflow_id_idx" ON "workflow_template_steps"("workflow_id");

-- ── Deployed workflows (org-scoped) ──────────────────────────────────────────

CREATE TABLE "deployed_workflows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "pack_id" UUID,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'demo_mode',
    "deployed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "client_workspace_id" UUID,
    CONSTRAINT "deployed_workflows_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "deployed_workflows_tenant_id_idx" ON "deployed_workflows"("tenant_id");
CREATE INDEX "deployed_workflows_org_id_idx" ON "deployed_workflows"("org_id");
CREATE INDEX "deployed_workflows_template_id_idx" ON "deployed_workflows"("template_id");

-- ── Workflow runs (org-scoped) ────────────────────────────────────────────────

CREATE TABLE "workflow_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "deployed_workflow_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "input_data" JSONB NOT NULL DEFAULT '{}',
    "output_summary" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "workflow_runs_tenant_id_idx" ON "workflow_runs"("tenant_id");
CREATE INDEX "workflow_runs_org_id_idx" ON "workflow_runs"("org_id");
CREATE INDEX "workflow_runs_deployed_workflow_id_idx" ON "workflow_runs"("deployed_workflow_id");
CREATE INDEX "workflow_runs_status_idx" ON "workflow_runs"("status");

CREATE TABLE "workflow_run_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "step_number" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "agent_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approval_required" BOOLEAN NOT NULL DEFAULT false,
    "input_data" JSONB NOT NULL DEFAULT '{}',
    "output_data" JSONB NOT NULL DEFAULT '{}',
    "logs" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "workflow_run_steps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "workflow_run_steps_tenant_id_idx" ON "workflow_run_steps"("tenant_id");
CREATE INDEX "workflow_run_steps_run_id_idx" ON "workflow_run_steps"("run_id");

-- ── Workflow approvals (org-scoped) ──────────────────────────────────────────

CREATE TABLE "workflow_approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "step_number" INTEGER NOT NULL,
    "agent_key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "proposed_action" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "reviewer_comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_approvals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "workflow_approvals_tenant_id_idx" ON "workflow_approvals"("tenant_id");
CREATE INDEX "workflow_approvals_org_id_idx" ON "workflow_approvals"("org_id");
CREATE INDEX "workflow_approvals_run_id_idx" ON "workflow_approvals"("run_id");
CREATE INDEX "workflow_approvals_status_idx" ON "workflow_approvals"("status");

-- ── Integration infrastructure ────────────────────────────────────────────────

CREATE TABLE "integration_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT NOT NULL,
    "auth_method" TEXT NOT NULL DEFAULT 'oauth',
    "docs_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "integration_definitions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "integration_definitions_key_key" ON "integration_definitions"("key");

CREATE TABLE "workspace_integrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "definition_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_connected',
    "credential_ref" TEXT,
    "config_snapshot" JSONB NOT NULL DEFAULT '{}',
    "last_sync_at" TIMESTAMP(3),
    "connected_by" UUID,
    "connected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_integrations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workspace_integrations_org_def_key" ON "workspace_integrations"("org_id","definition_id");
CREATE INDEX "workspace_integrations_tenant_id_idx" ON "workspace_integrations"("tenant_id");
CREATE INDEX "workspace_integrations_org_id_idx" ON "workspace_integrations"("org_id");

-- ── Data sources (org-scoped) ─────────────────────────────────────────────────

CREATE TABLE "data_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "config" JSONB NOT NULL DEFAULT '{}',
    "record_count" INTEGER NOT NULL DEFAULT 0,
    "last_ingested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "data_sources_tenant_id_idx" ON "data_sources"("tenant_id");
CREATE INDEX "data_sources_org_id_idx" ON "data_sources"("org_id");

CREATE TABLE "uploaded_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "data_source_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "parsed_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "uploaded_files_tenant_id_idx" ON "uploaded_files"("tenant_id");
CREATE INDEX "uploaded_files_data_source_id_idx" ON "uploaded_files"("data_source_id");

-- ── Activity log (org-scoped) ─────────────────────────────────────────────────

CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "agent_key" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'items',
    "workflow_key" TEXT NOT NULL,
    "workflow_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "run_id" UUID,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "activity_logs_tenant_id_idx" ON "activity_logs"("tenant_id");
CREATE INDEX "activity_logs_org_id_idx" ON "activity_logs"("org_id");
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");
CREATE INDEX "activity_logs_agent_key_idx" ON "activity_logs"("agent_key");

-- ── ROI snapshots (org-scoped) ────────────────────────────────────────────────

CREATE TABLE "roi_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "hours_saved" INTEGER NOT NULL DEFAULT 0,
    "tasks_automated" INTEGER NOT NULL DEFAULT 0,
    "salary_cost_saved" INTEGER NOT NULL DEFAULT 0,
    "leads_recovered" INTEGER NOT NULL DEFAULT 0,
    "follow_ups_completed" INTEGER NOT NULL DEFAULT 0,
    "reports_generated" INTEGER NOT NULL DEFAULT 0,
    "interviews_scheduled" INTEGER NOT NULL DEFAULT 0,
    "support_tickets_resolved" INTEGER NOT NULL DEFAULT 0,
    "revenue_opportunity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "roi_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "roi_snapshots_tenant_id_idx" ON "roi_snapshots"("tenant_id");
CREATE INDEX "roi_snapshots_org_id_idx" ON "roi_snapshots"("org_id");
CREATE INDEX "roi_snapshots_period_start_idx" ON "roi_snapshots"("period_start");

-- ── Automation event outbox (queue-ready) ─────────────────────────────────────

CREATE TABLE "automation_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "processed_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "automation_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "automation_events_tenant_id_idx" ON "automation_events"("tenant_id");
CREATE INDEX "automation_events_processed_at_idx" ON "automation_events"("processed_at");
CREATE INDEX "automation_events_type_idx" ON "automation_events"("type");

-- ── Foreign key constraints ────────────────────────────────────────────────────

ALTER TABLE "industry_pack_workflows" ADD CONSTRAINT "industry_pack_workflows_pack_id_fkey"
    FOREIGN KEY ("pack_id") REFERENCES "industry_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "industry_pack_agents" ADD CONSTRAINT "industry_pack_agents_pack_id_fkey"
    FOREIGN KEY ("pack_id") REFERENCES "industry_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_template_steps" ADD CONSTRAINT "workflow_template_steps_workflow_id_fkey"
    FOREIGN KEY ("workflow_id") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deployed_workflows" ADD CONSTRAINT "deployed_workflows_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "workflow_templates"("id") ON UPDATE CASCADE;

ALTER TABLE "deployed_workflows" ADD CONSTRAINT "deployed_workflows_pack_id_fkey"
    FOREIGN KEY ("pack_id") REFERENCES "industry_packs"("id") ON UPDATE CASCADE;

ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_deployed_workflow_id_fkey"
    FOREIGN KEY ("deployed_workflow_id") REFERENCES "deployed_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_run_steps" ADD CONSTRAINT "workflow_run_steps_run_id_fkey"
    FOREIGN KEY ("run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workspace_integrations" ADD CONSTRAINT "workspace_integrations_definition_id_fkey"
    FOREIGN KEY ("definition_id") REFERENCES "integration_definitions"("id") ON UPDATE CASCADE;

ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_data_source_id_fkey"
    FOREIGN KEY ("data_source_id") REFERENCES "data_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── RLS policies (fail-closed, app role = authenticator) ──────────────────────

-- Activity logs: org members read their own org
ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_logs_org_isolation" ON "activity_logs"
    USING (tenant_id::text = current_setting('app.current_tenant_id', true)
       AND org_id::text = current_setting('app.current_org_id', true));

-- ROI snapshots
ALTER TABLE "roi_snapshots" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roi_snapshots_org_isolation" ON "roi_snapshots"
    USING (tenant_id::text = current_setting('app.current_tenant_id', true)
       AND org_id::text = current_setting('app.current_org_id', true));

-- Deployed workflows
ALTER TABLE "deployed_workflows" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deployed_workflows_org_isolation" ON "deployed_workflows"
    USING (tenant_id::text = current_setting('app.current_tenant_id', true)
       AND org_id::text = current_setting('app.current_org_id', true));

-- Workflow runs
ALTER TABLE "workflow_runs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_runs_org_isolation" ON "workflow_runs"
    USING (tenant_id::text = current_setting('app.current_tenant_id', true)
       AND org_id::text = current_setting('app.current_org_id', true));

-- Workflow run steps
ALTER TABLE "workflow_run_steps" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_run_steps_tenant_isolation" ON "workflow_run_steps"
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Workflow approvals
ALTER TABLE "workflow_approvals" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_approvals_org_isolation" ON "workflow_approvals"
    USING (tenant_id::text = current_setting('app.current_tenant_id', true)
       AND org_id::text = current_setting('app.current_org_id', true));

-- Workspace integrations
ALTER TABLE "workspace_integrations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_integrations_org_isolation" ON "workspace_integrations"
    USING (tenant_id::text = current_setting('app.current_tenant_id', true)
       AND org_id::text = current_setting('app.current_org_id', true));

-- Data sources
ALTER TABLE "data_sources" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "data_sources_org_isolation" ON "data_sources"
    USING (tenant_id::text = current_setting('app.current_tenant_id', true)
       AND org_id::text = current_setting('app.current_org_id', true));

-- Uploaded files
ALTER TABLE "uploaded_files" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uploaded_files_tenant_isolation" ON "uploaded_files"
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Automation events
ALTER TABLE "automation_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_events_org_isolation" ON "automation_events"
    USING (tenant_id::text = current_setting('app.current_tenant_id', true)
       AND org_id::text = current_setting('app.current_org_id', true));

-- Catalog tables (global reads, no RLS needed — no tenant data)
-- industry_packs, agent_definitions, workflow_templates, workflow_template_steps,
-- industry_pack_workflows, industry_pack_agents, integration_definitions
-- are NOT tenant-scoped and intentionally have no RLS.

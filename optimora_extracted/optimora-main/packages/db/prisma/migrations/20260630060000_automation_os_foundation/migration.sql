-- Migration: automation_os_foundation
-- Completes the database-backed Automation OS foundation with workspaces,
-- pack deployments, copied workflow steps, mapped agents, approval records,
-- integration checklists, flexible business objects, and ROI metric tables.

-- Status vocabulary cleanup: ready | demo | requires_integration | custom_setup
UPDATE "industry_packs" SET "status" = 'demo' WHERE "status" = 'demo_mode';
UPDATE "agent_definitions" SET "status" = 'demo' WHERE "status" = 'demo_mode';
UPDATE "workflow_templates" SET "status" = 'demo' WHERE "status" = 'demo_mode';
UPDATE "deployed_workflows" SET "status" = 'demo' WHERE "status" = 'demo_mode';

ALTER TABLE "industry_packs" ALTER COLUMN "status" SET DEFAULT 'demo';
ALTER TABLE "agent_definitions" ALTER COLUMN "status" SET DEFAULT 'demo';
ALTER TABLE "workflow_templates" ALTER COLUMN "status" SET DEFAULT 'demo';
ALTER TABLE "deployed_workflows" ALTER COLUMN "status" SET DEFAULT 'demo';

-- Workspace and agency client infrastructure
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'business',
    "status" TEXT NOT NULL DEFAULT 'active',
    "industry_key" TEXT,
    "brand_meta" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workspaces_tenant_id_slug_key" ON "workspaces"("tenant_id", "slug");
CREATE INDEX "workspaces_tenant_id_idx" ON "workspaces"("tenant_id");
CREATE INDEX "workspaces_org_id_idx" ON "workspaces"("org_id");
CREATE INDEX "workspaces_industry_key_idx" ON "workspaces"("industry_key");

CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");
CREATE INDEX "workspace_members_tenant_id_idx" ON "workspace_members"("tenant_id");
CREATE INDEX "workspace_members_workspace_id_idx" ON "workspace_members"("workspace_id");
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members"("user_id");

CREATE TABLE "agency_client_workspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "agency_workspace_id" UUID NOT NULL,
    "client_workspace_id" UUID NOT NULL,
    "client_name" TEXT NOT NULL,
    "industry_key" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "branding_meta" JSONB NOT NULL DEFAULT '{}',
    "approval_policy" JSONB NOT NULL DEFAULT '{}',
    "roi_report_config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agency_client_workspaces_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "agency_client_workspaces_agency_client_key" ON "agency_client_workspaces"("agency_workspace_id", "client_workspace_id");
CREATE INDEX "agency_client_workspaces_tenant_id_idx" ON "agency_client_workspaces"("tenant_id");
CREATE INDEX "agency_client_workspaces_agency_workspace_id_idx" ON "agency_client_workspaces"("agency_workspace_id");
CREATE INDEX "agency_client_workspaces_client_workspace_id_idx" ON "agency_client_workspaces"("client_workspace_id");

-- Catalog detail columns
ALTER TABLE "industry_packs"
    ADD COLUMN "roi_estimate" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "sample_output" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "dashboard_kpis" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN "required_integrations" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN "approval_requirements" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN "setup_status" TEXT NOT NULL DEFAULT 'demo';

ALTER TABLE "industry_pack_workflows"
    ADD COLUMN "workflow_name" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "base_type" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "config" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "industry_pack_agents"
    ADD COLUMN "agent_name" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "role" TEXT NOT NULL DEFAULT '';

ALTER TABLE "agent_definitions"
    ADD COLUMN "industries" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN "actions_performed" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN "approval_requirements" JSONB NOT NULL DEFAULT '[]';

CREATE TABLE "agents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "definition_id" UUID,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'demo',
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "agents_workspace_id_key_key" ON "agents"("workspace_id", "key");
CREATE INDEX "agents_tenant_id_idx" ON "agents"("tenant_id");
CREATE INDEX "agents_workspace_id_idx" ON "agents"("workspace_id");
CREATE INDEX "agents_definition_id_idx" ON "agents"("definition_id");

ALTER TABLE "workflow_templates"
    ADD COLUMN "base_type" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "industry_key" TEXT,
    ADD COLUMN "required_inputs" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN "approval_checkpoints" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN "roi_metrics_tracked" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN "setup_status" TEXT NOT NULL DEFAULT 'demo';
CREATE INDEX "workflow_templates_industry_key_idx" ON "workflow_templates"("industry_key");
CREATE INDEX "workflow_templates_base_type_idx" ON "workflow_templates"("base_type");

ALTER TABLE "workflow_template_steps"
    ADD COLUMN "input_schema" JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN "output_schema" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "workflow_template_agents" (
    "workflow_id" UUID NOT NULL,
    "agent_key" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "workflow_template_agents_pkey" PRIMARY KEY ("workflow_id", "agent_key")
);
CREATE INDEX "workflow_template_agents_agent_key_idx" ON "workflow_template_agents"("agent_key");

CREATE TABLE "workflow_template_integrations" (
    "workflow_id" UUID NOT NULL,
    "integration_key" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "purpose" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "workflow_template_integrations_pkey" PRIMARY KEY ("workflow_id", "integration_key")
);
CREATE INDEX "workflow_template_integrations_integration_key_idx" ON "workflow_template_integrations"("integration_key");

-- Integration catalog with requested table name
CREATE TABLE "integrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT NOT NULL,
    "auth_method" TEXT NOT NULL DEFAULT 'oauth',
    "status" TEXT NOT NULL DEFAULT 'not_connected',
    "demo_notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "integrations_key_key" ON "integrations"("key");

-- Deployment records
CREATE TABLE "workspace_pack_deployments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "pack_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'demo',
    "deployed_by" UUID,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_pack_deployments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workspace_pack_deployments_workspace_id_pack_id_key" ON "workspace_pack_deployments"("workspace_id", "pack_id");
CREATE INDEX "workspace_pack_deployments_tenant_id_idx" ON "workspace_pack_deployments"("tenant_id");
CREATE INDEX "workspace_pack_deployments_org_id_idx" ON "workspace_pack_deployments"("org_id");
CREATE INDEX "workspace_pack_deployments_workspace_id_idx" ON "workspace_pack_deployments"("workspace_id");
CREATE INDEX "workspace_pack_deployments_pack_id_idx" ON "workspace_pack_deployments"("pack_id");

ALTER TABLE "deployed_workflows"
    ADD COLUMN "workspace_id" UUID,
    ADD COLUMN "pack_deployment_id" UUID,
    ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'demo';
CREATE INDEX "deployed_workflows_workspace_id_idx" ON "deployed_workflows"("workspace_id");
CREATE INDEX "deployed_workflows_pack_deployment_id_idx" ON "deployed_workflows"("pack_deployment_id");

CREATE TABLE "deployed_workflow_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "workspace_id" UUID,
    "deployed_workflow_id" UUID NOT NULL,
    "step_number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "agent_key" TEXT NOT NULL,
    "approval_required" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "input_schema" JSONB NOT NULL DEFAULT '{}',
    "output_schema" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deployed_workflow_steps_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "deployed_workflow_steps_workflow_step_key" ON "deployed_workflow_steps"("deployed_workflow_id", "step_number");
CREATE INDEX "deployed_workflow_steps_tenant_id_idx" ON "deployed_workflow_steps"("tenant_id");
CREATE INDEX "deployed_workflow_steps_org_id_idx" ON "deployed_workflow_steps"("org_id");
CREATE INDEX "deployed_workflow_steps_workspace_id_idx" ON "deployed_workflow_steps"("workspace_id");
CREATE INDEX "deployed_workflow_steps_deployed_workflow_id_idx" ON "deployed_workflow_steps"("deployed_workflow_id");

CREATE TABLE "deployed_workflow_agents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "workspace_id" UUID,
    "deployed_workflow_id" UUID NOT NULL,
    "agent_id" UUID,
    "agent_key" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'demo',
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deployed_workflow_agents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "deployed_workflow_agents_workflow_agent_key" ON "deployed_workflow_agents"("deployed_workflow_id", "agent_key");
CREATE INDEX "deployed_workflow_agents_tenant_id_idx" ON "deployed_workflow_agents"("tenant_id");
CREATE INDEX "deployed_workflow_agents_org_id_idx" ON "deployed_workflow_agents"("org_id");
CREATE INDEX "deployed_workflow_agents_workspace_id_idx" ON "deployed_workflow_agents"("workspace_id");
CREATE INDEX "deployed_workflow_agents_agent_id_idx" ON "deployed_workflow_agents"("agent_id");

CREATE TABLE "workflow_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "workspace_id" UUID,
    "deployed_workflow_id" UUID NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'demo',
    "approval_policy" JSONB NOT NULL DEFAULT '{}',
    "integration_policy" JSONB NOT NULL DEFAULT '{}',
    "roi_baseline" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workflow_settings_deployed_workflow_id_key" ON "workflow_settings"("deployed_workflow_id");
CREATE INDEX "workflow_settings_tenant_id_idx" ON "workflow_settings"("tenant_id");
CREATE INDEX "workflow_settings_org_id_idx" ON "workflow_settings"("org_id");
CREATE INDEX "workflow_settings_workspace_id_idx" ON "workflow_settings"("workspace_id");

CREATE TABLE "deployment_integration_requirements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "workspace_id" UUID,
    "deployed_workflow_id" UUID NOT NULL,
    "integration_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_connected',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deployment_integration_requirements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "deployment_integration_requirements_workflow_integration_key" ON "deployment_integration_requirements"("deployed_workflow_id", "integration_key");
CREATE INDEX "deployment_integration_requirements_tenant_id_idx" ON "deployment_integration_requirements"("tenant_id");
CREATE INDEX "deployment_integration_requirements_org_id_idx" ON "deployment_integration_requirements"("org_id");
CREATE INDEX "deployment_integration_requirements_workspace_id_idx" ON "deployment_integration_requirements"("workspace_id");
CREATE INDEX "deployment_integration_requirements_integration_key_idx" ON "deployment_integration_requirements"("integration_key");

-- Run engine, approvals, data layer, activity, and ROI workspace support
ALTER TABLE "workflow_runs" ADD COLUMN "workspace_id" UUID;
CREATE INDEX "workflow_runs_workspace_id_idx" ON "workflow_runs"("workspace_id");

ALTER TABLE "workflow_run_steps"
    ADD COLUMN "org_id" UUID,
    ADD COLUMN "workspace_id" UUID,
    ADD COLUMN "error_message" TEXT;
CREATE INDEX "workflow_run_steps_org_id_idx" ON "workflow_run_steps"("org_id");
CREATE INDEX "workflow_run_steps_workspace_id_idx" ON "workflow_run_steps"("workspace_id");

ALTER TABLE "agent_runs"
    ADD COLUMN "workspace_id" UUID,
    ADD COLUMN "workflow_run_id" UUID,
    ADD COLUMN "workflow_run_step_id" UUID,
    ADD COLUMN "agent_definition_key" TEXT;
CREATE INDEX "agent_runs_workspace_id_idx" ON "agent_runs"("workspace_id");
CREATE INDEX "agent_runs_workflow_run_id_idx" ON "agent_runs"("workflow_run_id");
CREATE INDEX "agent_runs_workflow_run_step_id_idx" ON "agent_runs"("workflow_run_step_id");

ALTER TABLE "workflow_approvals"
    ADD COLUMN "workspace_id" UUID,
    ADD COLUMN "action_type" TEXT NOT NULL DEFAULT 'risky_action';
CREATE INDEX "workflow_approvals_workspace_id_idx" ON "workflow_approvals"("workspace_id");

CREATE TABLE "approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "deployed_workflow_id" UUID,
    "workflow_run_id" UUID,
    "action_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "proposed_action" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requested_by" UUID,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_by" UUID,
    "rejected_at" TIMESTAMP(3),
    "changes_requested_by" UUID,
    "changes_requested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "approvals_tenant_id_idx" ON "approvals"("tenant_id");
CREATE INDEX "approvals_org_id_idx" ON "approvals"("org_id");
CREATE INDEX "approvals_workspace_id_idx" ON "approvals"("workspace_id");
CREATE INDEX "approvals_deployed_workflow_id_idx" ON "approvals"("deployed_workflow_id");
CREATE INDEX "approvals_workflow_run_id_idx" ON "approvals"("workflow_run_id");
CREATE INDEX "approvals_status_idx" ON "approvals"("status");
CREATE INDEX "approvals_action_type_idx" ON "approvals"("action_type");

CREATE TABLE "approval_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "approval_id" UUID NOT NULL,
    "author_id" UUID,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "approval_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "approval_comments_approval_id_idx" ON "approval_comments"("approval_id");

ALTER TABLE "workspace_integrations"
    ADD COLUMN "workspace_id" UUID,
    ADD COLUMN "integration_id" UUID;
CREATE UNIQUE INDEX "workspace_integrations_workspace_integration_key" ON "workspace_integrations"("workspace_id", "integration_id");
CREATE INDEX "workspace_integrations_workspace_id_idx" ON "workspace_integrations"("workspace_id");
CREATE INDEX "workspace_integrations_integration_id_idx" ON "workspace_integrations"("integration_id");

ALTER TABLE "data_sources" ADD COLUMN "workspace_id" UUID;
CREATE INDEX "data_sources_workspace_id_idx" ON "data_sources"("workspace_id");

ALTER TABLE "uploaded_files" ADD COLUMN "workspace_id" UUID;
CREATE INDEX "uploaded_files_workspace_id_idx" ON "uploaded_files"("workspace_id");

CREATE TABLE "business_objects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "industry_key" TEXT,
    "object_type" TEXT NOT NULL,
    "external_id" TEXT,
    "display_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_objects_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "business_objects_workspace_object_external_key" ON "business_objects"("workspace_id", "object_type", "external_id");
CREATE INDEX "business_objects_tenant_id_idx" ON "business_objects"("tenant_id");
CREATE INDEX "business_objects_org_id_idx" ON "business_objects"("org_id");
CREATE INDEX "business_objects_workspace_id_idx" ON "business_objects"("workspace_id");
CREATE INDEX "business_objects_industry_key_idx" ON "business_objects"("industry_key");
CREATE INDEX "business_objects_object_type_idx" ON "business_objects"("object_type");

ALTER TABLE "activity_logs" ADD COLUMN "workspace_id" UUID;
CREATE INDEX "activity_logs_workspace_id_idx" ON "activity_logs"("workspace_id");

CREATE TABLE "roi_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "metric_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'count',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'demo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "roi_metrics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "roi_metrics_workspace_metric_period_key" ON "roi_metrics"("workspace_id", "metric_key", "period_start");
CREATE INDEX "roi_metrics_tenant_id_idx" ON "roi_metrics"("tenant_id");
CREATE INDEX "roi_metrics_org_id_idx" ON "roi_metrics"("org_id");
CREATE INDEX "roi_metrics_workspace_id_idx" ON "roi_metrics"("workspace_id");
CREATE INDEX "roi_metrics_metric_key_idx" ON "roi_metrics"("metric_key");

CREATE TABLE "workflow_roi_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "deployed_workflow_id" UUID,
    "workflow_key" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "hours_saved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tasks_automated" INTEGER NOT NULL DEFAULT 0,
    "salary_cost_saved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenue_opportunity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "source" TEXT NOT NULL DEFAULT 'demo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_roi_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "workflow_roi_snapshots_tenant_id_idx" ON "workflow_roi_snapshots"("tenant_id");
CREATE INDEX "workflow_roi_snapshots_org_id_idx" ON "workflow_roi_snapshots"("org_id");
CREATE INDEX "workflow_roi_snapshots_workspace_id_idx" ON "workflow_roi_snapshots"("workspace_id");
CREATE INDEX "workflow_roi_snapshots_deployed_workflow_id_idx" ON "workflow_roi_snapshots"("deployed_workflow_id");
CREATE INDEX "workflow_roi_snapshots_workflow_key_idx" ON "workflow_roi_snapshots"("workflow_key");
CREATE INDEX "workflow_roi_snapshots_period_start_idx" ON "workflow_roi_snapshots"("period_start");

ALTER TABLE "roi_snapshots" ADD COLUMN "workspace_id" UUID;
CREATE INDEX "roi_snapshots_workspace_id_idx" ON "roi_snapshots"("workspace_id");

ALTER TABLE "automation_events" ADD COLUMN "workspace_id" UUID;
CREATE INDEX "automation_events_workspace_id_idx" ON "automation_events"("workspace_id");

-- Foreign keys for new relations
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "agency_client_workspaces" ADD CONSTRAINT "agency_client_workspaces_agency_workspace_id_fkey"
    FOREIGN KEY ("agency_workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agency_client_workspaces" ADD CONSTRAINT "agency_client_workspaces_client_workspace_id_fkey"
    FOREIGN KEY ("client_workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agents" ADD CONSTRAINT "agents_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agents" ADD CONSTRAINT "agents_definition_id_fkey"
    FOREIGN KEY ("definition_id") REFERENCES "agent_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_template_agents" ADD CONSTRAINT "workflow_template_agents_workflow_id_fkey"
    FOREIGN KEY ("workflow_id") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_template_agents" ADD CONSTRAINT "workflow_template_agents_agent_key_fkey"
    FOREIGN KEY ("agent_key") REFERENCES "agent_definitions"("key") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_template_integrations" ADD CONSTRAINT "workflow_template_integrations_workflow_id_fkey"
    FOREIGN KEY ("workflow_id") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workspace_pack_deployments" ADD CONSTRAINT "workspace_pack_deployments_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_pack_deployments" ADD CONSTRAINT "workspace_pack_deployments_pack_id_fkey"
    FOREIGN KEY ("pack_id") REFERENCES "industry_packs"("id") ON UPDATE CASCADE;

ALTER TABLE "deployed_workflows" ADD CONSTRAINT "deployed_workflows_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deployed_workflows" ADD CONSTRAINT "deployed_workflows_pack_deployment_id_fkey"
    FOREIGN KEY ("pack_deployment_id") REFERENCES "workspace_pack_deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "deployed_workflow_steps" ADD CONSTRAINT "deployed_workflow_steps_deployed_workflow_id_fkey"
    FOREIGN KEY ("deployed_workflow_id") REFERENCES "deployed_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deployed_workflow_agents" ADD CONSTRAINT "deployed_workflow_agents_deployed_workflow_id_fkey"
    FOREIGN KEY ("deployed_workflow_id") REFERENCES "deployed_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deployed_workflow_agents" ADD CONSTRAINT "deployed_workflow_agents_agent_id_fkey"
    FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_settings" ADD CONSTRAINT "workflow_settings_deployed_workflow_id_fkey"
    FOREIGN KEY ("deployed_workflow_id") REFERENCES "deployed_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deployment_integration_requirements" ADD CONSTRAINT "deployment_integration_requirements_deployed_workflow_id_fkey"
    FOREIGN KEY ("deployed_workflow_id") REFERENCES "deployed_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_workflow_run_id_fkey"
    FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_workflow_run_step_id_fkey"
    FOREIGN KEY ("workflow_run_step_id") REFERENCES "workflow_run_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "approvals" ADD CONSTRAINT "approvals_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_deployed_workflow_id_fkey"
    FOREIGN KEY ("deployed_workflow_id") REFERENCES "deployed_workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_workflow_run_id_fkey"
    FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_comments" ADD CONSTRAINT "approval_comments_approval_id_fkey"
    FOREIGN KEY ("approval_id") REFERENCES "approvals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workspace_integrations" ADD CONSTRAINT "workspace_integrations_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workspace_integrations" ADD CONSTRAINT "workspace_integrations_integration_id_fkey"
    FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "business_objects" ADD CONSTRAINT "business_objects_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "roi_metrics" ADD CONSTRAINT "roi_metrics_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_roi_snapshots" ADD CONSTRAINT "workflow_roi_snapshots_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_roi_snapshots" ADD CONSTRAINT "workflow_roi_snapshots_deployed_workflow_id_fkey"
    FOREIGN KEY ("deployed_workflow_id") REFERENCES "deployed_workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "automation_events" ADD CONSTRAINT "automation_events_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS policy repair: use the same GUC names set by withTenantContext().
DROP POLICY IF EXISTS "activity_logs_org_isolation" ON "activity_logs";
CREATE POLICY "activity_logs_org_isolation" ON "activity_logs"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

DROP POLICY IF EXISTS "roi_snapshots_org_isolation" ON "roi_snapshots";
CREATE POLICY "roi_snapshots_org_isolation" ON "roi_snapshots"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

DROP POLICY IF EXISTS "deployed_workflows_org_isolation" ON "deployed_workflows";
CREATE POLICY "deployed_workflows_org_isolation" ON "deployed_workflows"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

DROP POLICY IF EXISTS "workflow_runs_org_isolation" ON "workflow_runs";
CREATE POLICY "workflow_runs_org_isolation" ON "workflow_runs"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

DROP POLICY IF EXISTS "workflow_run_steps_tenant_isolation" ON "workflow_run_steps";
CREATE POLICY "workflow_run_steps_tenant_isolation" ON "workflow_run_steps"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

DROP POLICY IF EXISTS "workflow_approvals_org_isolation" ON "workflow_approvals";
CREATE POLICY "workflow_approvals_org_isolation" ON "workflow_approvals"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

DROP POLICY IF EXISTS "workspace_integrations_org_isolation" ON "workspace_integrations";
CREATE POLICY "workspace_integrations_org_isolation" ON "workspace_integrations"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

DROP POLICY IF EXISTS "data_sources_org_isolation" ON "data_sources";
CREATE POLICY "data_sources_org_isolation" ON "data_sources"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

DROP POLICY IF EXISTS "uploaded_files_tenant_isolation" ON "uploaded_files";
CREATE POLICY "uploaded_files_tenant_isolation" ON "uploaded_files"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

DROP POLICY IF EXISTS "automation_events_org_isolation" ON "automation_events";
CREATE POLICY "automation_events_org_isolation" ON "automation_events"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspaces_tenant_isolation" ON "workspaces"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_members_tenant_isolation" ON "workspace_members"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "agency_client_workspaces" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_client_workspaces_tenant_isolation" ON "agency_client_workspaces"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "agents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents_tenant_isolation" ON "agents"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "workspace_pack_deployments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_pack_deployments_org_isolation" ON "workspace_pack_deployments"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

ALTER TABLE "deployed_workflow_steps" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deployed_workflow_steps_org_isolation" ON "deployed_workflow_steps"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

ALTER TABLE "deployed_workflow_agents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deployed_workflow_agents_org_isolation" ON "deployed_workflow_agents"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

ALTER TABLE "workflow_settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_settings_org_isolation" ON "workflow_settings"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

ALTER TABLE "deployment_integration_requirements" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deployment_integration_requirements_org_isolation" ON "deployment_integration_requirements"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

ALTER TABLE "approvals" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approvals_org_isolation" ON "approvals"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

ALTER TABLE "approval_comments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_comments_by_parent" ON "approval_comments"
    USING (EXISTS (
        SELECT 1 FROM "approvals"
        WHERE "approvals"."id" = "approval_comments"."approval_id"
          AND "approvals"."tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
          AND "approvals"."org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "approvals"
        WHERE "approvals"."id" = "approval_comments"."approval_id"
          AND "approvals"."tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
          AND "approvals"."org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid
    ));

ALTER TABLE "business_objects" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_objects_org_isolation" ON "business_objects"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

ALTER TABLE "roi_metrics" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roi_metrics_org_isolation" ON "roi_metrics"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

ALTER TABLE "workflow_roi_snapshots" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_roi_snapshots_org_isolation" ON "workflow_roi_snapshots"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
       AND "org_id" = NULLIF(current_setting('app.current_org', true), '')::uuid);

-- Global catalog tables intentionally remain non-RLS:
-- industry_packs, industry_pack_workflows, industry_pack_agents,
-- agent_definitions, workflow_templates, workflow_template_steps,
-- workflow_template_agents, workflow_template_integrations,
-- integration_definitions, integrations.

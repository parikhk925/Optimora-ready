/**
 * Automation OS data layer.
 *
 * Uses Prisma when DATABASE_URL is configured and falls back to the local
 * catalog only when the DB is absent, unreachable, or not migrated yet.
 * External integrations are never treated as live unless a workspace
 * integration is connected.
 */

import type { PrismaClient, TxClient } from "@optimora/db";
import {
  ACTIVITY_FEED,
  AGENT_LIBRARY,
  INDUSTRY_DASHBOARDS,
  INDUSTRY_PACKS,
  ROI_METRICS,
  WORKFLOW_TEMPLATES,
  type ActivityItem,
  type AgentDef,
  type DeployStatus,
  type IndustryDashboard,
  type IndustryPack,
  type ROIMetric,
  type WorkflowTemplate,
} from "./os-data";

type DbModule = typeof import("@optimora/db");
type PrismaJsonValue = string | number | boolean | PrismaJsonValue[] | { [key: string]: PrismaJsonValue };

export interface OrgContext {
  tenantId: string;
  orgId: string;
  workspaceId?: string;
  actorId?: string;
}

interface DbPackWorkflow { workflowKey: string; workflowName?: string; sortOrder: number }
interface DbPackAgent { agentKey: string; agentName?: string; sortOrder: number }
interface DbPackRow {
  id: string;
  key: string;
  name: string;
  icon: string;
  color: string;
  headline: string;
  description: string;
  hoursSaved: number;
  status: string;
  targetBuyer: string;
  businessOutcome: string;
  roiEstimate?: string;
  sampleOutput?: string;
  requiredIntegrations?: unknown;
  workflows: DbPackWorkflow[];
  agents: DbPackAgent[];
}

interface DbAgentRow {
  key: string;
  name: string;
  icon: string;
  color: string;
  tagline: string;
  description: string;
  inputs: unknown;
  outputs: unknown;
  compatibleWorkflows: unknown;
  industries?: unknown;
  approvalRequired: boolean;
  integrationRequired: boolean;
  integrations: unknown;
  status: string;
}

interface DbStepRow {
  id?: string;
  stepNumber: number;
  label: string;
  agentKey: string;
  humanCheckpoint: boolean;
}

interface DbWorkflowRow {
  id: string;
  key: string;
  name: string;
  icon: string;
  color: string;
  industryKey?: string | null;
  trigger: string;
  businessUseCase?: string;
  requiredIntegrations: unknown;
  approvalCheckpoints?: unknown;
  requiredInputs?: unknown;
  roiMetricsTracked?: unknown;
  sampleOutput: string;
  roiEstimate: string;
  status: string;
  setupStatus?: string;
  steps: DbStepRow[];
}

interface KeyNameRow { key: string; name: string }
interface DbConnectedIntegrationRow {
  status: string;
  connectedAt: Date | null;
  integration: { key: string } | null;
  definition: { key: string };
}
interface DbIntegrationCatalogRow {
  key: string;
  name: string;
  category: string;
  description: string;
  status: string;
}
interface DbDeployedListRow {
  id: string;
  name: string;
  status: string;
  deployedAt: Date;
  template: { key: string };
  runs: { id: string }[];
}
interface DbWorkflowRunListRow {
  id: string;
  deployedWorkflowId: string;
  status: string;
  currentStep: number;
  outputSummary: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  deployedWorkflow: { name: string };
}
interface DbActivityLogRow {
  id: string;
  agentName: string;
  action: string;
  count: number;
  unit: string;
  workflowName: string;
  status: string;
  meta: unknown;
  createdAt: Date;
}
interface DbWorkflowApprovalRow {
  id: string;
  runId: string;
  agentKey: string;
  description: string;
  proposedAction: unknown;
  status: string;
  createdAt: Date;
}
interface DbRoiMetricRow {
  metricKey: string;
  value: number;
}
interface DbWorkflowRoiSnapshotRow {
  workflowKey: string;
  tasksAutomated: number;
  hoursSaved: number;
  salaryCostSaved: number;
  deployedWorkflow: { name: string } | null;
}

interface DeployedWorkflowRecord {
  id: string;
  name: string;
  templateKey: string;
  status: string;
  deployedAt: Date;
  runCount: number;
}

interface WorkflowRunRecord {
  id: string;
  deployedWorkflowId: string;
  workflowName: string;
  status: string;
  currentStep: number;
  outputSummary: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface ApprovalRecord {
  id: string;
  runId: string;
  agentKey: string;
  description: string;
  proposedAction: Record<string, unknown>;
  status: string;
  createdAt: Date;
}

export interface IntegrationStatus {
  key: string;
  name: string;
  category: string;
  description: string;
  status: string;
  connectedAt: Date | null;
}

export interface RoiBreakdownRow {
  workflow: string;
  runs: number;
  hoursAvoided: number;
  estValue: string;
}

export interface RoiSummary {
  hoursSaved: number;
  tasksAutomated: number;
  salaryCostSaved: number;
  leadsRecovered: number;
  appointmentsBooked: number;
  candidatesShortlisted: number;
  supportTicketsResolved: number;
  codOrdersConfirmed: number;
  cartsRecovered: number;
  invoicesFollowedUp: number;
  shipmentsTracked: number;
  reportsGenerated: number;
  revenueOpportunity: number;
  clientReportsGenerated: number;
  reviewsRequested: number;
  remindersSent: number;
  metrics: ROIMetric[];
  breakdown: RoiBreakdownRow[];
  isLive: boolean;
}

export interface DeploymentState {
  deployed: boolean;
  status: string;
  deployedWorkflowCount: number;
  packDeploymentId?: string;
}

export interface AgencyOsSnapshot {
  whiteLabelEnabled: boolean;
  agencyName: string;
  clientWorkspaceCount: number;
  deployedClientPackCount: number;
  pendingApprovalCount: number;
  activityCount: number;
  roiValue: number;
  live: boolean;
}

let dbModulePromise: Promise<DbModule> | null = null;

function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

async function getDbModule(): Promise<DbModule | null> {
  if (!isDbConfigured()) return null;
  try {
    dbModulePromise ??= import("@optimora/db");
    return await dbModulePromise;
  } catch {
    return null;
  }
}

export async function getPrisma(): Promise<PrismaClient | null> {
  const mod = await getDbModule();
  if (!mod) return null;
  return mod.getPrisma();
}

async function withAutomationDb<T>(
  ctx: OrgContext,
  fn: (tx: TxClient) => Promise<T>,
): Promise<T | null> {
  const mod = await getDbModule();
  if (!mod) return null;
  try {
    return await mod.withTenantContext(mod.getPrisma(), { tenantId: ctx.tenantId, orgId: ctx.orgId }, fn);
  } catch {
    return null;
  }
}

function normalizeStatus(status: string | null | undefined): DeployStatus {
  if (status === "ready" || status === "demo" || status === "requires_integration" || status === "custom_setup") return status;
  if (status === "demo_mode") return "demo";
  return "demo";
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toPrismaJson(value: unknown): PrismaJsonValue {
  if (value == null) return {};
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => toPrismaJson(item));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, item]) => (item === undefined ? [] : [[key, toPrismaJson(item)]])),
    );
  }
  return String(value);
}

function fallbackIntegrations(): IntegrationStatus[] {
  return [
    { key: "gmail", name: "Gmail", category: "email", description: "Official Gmail API. Not live until OAuth is connected.", status: "not_connected", connectedAt: null },
    { key: "google-calendar", name: "Google Calendar", category: "calendar", description: "Official calendar API for bookings.", status: "not_connected", connectedAt: null },
    { key: "google-sheets", name: "Google Sheets", category: "spreadsheet", description: "Sheets data source and output target.", status: "not_connected", connectedAt: null },
    { key: "whatsapp", name: "WhatsApp Business", category: "messaging", description: "Official WhatsApp Business API required. No fake sends.", status: "requires_setup", connectedAt: null },
    { key: "linkedin", name: "LinkedIn", category: "social", description: "Official integration required. No scraping.", status: "requires_setup", connectedAt: null },
    { key: "shopify", name: "Shopify", category: "commerce", description: "Shopify API/webhook placeholder.", status: "requires_setup", connectedAt: null },
    { key: "crm", name: "CRM", category: "crm", description: "HubSpot, Zoho, Salesforce, or webhook-backed CRM.", status: "requires_setup", connectedAt: null },
    { key: "ats", name: "ATS", category: "ats", description: "Applicant tracking system placeholder.", status: "requires_setup", connectedAt: null },
    { key: "webhook", name: "Webhook", category: "data", description: "HTTP webhook event ingestion.", status: "not_connected", connectedAt: null },
    { key: "csv-upload", name: "CSV Upload", category: "data", description: "Upload CSV files to feed workflows.", status: "demo_mode", connectedAt: null },
    { key: "form-submission", name: "Form Submission", category: "data", description: "Capture website forms as triggers.", status: "demo_mode", connectedAt: null },
    { key: "file-upload", name: "File Upload", category: "data", description: "Upload files and documents for workflow intake.", status: "demo_mode", connectedAt: null },
  ];
}

function defaultRoiSummary(): RoiSummary {
  const metricValue = (label: string) => ROI_METRICS.find((metric) => metric.label === label)?.value ?? "0";
  return {
    hoursSaved: 347,
    tasksAutomated: 4821,
    salaryCostSaved: 186000,
    leadsRecovered: 94,
    appointmentsBooked: 186,
    candidatesShortlisted: 22,
    supportTicketsResolved: 312,
    codOrdersConfirmed: 73,
    cartsRecovered: 19,
    invoicesFollowedUp: 127,
    shipmentsTracked: 312,
    reportsGenerated: 89,
    revenueOpportunity: 1840000,
    clientReportsGenerated: 8,
    reviewsRequested: 108,
    remindersSent: 266,
    metrics: ROI_METRICS.map((metric) => ({ ...metric, value: metric.value || metricValue(metric.label) })),
    breakdown: [
      { workflow: "Lead Follow-up", runs: 34, hoursAvoided: 28, estValue: "₹42,000" },
      { workflow: "Client Reporting", runs: 8, hoursAvoided: 16, estValue: "₹24,000" },
      { workflow: "Appointment Booking", runs: 48, hoursAvoided: 28, estValue: "₹42,000" },
      { workflow: "Invoice Payment Reminder", runs: 22, hoursAvoided: 14, estValue: "₹21,000" },
      { workflow: "Shipment Tracking", runs: 18, hoursAvoided: 38, estValue: "₹57,000" },
    ],
    isLive: false,
  };
}

function formatCurrency(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function formatMetricValue(metricKey: string, value: number, unit: string): string {
  if (metricKey.includes("salary") || metricKey.includes("revenue") || unit === "inr") return formatCurrency(value);
  if (metricKey.includes("hours") || unit === "hours") return `${Math.round(value)}h`;
  return Math.round(value).toLocaleString("en-IN");
}

function getPeriodRange(): { periodStart: Date; periodEnd: Date } {
  const now = new Date();
  return {
    periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
    periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
  };
}

async function ensureWorkspace(tx: TxClient, ctx: OrgContext): Promise<string> {
  if (ctx.workspaceId) return ctx.workspaceId;

  const existing = await tx.workspace.findFirst({
    where: { tenantId: ctx.tenantId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (existing) return existing.id;

  const workspace = await tx.workspace.create({
    data: {
      tenantId: ctx.tenantId,
      orgId: ctx.orgId,
      name: process.env.NEXT_PUBLIC_WORKSPACE_NAME ?? "Optimora Workspace",
      slug: process.env.NEXT_PUBLIC_WORKSPACE_SLUG ?? `workspace-${ctx.orgId.slice(0, 8)}`,
      type: "business",
      status: "active",
    },
    select: { id: true },
  });
  return workspace.id;
}

function deploymentStatus(requiredIntegrationKeys: string[], connectedKeys: Set<string>, templateStatus: string): DeployStatus {
  if (requiredIntegrationKeys.length === 0) return normalizeStatus(templateStatus) === "ready" ? "ready" : "demo";
  return requiredIntegrationKeys.every((key) => connectedKeys.has(key)) ? "ready" : "requires_integration";
}

async function connectedIntegrationKeys(tx: TxClient, ctx: OrgContext, workspaceId: string): Promise<Set<string>> {
  const rows = await tx.workspaceIntegration.findMany({
    where: {
      tenantId: ctx.tenantId,
      orgId: ctx.orgId,
      OR: [{ workspaceId }, { workspaceId: null }],
      status: "connected",
    },
    include: {
      definition: { select: { key: true } },
      integration: { select: { key: true } },
    },
  }) as DbConnectedIntegrationRow[];
  return new Set(rows.map((row) => row.integration?.key ?? row.definition.key));
}

async function deployWorkflowInTx(
  tx: TxClient,
  ctx: OrgContext,
  params: { templateKey: string; packKey?: string; name?: string; packDeploymentId?: string; packId?: string },
): Promise<{ id: string; status: DeployStatus }> {
  const workspaceId = await ensureWorkspace(tx, ctx);
  const template = await tx.workflowTemplate.findUnique({
    where: { key: params.templateKey },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      agents: { orderBy: { sortOrder: "asc" } },
      integrations: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!template) throw new Error(`Workflow template not found: ${params.templateKey}`);

  const existing = await tx.deployedWorkflow.findFirst({
    where: { tenantId: ctx.tenantId, orgId: ctx.orgId, workspaceId, templateId: template.id },
    select: { id: true, status: true },
  });
  if (existing) return { id: existing.id, status: normalizeStatus(existing.status) };

  const templateIntegrations = template.integrations as Array<{ integrationKey: string }>;
  const templateAgents = template.agents as Array<{ agentKey: string }>;
  const templateSteps = template.steps as Array<DbStepRow & { inputSchema: unknown; outputSchema: unknown }>;
  const requiredKeys = templateIntegrations.length > 0
    ? templateIntegrations.map((item) => item.integrationKey)
    : toStringArray(template.requiredIntegrations);
  const connectedKeys = await connectedIntegrationKeys(tx, ctx, workspaceId);
  const status = deploymentStatus(requiredKeys, connectedKeys, template.status);
  const mode = status === "ready" ? "ready" : "demo";

  const pack = params.packId
    ? { id: params.packId }
    : params.packKey
      ? await tx.industryPack.findUnique({ where: { key: params.packKey }, select: { id: true } })
      : null;

  const deployed = await tx.deployedWorkflow.create({
    data: {
      tenantId: ctx.tenantId,
      orgId: ctx.orgId,
      workspaceId,
      packDeploymentId: params.packDeploymentId ?? null,
      templateId: template.id,
      packId: pack?.id ?? null,
      name: params.name ?? template.name,
      status,
      mode,
      settings: {
        demoMode: mode !== "ready",
        templateKey: template.key,
        requiredIntegrations: requiredKeys,
        approvalCheckpoints: toStringArray(template.approvalCheckpoints),
      },
    },
  });

  for (const step of templateSteps) {
    await tx.deployedWorkflowStep.create({
      data: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId,
        workspaceId,
        deployedWorkflowId: deployed.id,
        stepNumber: step.stepNumber,
        name: step.label,
        agentKey: step.agentKey,
        approvalRequired: step.humanCheckpoint,
        status: "pending",
        inputSchema: toPrismaJson(step.inputSchema),
        outputSchema: toPrismaJson(step.outputSchema),
      },
    });
  }

  const agentKeys = templateAgents.length > 0
    ? templateAgents.map((agent) => agent.agentKey)
    : [...new Set(templateSteps.map((step) => step.agentKey))];
  for (const agentKey of agentKeys) {
    const definition = await tx.agentDefinition.findUnique({ where: { key: agentKey } });
    const agent = await tx.agent.upsert({
      where: { workspaceId_key: { workspaceId, key: agentKey } },
      update: {
        name: definition?.name ?? agentKey,
        definitionId: definition?.id ?? null,
        status,
      },
      create: {
        tenantId: ctx.tenantId,
        workspaceId,
        definitionId: definition?.id ?? null,
        key: agentKey,
        name: definition?.name ?? agentKey,
        role: definition?.tagline ?? "Workflow agent",
        status,
        config: { demoMode: mode !== "ready" },
      },
    });

    await tx.deployedWorkflowAgent.create({
      data: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId,
        workspaceId,
        deployedWorkflowId: deployed.id,
        agentId: agent.id,
        agentKey,
        role: definition?.tagline ?? "Workflow agent",
        status,
        config: { demoMode: mode !== "ready" },
      },
    });
  }

  await tx.workflowSetting.create({
    data: {
      tenantId: ctx.tenantId,
      orgId: ctx.orgId,
      workspaceId,
      deployedWorkflowId: deployed.id,
      mode,
      approvalPolicy: { checkpoints: toStringArray(template.approvalCheckpoints), requiredBeforeExternalSend: true },
      integrationPolicy: { required: requiredKeys, status },
      roiBaseline: { hoursSaved: 0, tasksAutomated: 0, source: mode },
    },
  });

  for (const key of requiredKeys) {
    await tx.deploymentIntegrationRequirement.create({
      data: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId,
        workspaceId,
        deployedWorkflowId: deployed.id,
        integrationKey: key,
        status: connectedKeys.has(key) ? "connected" : "not_connected",
        required: true,
        notes: connectedKeys.has(key) ? "Connected" : "Required before live external actions",
      },
    });
  }

  const { periodStart, periodEnd } = getPeriodRange();
  await tx.workflowRoiSnapshot.create({
    data: {
      tenantId: ctx.tenantId,
      orgId: ctx.orgId,
      workspaceId,
      deployedWorkflowId: deployed.id,
      workflowKey: template.key,
      periodStart,
      periodEnd,
      source: mode,
      metrics: { baseline: true, demoMode: mode !== "ready" },
    },
  });

  await tx.activityLog.create({
    data: {
      tenantId: ctx.tenantId,
      orgId: ctx.orgId,
      workspaceId,
      agentKey: "automation-os",
      agentName: "Automation OS",
      action: "deployed workflow",
      count: 1,
      unit: template.name,
      workflowKey: template.key,
      workflowName: template.name,
      status: status === "ready" ? "completed" : "pending_approval",
      meta: { status, mode, requiredIntegrations: requiredKeys },
    },
  });

  await tx.automationEvent.create({
    data: {
      tenantId: ctx.tenantId,
      orgId: ctx.orgId,
      workspaceId,
      type: "workflow.deployed",
      payload: { deployedWorkflowId: deployed.id, templateKey: template.key, status, mode },
    },
  });

  return { id: deployed.id, status };
}

export async function listIndustryPacks(): Promise<IndustryPack[]> {
  const db = await getPrisma();
  if (!db) return INDUSTRY_PACKS;

  try {
    const rows = await db.industryPack.findMany({
      include: {
        workflows: { orderBy: { sortOrder: "asc" } },
        agents: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { name: "asc" },
    }) as DbPackRow[];
    if (rows.length === 0) return INDUSTRY_PACKS;

    const workflowNames = await db.workflowTemplate.findMany({ select: { key: true, name: true } }) as KeyNameRow[];
    const agentNames = await db.agentDefinition.findMany({ select: { key: true, name: true } }) as KeyNameRow[];
    const workflowMap = new Map<string, string>(workflowNames.map((row) => [row.key, row.name]));
    const agentMap = new Map<string, string>(agentNames.map((row) => [row.key, row.name]));

    return rows.map((row) => {
      const fallback = INDUSTRY_PACKS.find((pack) => pack.key === row.key);
      return {
        key: row.key,
        name: row.name,
        icon: row.icon,
        color: row.color,
        headline: row.headline,
        description: row.description,
        forWho: row.targetBuyer || fallback?.forWho || "",
        workflows: row.workflows.map((workflow) => workflow.workflowName || workflowMap.get(workflow.workflowKey) || workflow.workflowKey),
        agents: row.agents.map((agent) => agent.agentName || agentMap.get(agent.agentKey) || agent.agentKey),
        hoursSaved: row.hoursSaved,
        status: normalizeStatus(row.status),
        dashboardHref: `/dashboard/industry/${row.key}`,
        roiEstimate: row.roiEstimate || fallback?.roiEstimate || "",
        sampleOutput: row.sampleOutput || fallback?.sampleOutput || "",
        integrations: toStringArray(row.requiredIntegrations).length > 0 ? toStringArray(row.requiredIntegrations) : fallback?.integrations ?? [],
        businessOutcome: row.businessOutcome || fallback?.businessOutcome || "",
      };
    });
  } catch {
    return INDUSTRY_PACKS;
  }
}

export async function getIndustryPackByKey(key: string): Promise<IndustryPack | null> {
  const packs = await listIndustryPacks();
  return packs.find((pack) => pack.key === key) ?? null;
}

export async function listAgentDefinitions(): Promise<AgentDef[]> {
  const db = await getPrisma();
  if (!db) return AGENT_LIBRARY;

  try {
    const rows = await db.agentDefinition.findMany({ orderBy: { name: "asc" } }) as DbAgentRow[];
    if (rows.length === 0) return AGENT_LIBRARY;
    return rows.map((row) => ({
      key: row.key,
      name: row.name,
      icon: row.icon,
      color: row.color,
      tagline: row.tagline,
      what: row.description,
      inputs: toStringArray(row.inputs),
      outputs: toStringArray(row.outputs),
      workflows: toStringArray(row.compatibleWorkflows),
      industries: toStringArray(row.industries),
      approvalRequired: row.approvalRequired,
      integrationRequired: row.integrationRequired,
      integrations: toStringArray(row.integrations),
      status: normalizeStatus(row.status),
    }));
  } catch {
    return AGENT_LIBRARY;
  }
}

export async function listWorkflowTemplates(): Promise<WorkflowTemplate[]> {
  const db = await getPrisma();
  if (!db) return WORKFLOW_TEMPLATES;

  try {
    const rows = await db.workflowTemplate.findMany({
      include: { steps: { orderBy: { stepNumber: "asc" } } },
      orderBy: [{ industryKey: "asc" }, { name: "asc" }],
    }) as DbWorkflowRow[];
    if (rows.length === 0) return WORKFLOW_TEMPLATES;

    const agentNames = await db.agentDefinition.findMany({ select: { key: true, name: true } }) as KeyNameRow[];
    const agentMap = new Map<string, string>(agentNames.map((row) => [row.key, row.name]));
    return rows.map((row) => ({
      key: row.key,
      name: row.name,
      icon: row.icon,
      color: row.color,
      trigger: row.trigger,
      businessUseCase: row.businessUseCase ?? "",
      industry: row.industryKey ?? "",
      steps: row.steps.map((step) => ({
        step: step.stepNumber,
        label: step.label,
        agent: agentMap.get(step.agentKey) ?? step.agentKey,
        humanCheckpoint: step.humanCheckpoint,
      })),
      requiredIntegrations: toStringArray(row.requiredIntegrations),
      sampleOutput: row.sampleOutput,
      roiEstimate: row.roiEstimate,
      status: normalizeStatus(row.status),
    }));
  } catch {
    return WORKFLOW_TEMPLATES;
  }
}

export async function listDeployedWorkflows(ctx: OrgContext): Promise<DeployedWorkflowRecord[]> {
  const rows = await withAutomationDb(ctx, async (tx) =>
    tx.deployedWorkflow.findMany({
      where: { tenantId: ctx.tenantId, orgId: ctx.orgId, ...(ctx.workspaceId ? { workspaceId: ctx.workspaceId } : {}) },
      include: {
        template: { select: { key: true } },
        runs: { select: { id: true } },
      },
      orderBy: { deployedAt: "desc" },
    }),
  );
  const deployedRows = rows as DbDeployedListRow[] | null;
  if (!deployedRows) return [];
  return deployedRows.map((row) => ({
    id: row.id,
    name: row.name,
    templateKey: row.template.key,
    status: row.status,
    deployedAt: row.deployedAt,
    runCount: row.runs.length,
  }));
}

export async function getIndustryDeploymentState(ctx: OrgContext, packKey: string): Promise<DeploymentState> {
  const state = await withAutomationDb(ctx, async (tx) => {
    const workspaceId = await ensureWorkspace(tx, ctx);
    const pack = await tx.industryPack.findUnique({ where: { key: packKey }, select: { id: true } });
    if (!pack) return null;
    const deployment = await tx.workspacePackDeployment.findUnique({
      where: { workspaceId_packId: { workspaceId, packId: pack.id } },
      include: { deployedWorkflows: { select: { id: true } } },
    });
    if (!deployment) return null;
    return {
      deployed: true,
      status: deployment.status,
      deployedWorkflowCount: deployment.deployedWorkflows.length,
      packDeploymentId: deployment.id,
    };
  });
  return state ?? { deployed: false, status: "not_deployed", deployedWorkflowCount: 0 };
}

export async function deployWorkflow(
  ctx: OrgContext,
  params: { templateKey: string; packKey?: string; name?: string },
): Promise<{ id: string; status: string } | { error: string }> {
  const result = await withAutomationDb(ctx, (tx) => deployWorkflowInTx(tx, ctx, params));
  if (!result) return { error: "Database not configured or Automation OS migration not applied; staying in demo mode." };
  return result;
}

export async function deployPack(
  ctx: OrgContext,
  packKey: string,
): Promise<{ id: string; status: string; deployedWorkflowCount: number } | { error: string }> {
  const result = await withAutomationDb(ctx, async (tx) => {
    const workspaceId = await ensureWorkspace(tx, ctx);
    const pack = await tx.industryPack.findUnique({
      where: { key: packKey },
      include: { workflows: { orderBy: { sortOrder: "asc" } } },
    });
    if (!pack) throw new Error(`Industry pack not found: ${packKey}`);

    const deployment = await tx.workspacePackDeployment.upsert({
      where: { workspaceId_packId: { workspaceId, packId: pack.id } },
      update: { status: normalizeStatus(pack.status), settings: { redeployedAt: new Date().toISOString() } },
      create: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId,
        workspaceId,
        packId: pack.id,
        status: normalizeStatus(pack.status),
        deployedBy: ctx.actorId ?? null,
        settings: {
          requiredIntegrations: toStringArray(pack.requiredIntegrations),
          approvalRequirements: toStringArray(pack.approvalRequirements),
        },
      },
    });

    let count = 0;
    for (const workflow of pack.workflows) {
      await deployWorkflowInTx(tx, ctx, {
        templateKey: workflow.workflowKey,
        packKey,
        packId: pack.id,
        packDeploymentId: deployment.id,
        name: workflow.workflowName || undefined,
      });
      count += 1;
    }

    await tx.activityLog.create({
      data: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId,
        workspaceId,
        agentKey: "automation-os",
        agentName: "Automation OS",
        action: "deployed pack",
        count,
        unit: "workflows",
        workflowKey: pack.key,
        workflowName: pack.name,
        status: deployment.status === "ready" ? "completed" : "pending_approval",
        meta: { packKey, deploymentId: deployment.id, status: deployment.status },
      },
    });

    await tx.automationEvent.create({
      data: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId,
        workspaceId,
        type: "pack.deployed",
        payload: { packKey, deploymentId: deployment.id, workflowCount: count },
      },
    });

    return { id: deployment.id, status: deployment.status, deployedWorkflowCount: count };
  });

  if (!result) return { error: "Database not configured or Automation OS migration not applied; staying in demo mode." };
  return result;
}

export async function startWorkflowRun(
  ctx: OrgContext,
  deployedWorkflowId: string,
  inputData: Record<string, unknown> = {},
): Promise<{ id: string; status: string } | { error: string }> {
  const result = await withAutomationDb(ctx, async (tx) => {
    const workspaceId = await ensureWorkspace(tx, ctx);
    const deployed = await tx.deployedWorkflow.findFirst({
      where: { id: deployedWorkflowId, tenantId: ctx.tenantId, orgId: ctx.orgId },
      include: {
        steps: { orderBy: { stepNumber: "asc" } },
        template: { select: { key: true, name: true } },
      },
    });
    if (!deployed) throw new Error("Deployed workflow not found");

    const deployedSteps = deployed.steps as Array<{
      id: string;
      stepNumber: number;
      name: string;
      agentKey: string;
      approvalRequired: boolean;
    }>;
    const hasApproval = deployedSteps.some((step) => step.approvalRequired);
    const run = await tx.workflowRun.create({
      data: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId,
        workspaceId,
        deployedWorkflowId: deployed.id,
        status: hasApproval ? "waiting_for_approval" : "completed",
        currentStep: hasApproval ? 1 : deployedSteps.length,
        inputData: toPrismaJson(inputData),
        outputSummary: deployed.mode === "ready"
          ? "Workflow started with connected integrations."
          : "Demo execution completed internally; external sends remain blocked until integrations and approvals are satisfied.",
        startedAt: new Date(),
        completedAt: hasApproval ? null : new Date(),
      },
    });

    for (const step of deployedSteps) {
      const status = step.approvalRequired ? "waiting_for_approval" : "completed";
      const runStep = await tx.workflowRunStep.create({
        data: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId,
          workspaceId,
          runId: run.id,
          stepNumber: step.stepNumber,
          label: step.name,
          agentKey: step.agentKey,
          status,
          approvalRequired: step.approvalRequired,
          inputData: toPrismaJson(inputData),
          outputData: { mode: deployed.mode, demoLabel: deployed.mode !== "ready" },
          logs: deployed.mode === "ready" ? "Step queued for real execution." : "Demo step executed without external side effects.",
        },
      });

      const definition = await tx.agentDefinition.findUnique({ where: { key: step.agentKey }, select: { id: true } });
      await tx.agentRun.create({
        data: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId,
          workspaceId,
          taskId: runStep.id,
          agentId: definition?.id ?? runStep.id,
          workflowRunId: run.id,
          workflowRunStepId: runStep.id,
          agentDefinitionKey: step.agentKey,
          agentVersion: 1,
          status: step.approvalRequired ? "pending" : "succeeded",
          modelProvider: "demo",
          input: toPrismaJson(inputData),
          output: { demoMode: deployed.mode !== "ready", status },
          tokensIn: 0,
          tokensOut: 0,
          cost: 0,
          startedAt: new Date(),
          finishedAt: step.approvalRequired ? null : new Date(),
        },
      });

      if (step.approvalRequired) {
        const approvalPayload = {
          workflowRunId: run.id,
          stepNumber: step.stepNumber,
          action: step.name,
          externalSendBlocked: true,
        };
        await tx.workflowApproval.create({
          data: {
            tenantId: ctx.tenantId,
            orgId: ctx.orgId,
            workspaceId,
            runId: run.id,
            stepNumber: step.stepNumber,
            agentKey: step.agentKey,
            actionType: "risky_action",
            description: `Approval required before ${step.name}`,
            proposedAction: approvalPayload,
            status: "pending",
          },
        });
        await tx.approval.create({
          data: {
            tenantId: ctx.tenantId,
            orgId: ctx.orgId,
            workspaceId,
            deployedWorkflowId: deployed.id,
            workflowRunId: run.id,
            actionType: "risky_action",
            title: `Approve ${step.name}`,
            description: `No external message or report will be sent until this approval is resolved.`,
            proposedAction: approvalPayload,
            status: "pending",
            requestedBy: ctx.actorId ?? null,
          },
        });
      }
    }

    await tx.activityLog.create({
      data: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId,
        workspaceId,
        agentKey: "automation-os",
        agentName: "Automation OS",
        action: "started workflow run",
        count: 1,
        unit: deployed.name,
        workflowKey: deployed.template.key,
        workflowName: deployed.name,
        runId: run.id,
        status: run.status === "completed" ? "completed" : "pending_approval",
        meta: { mode: deployed.mode, status: run.status },
      },
    });

    return { id: run.id, status: run.status };
  });

  if (!result) return { error: "Database not configured or Automation OS migration not applied; staying in demo mode." };
  return result;
}

export async function listWorkflowRuns(ctx: OrgContext, limit = 20): Promise<WorkflowRunRecord[]> {
  const rows = await withAutomationDb(ctx, async (tx) =>
    tx.workflowRun.findMany({
      where: { tenantId: ctx.tenantId, orgId: ctx.orgId, ...(ctx.workspaceId ? { workspaceId: ctx.workspaceId } : {}) },
      include: { deployedWorkflow: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  );
  const runRows = rows as DbWorkflowRunListRow[] | null;
  if (!runRows) return [];
  return runRows.map((row) => ({
    id: row.id,
    deployedWorkflowId: row.deployedWorkflowId,
    workflowName: row.deployedWorkflow.name,
    status: row.status,
    currentStep: row.currentStep,
    outputSummary: row.outputSummary,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
  }));
}

export async function listActivityLogs(ctx: OrgContext, limit = 20): Promise<ActivityItem[]> {
  const rows = await withAutomationDb(ctx, async (tx) =>
    tx.activityLog.findMany({
      where: { tenantId: ctx.tenantId, orgId: ctx.orgId, ...(ctx.workspaceId ? { workspaceId: ctx.workspaceId } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  );
  const activityRows = rows as DbActivityLogRow[] | null;
  if (!activityRows || activityRows.length === 0) return ACTIVITY_FEED;

  const now = Date.now();
  return activityRows.map((row) => {
    const mins = Math.max(0, Math.round((now - row.createdAt.getTime()) / 60000));
    const meta = row.meta as { industry?: string; agentIcon?: string } | null;
    return {
      id: row.id,
      agent: row.agentName,
      agentIcon: meta?.agentIcon ?? "RefreshCw",
      action: row.action,
      count: row.count,
      unit: row.unit,
      industry: meta?.industry ?? row.workflowName,
      status: row.status as ActivityItem["status"],
      timeAgo: mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)}h ago`,
    };
  });
}

export async function createActivityLog(ctx: OrgContext, entry: {
  agentKey: string;
  agentName: string;
  action: string;
  count: number;
  unit: string;
  workflowKey: string;
  workflowName: string;
  status?: string;
  runId?: string;
  meta?: Record<string, unknown>;
}) {
  await withAutomationDb(ctx, async (tx) => {
    const workspaceId = await ensureWorkspace(tx, ctx);
    await tx.activityLog.create({
      data: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId,
        workspaceId,
        ...entry,
        status: entry.status ?? "completed",
        runId: entry.runId ?? null,
        meta: toPrismaJson(entry.meta ?? {}),
      },
    });
  });
}

export async function listPendingApprovals(ctx: OrgContext): Promise<ApprovalRecord[]> {
  const rows = await withAutomationDb(ctx, async (tx) =>
    tx.workflowApproval.findMany({
      where: { tenantId: ctx.tenantId, orgId: ctx.orgId, status: "pending", ...(ctx.workspaceId ? { workspaceId: ctx.workspaceId } : {}) },
      orderBy: { createdAt: "desc" },
    }),
  );
  const approvalRows = rows as DbWorkflowApprovalRow[] | null;
  if (!approvalRows) return [];
  return approvalRows.map((row) => ({
    id: row.id,
    runId: row.runId,
    agentKey: row.agentKey,
    description: row.description,
    proposedAction: row.proposedAction as Record<string, unknown>,
    status: row.status,
    createdAt: row.createdAt,
  }));
}

export async function reviewApproval(
  ctx: OrgContext,
  approvalId: string,
  decision: "approve" | "reject" | "request_changes",
  reviewedBy: string,
  comment?: string,
): Promise<{ ok: boolean; error?: string }> {
  const result = await withAutomationDb(ctx, async (tx) => {
    const workflowApproval = await tx.workflowApproval.findFirst({
      where: { id: approvalId, tenantId: ctx.tenantId, orgId: ctx.orgId },
    });
    if (!workflowApproval) throw new Error("Approval not found");
    if (workflowApproval.status !== "pending") throw new Error("Already reviewed");

    const status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "changes_requested";
    await tx.workflowApproval.update({
      where: { id: approvalId },
      data: {
        status,
        reviewedBy,
        reviewedAt: new Date(),
        reviewerComment: comment ?? null,
      },
    });

    const generalApproval = await tx.approval.findFirst({
      where: { workflowRunId: workflowApproval.runId, actionType: workflowApproval.actionType, status: "pending" },
    });
    if (generalApproval) {
      await tx.approval.update({
        where: { id: generalApproval.id },
        data: decision === "approve"
          ? { status, approvedBy: reviewedBy, approvedAt: new Date() }
          : decision === "reject"
            ? { status, rejectedBy: reviewedBy, rejectedAt: new Date() }
            : { status, changesRequestedBy: reviewedBy, changesRequestedAt: new Date() },
      });
      if (comment) {
        await tx.approvalComment.create({ data: { approvalId: generalApproval.id, authorId: reviewedBy, comment } });
      }
    }

    await tx.activityLog.create({
      data: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId,
        workspaceId: workflowApproval.workspaceId ?? ctx.workspaceId ?? null,
        agentKey: workflowApproval.agentKey,
        agentName: workflowApproval.agentKey,
        action: `approval ${status}`,
        count: 1,
        unit: "approval",
        workflowKey: workflowApproval.runId,
        workflowName: workflowApproval.description,
        runId: workflowApproval.runId,
        status: status === "approved" ? "completed" : "pending_approval",
        meta: { decision, comment },
      },
    });

    return true;
  });

  if (!result) return { ok: false, error: "Database not configured or approval not found" };
  return { ok: true };
}

export async function listWorkspaceIntegrations(ctx: OrgContext): Promise<IntegrationStatus[]> {
  const rows = await withAutomationDb(ctx, async (tx) => {
    const workspaceId = await ensureWorkspace(tx, ctx);
    const defs = await tx.integration.findMany({ orderBy: { name: "asc" } }) as DbIntegrationCatalogRow[];
    const connections = await tx.workspaceIntegration.findMany({
      where: { tenantId: ctx.tenantId, orgId: ctx.orgId, OR: [{ workspaceId }, { workspaceId: null }] },
      include: { integration: true, definition: true },
    }) as DbConnectedIntegrationRow[];
    const byKey = new Map<string, DbConnectedIntegrationRow>(connections.map((connection) => [connection.integration?.key ?? connection.definition.key, connection]));
    return defs.map((def) => {
      const connection = byKey.get(def.key);
      return {
        key: def.key,
        name: def.name,
        category: def.category,
        description: def.description,
        status: connection?.status ?? def.status,
        connectedAt: connection?.connectedAt ?? null,
      };
    });
  });
  return rows && rows.length > 0 ? rows : fallbackIntegrations();
}

export async function getRoiSummary(ctx: OrgContext): Promise<RoiSummary> {
  const fallback = defaultRoiSummary();
  const summary = await withAutomationDb(ctx, async (tx) => {
    const workspaceId = await ensureWorkspace(tx, ctx);
    const { periodStart } = getPeriodRange();
    const metrics = await tx.roiMetric.findMany({
      where: { tenantId: ctx.tenantId, orgId: ctx.orgId, workspaceId, periodStart: { gte: periodStart } },
      orderBy: { metricKey: "asc" },
    }) as DbRoiMetricRow[];
    const snapshots = await tx.workflowRoiSnapshot.findMany({
      where: { tenantId: ctx.tenantId, orgId: ctx.orgId, workspaceId, periodStart: { gte: periodStart } },
      include: { deployedWorkflow: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }) as DbWorkflowRoiSnapshotRow[];
    if (metrics.length === 0 && snapshots.length === 0) return null;

    const metricMap = new Map(metrics.map((metric) => [metric.metricKey, metric]));
    const value = (key: string, fallbackValue: number) => metricMap.get(key)?.value ?? fallbackValue;
    const generatedMetrics: ROIMetric[] = [
      { label: "Hours Saved This Month", value: formatMetricValue("hours_saved", value("hours_saved", fallback.hoursSaved), "hours"), sub: "stored in roi_metrics", icon: "Clock", color: "indigo" },
      { label: "Tasks Automated", value: formatMetricValue("tasks_automated", value("tasks_automated", fallback.tasksAutomated), "count"), sub: "completed workflow actions", icon: "Zap", color: "violet" },
      { label: "Leads Recovered", value: formatMetricValue("leads_recovered", value("leads_recovered", fallback.leadsRecovered), "count"), sub: "re-engaged opportunities", icon: "TrendingUp", color: "emerald" },
      { label: "Appointments Booked", value: formatMetricValue("appointments_booked", value("appointments_booked", fallback.appointmentsBooked), "count"), sub: "confirmed automatically", icon: "CalendarCheck", color: "teal" },
      { label: "Revenue Opportunity", value: formatMetricValue("revenue_opportunities_created", value("revenue_opportunities_created", fallback.revenueOpportunity), "inr"), sub: "pipeline created or recovered", icon: "CreditCard", color: "amber" },
      { label: "Support Tickets Resolved", value: formatMetricValue("support_tickets_resolved", value("support_tickets_resolved", fallback.supportTicketsResolved), "count"), sub: "resolved or summarized", icon: "CheckCircle2", color: "rose" },
      { label: "Reports Generated", value: formatMetricValue("reports_generated", value("reports_generated", fallback.reportsGenerated), "count"), sub: "daily, weekly, monthly", icon: "BarChart2", color: "sky" },
      { label: "Invoices Followed Up", value: formatMetricValue("invoices_followed_up", value("invoices_followed_up", fallback.invoicesFollowedUp), "count"), sub: "payment reminders tracked", icon: "FileText", color: "slate" },
    ];

    const breakdown = snapshots.slice(0, 12).map((snapshot) => ({
      workflow: snapshot.deployedWorkflow?.name ?? snapshot.workflowKey,
      runs: snapshot.tasksAutomated,
      hoursAvoided: Math.round(snapshot.hoursSaved),
      estValue: formatCurrency(snapshot.salaryCostSaved),
    }));

    return {
      hoursSaved: value("hours_saved", fallback.hoursSaved),
      tasksAutomated: value("tasks_automated", fallback.tasksAutomated),
      salaryCostSaved: value("salary_cost_saved", fallback.salaryCostSaved),
      leadsRecovered: value("leads_recovered", fallback.leadsRecovered),
      appointmentsBooked: value("appointments_booked", fallback.appointmentsBooked),
      candidatesShortlisted: value("candidates_shortlisted", fallback.candidatesShortlisted),
      supportTicketsResolved: value("support_tickets_resolved", fallback.supportTicketsResolved),
      codOrdersConfirmed: value("cod_orders_confirmed", fallback.codOrdersConfirmed),
      cartsRecovered: value("carts_recovered", fallback.cartsRecovered),
      invoicesFollowedUp: value("invoices_followed_up", fallback.invoicesFollowedUp),
      shipmentsTracked: value("shipments_tracked", fallback.shipmentsTracked),
      reportsGenerated: value("reports_generated", fallback.reportsGenerated),
      revenueOpportunity: value("revenue_opportunities_created", fallback.revenueOpportunity),
      clientReportsGenerated: value("client_reports_generated", fallback.clientReportsGenerated),
      reviewsRequested: value("reviews_requested", fallback.reviewsRequested),
      remindersSent: value("reminders_sent", fallback.remindersSent),
      metrics: generatedMetrics,
      breakdown: breakdown.length > 0 ? breakdown : fallback.breakdown,
      isLive: true,
    } satisfies RoiSummary;
  });
  return summary ?? fallback;
}

export async function getIndustryDashboard(key: string): Promise<IndustryDashboard | null> {
  return INDUSTRY_DASHBOARDS.find((dashboard) => dashboard.key === key) ?? null;
}

export async function getAgencyOsSnapshot(ctx: OrgContext): Promise<AgencyOsSnapshot> {
  const snapshot = await withAutomationDb(ctx, async (tx) => {
    const workspaceId = await ensureWorkspace(tx, ctx);
    const [profile, clients, packDeployments, approvals, activity, roi] = await Promise.all([
      tx.agencyProfile.findUnique({ where: { tenantId: ctx.tenantId } }),
      tx.agencyClientWorkspace.count({ where: { tenantId: ctx.tenantId, agencyWorkspaceId: workspaceId } }),
      tx.workspacePackDeployment.count({ where: { tenantId: ctx.tenantId } }),
      tx.approval.count({ where: { tenantId: ctx.tenantId, orgId: ctx.orgId, status: "pending" } }),
      tx.activityLog.count({ where: { tenantId: ctx.tenantId, orgId: ctx.orgId } }),
      tx.roiMetric.aggregate({ where: { tenantId: ctx.tenantId, orgId: ctx.orgId, metricKey: "revenue_opportunities_created" }, _sum: { value: true } }),
    ]);
    return {
      whiteLabelEnabled: profile?.whiteLabelEnabled ?? false,
      agencyName: profile?.agencyName ?? process.env.NEXT_PUBLIC_AGENCY_NAME ?? "Demo Agency",
      clientWorkspaceCount: clients,
      deployedClientPackCount: packDeployments,
      pendingApprovalCount: approvals,
      activityCount: activity,
      roiValue: roi._sum.value ?? 0,
      live: true,
    };
  });

  return snapshot ?? {
    whiteLabelEnabled: false,
    agencyName: "Demo Agency",
    clientWorkspaceCount: 0,
    deployedClientPackCount: 0,
    pendingApprovalCount: 0,
    activityCount: 0,
    roiValue: 0,
    live: false,
  };
}

export type { DeployedWorkflowRecord, WorkflowRunRecord };

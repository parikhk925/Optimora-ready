/**
 * Automation OS data layer.
 *
 * Uses Prisma when DATABASE_URL is configured and falls back to the local
 * catalog only when the DB is absent, unreachable, or not migrated yet.
 * External integrations are never treated as live unless a workspace
 * integration is connected.
 */

import type { PrismaClient, TxClient } from "@optimora/db";
import { executeStepsFrom, finalizeRun } from "./engine/execute";
import { testIntegrationConnection as testIntegrationConnectionImpl } from "./integrations/registry";
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
  triggerType: string;
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
  triggerType: string;
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

/**
 * Resolves the tenant/org context for a public inbound webhook, given only a
 * workspaceId + deployedWorkflowId from the URL (no session). Uses the system
 * (superuser) connection to read the workspace's tenant/org — required
 * because tenant_id/org_id are exactly what RLS needs and we don't have a
 * session to derive them from yet. Returns null if the workspace or workflow
 * doesn't exist, or the workflow doesn't belong to that workspace.
 */
export async function resolveWebhookContext(
  workspaceId: string,
  deployedWorkflowId: string,
): Promise<OrgContext | null> {
  const mod = await getDbModule();
  if (!mod) return null;
  try {
    const system = mod.getSystemPrisma();
    const workspace = await system.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) return null;
    const workflow = await system.deployedWorkflow.findFirst({
      where: { id: deployedWorkflowId, workspaceId: workspace.id },
    });
    if (!workflow) return null;
    if (!workspace.orgId) return null;
    return { tenantId: workspace.tenantId, orgId: workspace.orgId, workspaceId: workspace.id };
  } catch {
    return null;
  }
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Guards Prisma @db.Uuid columns against non-UUID actor ids (e.g. the "dev-user" stub). */
function toUuidOrNull(value: string | null | undefined): string | null {
  return value && UUID_RE.test(value) ? value : null;
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
        stepType: (step as unknown as { stepType?: string }).stepType ?? "action",
        config: toPrismaJson((step as unknown as { config?: unknown }).config ?? {}),
        maxRetries: (step as unknown as { maxRetries?: number }).maxRetries ?? 0,
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

  await tx.auditLog.create({
    data: { tenantId: ctx.tenantId, orgId: ctx.orgId, service: "automation-os", eventType: "workflow.created", occurredAt: new Date(), payload: { deployedWorkflowId: deployed.id, templateKey: template.key, actorId: ctx.actorId ?? null } },
  }).catch(() => undefined);

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
        deployedBy: toUuidOrNull(ctx.actorId ?? null),
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

function effectiveStepType(step: { stepType: string; approvalRequired: boolean }): string {
  if (step.approvalRequired) return "approval";
  // Legacy/generic catalog steps predate the stepType column and default to
  // "action" — run them as ai_agent so every step produces real structured
  // output instead of a no-op placeholder.
  return step.stepType === "action" ? "ai_agent" : step.stepType;
}

export async function startWorkflowRun(
  ctx: OrgContext,
  deployedWorkflowId: string,
  inputData: Record<string, unknown> = {},
  triggerType: "manual" | "webhook" = "manual",
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

    const deployedSteps = deployed.steps as unknown as Array<{
      id: string;
      stepNumber: number;
      name: string;
      agentKey: string;
      approvalRequired: boolean;
      stepType: string;
      config: unknown;
      maxRetries: number;
    }>;

    const run = await tx.workflowRun.create({
      data: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId,
        workspaceId,
        deployedWorkflowId: deployed.id,
        status: "running",
        triggerType,
        workflowVersion: deployed.version,
        currentStep: 1,
        startedByUserId: toUuidOrNull(ctx.actorId),
        inputData: toPrismaJson(inputData),
        startedAt: new Date(),
      },
    });

    for (const step of deployedSteps) {
      await tx.workflowRunStep.create({
        data: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId,
          workspaceId,
          runId: run.id,
          stepNumber: step.stepNumber,
          label: step.name,
          agentKey: step.agentKey,
          status: "pending",
          stepType: effectiveStepType(step),
          approvalRequired: step.approvalRequired,
          maxRetries: step.maxRetries ?? 0,
          inputData: toPrismaJson(inputData),
          outputData: {},
        },
      });
    }

    const engineSteps = deployedSteps.map((step) => ({
      id: step.id,
      stepNumber: step.stepNumber,
      name: step.name,
      agentKey: step.agentKey,
      approvalRequired: step.approvalRequired,
      status: "pending",
      stepType: effectiveStepType(step),
      config: step.config,
      maxRetries: step.maxRetries ?? 0,
    }));

    const outcome = await executeStepsFrom(
      tx,
      ctx,
      workspaceId,
      run.id,
      { id: deployed.id, name: deployed.name, mode: deployed.mode, version: deployed.version, templateKey: deployed.template.key, steps: engineSteps },
      0,
      { input: inputData },
    );
    await finalizeRun(tx, ctx, workspaceId, run.id, { id: deployed.id, name: deployed.name, mode: deployed.mode, version: deployed.version, templateKey: deployed.template.key, steps: engineSteps }, outcome);

    await tx.auditLog.create({
      data: { tenantId: ctx.tenantId, orgId: ctx.orgId, service: "automation-os", eventType: "workflow_run.started", runId: run.id, occurredAt: new Date(), payload: { deployedWorkflowId: deployed.id, triggerType, actorId: ctx.actorId ?? null } },
    }).catch(() => undefined);

    return { id: run.id, status: outcome.status };
  });

  if (!result) return { error: "Database not configured or Automation OS migration not applied; staying in demo mode." };
  return result;
}

/** Resumes a run from the step after the one that was awaiting approval. */
export async function resumeWorkflowRun(ctx: OrgContext, runId: string): Promise<{ ok: boolean; status?: string; error?: string }> {
  const result = await withAutomationDb(ctx, async (tx) => {
    const run = await tx.workflowRun.findFirst({ where: { id: runId, tenantId: ctx.tenantId, orgId: ctx.orgId } });
    if (!run) throw new Error("Run not found");
    if (run.status !== "waiting_for_approval") throw new Error(`Run is not waiting for approval (status: ${run.status})`);

    const deployed = await tx.deployedWorkflow.findFirst({
      where: { id: run.deployedWorkflowId },
      include: { steps: { orderBy: { stepNumber: "asc" } }, template: { select: { key: true } } },
    });
    if (!deployed) throw new Error("Deployed workflow not found");

    const runSteps = await tx.workflowRunStep.findMany({ where: { runId }, orderBy: { stepNumber: "asc" } });
    const pausedStep = runSteps.find((s) => s.status === "waiting_for_approval");
    if (!pausedStep) throw new Error("No step is currently waiting for approval");

    // Mark the paused step completed (the approval gate itself passed) and
    // rebuild the accumulated context from prior completed steps.
    await tx.workflowRunStep.update({ where: { id: pausedStep.id }, data: { status: "completed", completedAt: new Date() } });

    const workspaceId = run.workspaceId ?? (await ensureWorkspace(tx, ctx));
    const context: Record<string, unknown> = { input: run.inputData, steps: {} };
    for (const s of runSteps) {
      if (s.status === "completed" || s.id === pausedStep.id) {
        (context.steps as Record<string, unknown>)[s.stepNumber] = s.outputData;
        if (s.stepType === "ai_agent") context.latestAiOutput = s.outputData;
      }
    }

    const engineSteps = (deployed.steps as unknown as Array<{ id: string; stepNumber: number; name: string; agentKey: string; approvalRequired: boolean; stepType: string; config: unknown; maxRetries: number }>).map((s) => ({
      ...s,
      status: "pending",
      stepType: effectiveStepType(s),
      maxRetries: s.maxRetries ?? 0,
    }));

    await tx.workflowRun.update({ where: { id: runId }, data: { status: "running" } });

    const fromIndex = engineSteps.findIndex((s) => s.stepNumber === pausedStep.stepNumber) + 1;
    const outcome = await executeStepsFrom(
      tx,
      ctx,
      workspaceId,
      runId,
      { id: deployed.id, name: deployed.name, mode: deployed.mode, version: deployed.version, templateKey: deployed.template.key, steps: engineSteps },
      fromIndex,
      context,
    );
    await finalizeRun(tx, ctx, workspaceId, runId, { id: deployed.id, name: deployed.name, mode: deployed.mode, version: deployed.version, templateKey: deployed.template.key, steps: engineSteps }, outcome);

    return { status: outcome.status };
  });
  if (!result) return { ok: false, error: "Database not configured, run not found, or run is not waiting for approval." };
  return { ok: true, status: result.status };
}

/** Stops a run and any pending/running steps. */
export async function cancelWorkflowRun(ctx: OrgContext, runId: string): Promise<{ ok: boolean; error?: string }> {
  const result = await withAutomationDb(ctx, async (tx) => {
    const run = await tx.workflowRun.findFirst({ where: { id: runId, tenantId: ctx.tenantId, orgId: ctx.orgId } });
    if (!run) throw new Error("Run not found");
    if (run.status === "completed" || run.status === "failed" || run.status === "cancelled") {
      throw new Error(`Run already terminal (status: ${run.status})`);
    }
    await tx.workflowRunStep.updateMany({
      where: { runId, status: { in: ["pending", "running", "waiting_for_approval"] } },
      data: { status: "cancelled", completedAt: new Date() },
    });
    await tx.workflowRun.update({ where: { id: runId }, data: { status: "cancelled", cancelledAt: new Date(), completedAt: new Date() } });
    await tx.approval.updateMany({ where: { workflowRunId: runId, status: "pending" }, data: { status: "rejected", rejectedAt: new Date() } });
    await tx.workflowApproval.updateMany({ where: { runId, status: "pending" }, data: { status: "rejected", reviewedAt: new Date() } });
    await tx.activityLog.create({
      data: {
        tenantId: ctx.tenantId, orgId: ctx.orgId, workspaceId: run.workspaceId,
        agentKey: "automation-os", agentName: "Automation OS", action: "cancelled workflow run",
        count: 1, unit: "run", workflowKey: "run", workflowName: "Workflow run", runId,
        status: "failed", meta: { cancelled: true },
      },
    });
    return true;
  });
  if (!result) return { ok: false, error: "Database not configured, run not found, or run already terminal." };
  return { ok: true };
}

/** Re-runs a failed run's failed step (and everything after it) with a fresh retry budget. */
export async function retryWorkflowRun(ctx: OrgContext, runId: string): Promise<{ ok: boolean; status?: string; error?: string }> {
  const result = await withAutomationDb(ctx, async (tx) => {
    const run = await tx.workflowRun.findFirst({ where: { id: runId, tenantId: ctx.tenantId, orgId: ctx.orgId } });
    if (!run) throw new Error("Run not found");
    if (run.status !== "failed") throw new Error(`Run is not failed (status: ${run.status})`);

    const deployed = await tx.deployedWorkflow.findFirst({
      where: { id: run.deployedWorkflowId },
      include: { steps: { orderBy: { stepNumber: "asc" } }, template: { select: { key: true } } },
    });
    if (!deployed) throw new Error("Deployed workflow not found");

    const runSteps = await tx.workflowRunStep.findMany({ where: { runId }, orderBy: { stepNumber: "asc" } });
    const failedStep = runSteps.find((s) => s.status === "failed");
    if (!failedStep) throw new Error("No failed step found on this run");

    const workspaceId = run.workspaceId ?? (await ensureWorkspace(tx, ctx));
    const context: Record<string, unknown> = { input: run.inputData, steps: {} };
    for (const s of runSteps) {
      if (s.stepNumber < failedStep.stepNumber) {
        (context.steps as Record<string, unknown>)[s.stepNumber] = s.outputData;
        if (s.stepType === "ai_agent") context.latestAiOutput = s.outputData;
      }
    }

    await tx.workflowRunStep.update({ where: { id: failedStep.id }, data: { status: "pending", error: undefined, errorMessage: null, retryCount: 0 } });
    await tx.workflowRun.update({ where: { id: runId }, data: { status: "running", errorMessage: null } });

    const engineSteps = (deployed.steps as unknown as Array<{ id: string; stepNumber: number; name: string; agentKey: string; approvalRequired: boolean; stepType: string; config: unknown; maxRetries: number }>).map((s) => ({
      ...s,
      status: "pending",
      stepType: effectiveStepType(s),
      maxRetries: s.maxRetries ?? 0,
    }));
    const fromIndex = engineSteps.findIndex((s) => s.stepNumber === failedStep.stepNumber);

    const outcome = await executeStepsFrom(
      tx, ctx, workspaceId, runId,
      { id: deployed.id, name: deployed.name, mode: deployed.mode, version: deployed.version, templateKey: deployed.template.key, steps: engineSteps },
      fromIndex, context,
    );
    await finalizeRun(tx, ctx, workspaceId, runId, { id: deployed.id, name: deployed.name, mode: deployed.mode, version: deployed.version, templateKey: deployed.template.key, steps: engineSteps }, outcome);
    return { status: outcome.status };
  });
  if (!result) return { ok: false, error: "Database not configured, run not found, or run is not in a failed state." };
  return { ok: true, status: result.status };
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
    triggerType: row.triggerType,
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

export interface ApprovalDetail {
  id: string;
  runId: string;
  agentKey: string;
  description: string;
  proposedAction: Record<string, unknown>;
  status: string;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewerComment: string | null;
}

/** GET /api/automation/approvals/:id */
export async function getApprovalDetail(ctx: OrgContext, approvalId: string): Promise<ApprovalDetail | null> {
  const row = await withAutomationDb(ctx, async (tx) =>
    tx.workflowApproval.findFirst({ where: { id: approvalId, tenantId: ctx.tenantId, orgId: ctx.orgId } }),
  );
  if (!row) return null;
  return {
    id: row.id,
    runId: row.runId,
    agentKey: row.agentKey,
    description: row.description,
    proposedAction: row.proposedAction as Record<string, unknown>,
    status: row.status,
    createdAt: row.createdAt,
    reviewedAt: row.reviewedAt,
    reviewerComment: row.reviewerComment,
  };
}

export async function reviewApproval(
  ctx: OrgContext,
  approvalId: string,
  decision: "approve" | "reject" | "request_changes",
  reviewedBy: string,
  comment?: string,
): Promise<{ ok: boolean; error?: string; runStatus?: string }> {
  const result = await withAutomationDb(ctx, async (tx) => {
    const workflowApproval = await tx.workflowApproval.findFirst({
      where: { id: approvalId, tenantId: ctx.tenantId, orgId: ctx.orgId },
    });
    if (!workflowApproval) throw new Error("Approval not found");
    if (workflowApproval.status !== "pending") throw new Error("Already reviewed");

    const reviewerUuid = toUuidOrNull(reviewedBy);
    const status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "changes_requested";
    await tx.workflowApproval.update({
      where: { id: approvalId },
      data: {
        status,
        reviewedBy: reviewerUuid,
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
          ? { status, approvedBy: reviewerUuid, approvedAt: new Date() }
          : decision === "reject"
            ? { status, rejectedBy: reviewerUuid, rejectedAt: new Date() }
            : { status, changesRequestedBy: reviewerUuid, changesRequestedAt: new Date() },
      });
      if (comment && reviewerUuid) {
        await tx.approvalComment.create({ data: { approvalId: generalApproval.id, authorId: reviewerUuid, comment } });
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

    return { runId: workflowApproval.runId, decision };
  });

  if (!result) return { ok: false, error: "Database not configured or approval not found" };

  await withAutomationDb(ctx, async (tx) => {
    await tx.auditLog.create({
      data: { tenantId: ctx.tenantId, orgId: ctx.orgId, service: "automation-os", eventType: `approval.${result.decision === "approve" ? "approved" : result.decision === "reject" ? "rejected" : "changes_requested"}`, runId: result.runId, occurredAt: new Date(), payload: { approvalId, actorId: reviewedBy } },
    }).catch(() => undefined);
  });

  // Resume/fail the run OUTSIDE the approval transaction to avoid nested
  // transactions (each of these opens its own withAutomationDb transaction).
  if (result.decision === "approve") {
    const resumed = await resumeWorkflowRun(ctx, result.runId);
    if (!resumed.ok) return { ok: false, error: resumed.error };
    return { ok: true, runStatus: resumed.status };
  }
  if (result.decision === "reject") {
    const failed = await failRunFromRejectedApproval(ctx, result.runId);
    if (!failed.ok) return { ok: false, error: failed.error };
    return { ok: true, runStatus: "failed" };
  }
  return { ok: true };
}

/** Marks a run as failed because its approval was rejected. Remaining pending/waiting steps are cancelled. */
async function failRunFromRejectedApproval(ctx: OrgContext, runId: string): Promise<{ ok: boolean; error?: string }> {
  const result = await withAutomationDb(ctx, async (tx) => {
    const run = await tx.workflowRun.findFirst({ where: { id: runId, tenantId: ctx.tenantId, orgId: ctx.orgId } });
    if (!run) throw new Error("Run not found");
    await tx.workflowRunStep.updateMany({
      where: { runId, status: { in: ["pending", "waiting_for_approval"] } },
      data: { status: "cancelled", completedAt: new Date() },
    });
    await tx.workflowRun.update({
      where: { id: runId },
      data: { status: "failed", completedAt: new Date(), errorMessage: "Approval rejected by reviewer" },
    });
    return true;
  });
  if (!result) return { ok: false, error: "Database not configured or run not found" };
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

// ═══════════════════════════════════════════════════════════════════════════
// RUN DETAIL, LOGS, USAGE, BILLING, INTEGRATION CONNECT/DISCONNECT/TEST
// ═══════════════════════════════════════════════════════════════════════════

export interface WorkflowRunStepDetail {
  id: string;
  stepNumber: number;
  label: string;
  agentKey: string;
  status: string;
  stepType: string;
  approvalRequired: boolean;
  inputData: unknown;
  outputData: unknown;
  error: unknown;
  retryCount: number;
  maxRetries: number;
  durationMs: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface WorkflowRunDetail {
  id: string;
  workflowName: string;
  deployedWorkflowId: string;
  status: string;
  triggerType: string;
  workflowVersion: number;
  inputData: unknown;
  outputSummary: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  steps: WorkflowRunStepDetail[];
  logs: Array<{ id: string; level: string; message: string; data: unknown; createdAt: Date; workflowRunStepId: string | null }>;
}

/** Full run detail — steps + logs — for the run detail page and GET /api/automation/runs/:id. */
export async function getWorkflowRunDetail(ctx: OrgContext, runId: string): Promise<WorkflowRunDetail | null> {
  const result = await withAutomationDb(ctx, async (tx) => {
    const run = await tx.workflowRun.findFirst({
      where: { id: runId, tenantId: ctx.tenantId, orgId: ctx.orgId },
      include: { deployedWorkflow: { select: { name: true } } },
    });
    if (!run) return null;
    const steps = await tx.workflowRunStep.findMany({ where: { runId }, orderBy: { stepNumber: "asc" } });
    const logs = await tx.executionLog.findMany({ where: { workflowRunId: runId }, orderBy: { createdAt: "asc" } });
    return {
      id: run.id,
      workflowName: run.deployedWorkflow.name,
      deployedWorkflowId: run.deployedWorkflowId,
      status: run.status,
      triggerType: run.triggerType,
      workflowVersion: run.workflowVersion,
      inputData: run.inputData,
      outputSummary: run.outputSummary,
      errorMessage: run.errorMessage,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      cancelledAt: run.cancelledAt,
      createdAt: run.createdAt,
      steps: steps.map((s) => ({
        id: s.id,
        stepNumber: s.stepNumber,
        label: s.label,
        agentKey: s.agentKey,
        status: s.status,
        stepType: s.stepType,
        approvalRequired: s.approvalRequired,
        inputData: s.inputData,
        outputData: s.outputData,
        error: s.error,
        retryCount: s.retryCount,
        maxRetries: s.maxRetries,
        durationMs: s.durationMs,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
      })),
      logs: logs.map((l) => ({ id: l.id, level: l.level, message: l.message, data: l.data, createdAt: l.createdAt, workflowRunStepId: l.workflowRunStepId })),
    } satisfies WorkflowRunDetail;
  });
  return result ?? null;
}

/** GET /api/automation/logs — execution log stream, optionally filtered by run. */
export async function listExecutionLogs(ctx: OrgContext, options: { runId?: string; limit?: number } = {}): Promise<
  Array<{ id: string; workflowRunId: string; workflowRunStepId: string | null; level: string; message: string; data: unknown; createdAt: Date }>
> {
  const rows = await withAutomationDb(ctx, async (tx) =>
    tx.executionLog.findMany({
      where: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId,
        ...(ctx.workspaceId ? { workspaceId: ctx.workspaceId } : {}),
        ...(options.runId ? { workflowRunId: options.runId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 100,
    }),
  );
  return rows ?? [];
}

const DEFAULT_PLAN_CATALOG = [
  { key: "free_demo", name: "Free Demo", priceMonthlyUsd: 0, maxWorkflowRunsPerMonth: 50, maxAgentRunsPerMonth: 200, maxIntegrationActionsPerMonth: 100, maxSeats: 2, features: ["Mock integrations", "Community support"], sortOrder: 0 },
  { key: "starter", name: "Starter", priceMonthlyUsd: 49, maxWorkflowRunsPerMonth: 500, maxAgentRunsPerMonth: 2000, maxIntegrationActionsPerMonth: 1000, maxSeats: 5, features: ["Email support", "5 seats"], sortOrder: 1 },
  { key: "pro", name: "Pro", priceMonthlyUsd: 199, maxWorkflowRunsPerMonth: 5000, maxAgentRunsPerMonth: 20000, maxIntegrationActionsPerMonth: 10000, maxSeats: 20, features: ["Priority support", "20 seats", "Real integrations"], sortOrder: 2 },
  { key: "agency", name: "Agency", priceMonthlyUsd: 499, maxWorkflowRunsPerMonth: null, maxAgentRunsPerMonth: null, maxIntegrationActionsPerMonth: null, maxSeats: null, features: ["Unlimited usage", "White-label", "Dedicated support"], sortOrder: 3 },
] as const;

/** Ensures the global billing plan catalog exists (idempotent). */
async function ensureBillingPlans(tx: TxClient): Promise<void> {
  const count = await tx.billingPlan.count();
  if (count > 0) return;
  for (const plan of DEFAULT_PLAN_CATALOG) {
    await tx.billingPlan.create({ data: { ...plan, currency: "USD", isActive: true, features: toPrismaJson([...plan.features]) } });
  }
}

export interface BillingPlanRecord {
  key: string; name: string; priceMonthlyUsd: number; currency: string;
  maxWorkflowRunsPerMonth: number | null; maxAgentRunsPerMonth: number | null; maxIntegrationActionsPerMonth: number | null; maxSeats: number | null;
  features: string[];
}

/** GET /api/billing/plans */
export async function getBillingPlans(): Promise<BillingPlanRecord[]> {
  const db = await getPrisma();
  if (!db) return DEFAULT_PLAN_CATALOG.map((p) => ({ ...p, currency: "USD", features: [...p.features] }));
  try {
    await db.$transaction(async (tx) => ensureBillingPlans(tx as unknown as TxClient));
    const rows = await db.billingPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
    return rows.map((r) => ({
      key: r.key, name: r.name, priceMonthlyUsd: r.priceMonthlyUsd, currency: r.currency,
      maxWorkflowRunsPerMonth: r.maxWorkflowRunsPerMonth, maxAgentRunsPerMonth: r.maxAgentRunsPerMonth,
      maxIntegrationActionsPerMonth: r.maxIntegrationActionsPerMonth, maxSeats: r.maxSeats,
      features: toStringArray(r.features),
    }));
  } catch {
    return DEFAULT_PLAN_CATALOG.map((p) => ({ ...p, currency: "USD", features: [...p.features] }));
  }
}

export interface SubscriptionRecord {
  planKey: string; planName: string; status: string; checkoutRequired: boolean;
  currentPeriodStart: Date; currentPeriodEnd: Date | null;
  limits: { maxWorkflowRunsPerMonth: number | null; maxAgentRunsPerMonth: number | null; maxIntegrationActionsPerMonth: number | null; maxSeats: number | null };
}

/** GET /api/billing/subscription — auto-provisions a Free Demo subscription if none exists. */
export async function getWorkspaceSubscription(ctx: OrgContext): Promise<SubscriptionRecord> {
  const fallbackPlan = DEFAULT_PLAN_CATALOG[0];
  const result = await withAutomationDb(ctx, async (tx) => {
    const workspaceId = await ensureWorkspace(tx, ctx);
    await ensureBillingPlans(tx);
    let sub = await tx.workspaceSubscription.findUnique({ where: { workspaceId }, include: { plan: true } });
    if (!sub) {
      const freeDemo = await tx.billingPlan.findUnique({ where: { key: "free_demo" } });
      if (!freeDemo) throw new Error("Billing plan catalog not seeded");
      sub = await tx.workspaceSubscription.create({
        data: { tenantId: ctx.tenantId, orgId: ctx.orgId, workspaceId, planId: freeDemo.id, status: "active", checkoutRequired: false },
        include: { plan: true },
      });
    }
    return {
      planKey: sub.plan.key, planName: sub.plan.name, status: sub.status, checkoutRequired: sub.checkoutRequired,
      currentPeriodStart: sub.currentPeriodStart, currentPeriodEnd: sub.currentPeriodEnd,
      limits: {
        maxWorkflowRunsPerMonth: sub.plan.maxWorkflowRunsPerMonth, maxAgentRunsPerMonth: sub.plan.maxAgentRunsPerMonth,
        maxIntegrationActionsPerMonth: sub.plan.maxIntegrationActionsPerMonth, maxSeats: sub.plan.maxSeats,
      },
    } satisfies SubscriptionRecord;
  });
  return result ?? {
    planKey: fallbackPlan.key, planName: fallbackPlan.name, status: "active", checkoutRequired: false,
    currentPeriodStart: new Date(), currentPeriodEnd: null,
    limits: { maxWorkflowRunsPerMonth: fallbackPlan.maxWorkflowRunsPerMonth, maxAgentRunsPerMonth: fallbackPlan.maxAgentRunsPerMonth, maxIntegrationActionsPerMonth: fallbackPlan.maxIntegrationActionsPerMonth, maxSeats: fallbackPlan.maxSeats },
  };
}

export interface UsageSummary {
  periodStart: Date;
  counts: { workflow_run: number; agent_run: number; integration_action: number };
  limits: { maxWorkflowRunsPerMonth: number | null; maxAgentRunsPerMonth: number | null; maxIntegrationActionsPerMonth: number | null };
  overLimit: { workflow_run: boolean; agent_run: boolean; integration_action: boolean };
}

/** GET /api/automation/usage and GET /api/billing/usage */
export async function getUsageSummary(ctx: OrgContext): Promise<UsageSummary> {
  const { periodStart } = getPeriodRange();
  const subscription = await getWorkspaceSubscription(ctx);
  const result = await withAutomationDb(ctx, async (tx) => {
    const workspaceId = await ensureWorkspace(tx, ctx);
    const grouped = await tx.usageEvent.groupBy({
      by: ["eventType"],
      where: { tenantId: ctx.tenantId, orgId: ctx.orgId, workspaceId, createdAt: { gte: periodStart } },
      _sum: { quantity: true },
    });
    const map = new Map(grouped.map((g) => [g.eventType, g._sum.quantity ?? 0]));
    return {
      workflow_run: map.get("workflow_run") ?? 0,
      agent_run: map.get("agent_run") ?? 0,
      integration_action: map.get("integration_action") ?? 0,
    };
  });
  const counts = result ?? { workflow_run: 0, agent_run: 0, integration_action: 0 };
  const limits = {
    maxWorkflowRunsPerMonth: subscription.limits.maxWorkflowRunsPerMonth,
    maxAgentRunsPerMonth: subscription.limits.maxAgentRunsPerMonth,
    maxIntegrationActionsPerMonth: subscription.limits.maxIntegrationActionsPerMonth,
  };
  return {
    periodStart,
    counts,
    limits,
    overLimit: {
      workflow_run: limits.maxWorkflowRunsPerMonth != null && counts.workflow_run >= limits.maxWorkflowRunsPerMonth,
      agent_run: limits.maxAgentRunsPerMonth != null && counts.agent_run >= limits.maxAgentRunsPerMonth,
      integration_action: limits.maxIntegrationActionsPerMonth != null && counts.integration_action >= limits.maxIntegrationActionsPerMonth,
    },
  };
}

/** Enforces the workflow_run plan limit before starting a new run. */
export async function checkUsageLimit(ctx: OrgContext, eventType: "workflow_run" | "agent_run" | "integration_action"): Promise<{ allowed: boolean; reason?: string }> {
  const usage = await getUsageSummary(ctx);
  if (usage.overLimit[eventType]) {
    return { allowed: false, reason: `Monthly ${eventType.replace("_", " ")} limit reached for your plan. Upgrade to continue.` };
  }
  return { allowed: true };
}

const CONNECTABLE_PROVIDERS = ["webhook", "google-sheets", "email", "crm", "gmail"] as const;

/**
 * Persists a completed Gmail OAuth connection (real tokens) after the OAuth
 * callback exchanges the authorization code. Tokens are stored in
 * WorkspaceIntegration.configSnapshot — the same tenant/org-scoped column
 * every other integration already uses for its config. Known limitation:
 * stored as-is (not separately encrypted at rest); acceptable for this pass
 * since the column lives behind the same RLS as the rest of workspace data,
 * but a dedicated secrets vault would be a stronger long-term home for it.
 */
export async function connectGmailIntegration(
  ctx: OrgContext,
  tokens: { accessToken: string; refreshToken?: string; expiresAt: string },
): Promise<{ ok: boolean; status?: string; error?: string }> {
  const result = await withAutomationDb(ctx, async (tx) => {
    const workspaceId = await ensureWorkspace(tx, ctx);
    const definition = await tx.integrationDefinition.upsert({
      where: { key: "gmail" },
      update: {},
      create: { key: "gmail", name: "Gmail", category: "communication", description: "Gmail integration", status: "beta" },
    });
    const connection = await tx.workspaceIntegration.upsert({
      where: { orgId_definitionId: { orgId: ctx.orgId, definitionId: definition.id } },
      update: {
        status: "connected", authType: "oauth", workspaceId,
        configSnapshot: toPrismaJson(tokens), connectedAt: new Date(), connectedBy: toUuidOrNull(ctx.actorId),
      },
      create: {
        tenantId: ctx.tenantId, orgId: ctx.orgId, workspaceId, definitionId: definition.id,
        status: "connected", authType: "oauth", configSnapshot: toPrismaJson(tokens),
        connectedAt: new Date(), connectedBy: toUuidOrNull(ctx.actorId),
      },
    });
    await tx.auditLog.create({
      data: { tenantId: ctx.tenantId, orgId: ctx.orgId, service: "automation-os", eventType: "integration.connected", sourceRef: connection.id, occurredAt: new Date(), payload: { provider: "gmail", actorId: ctx.actorId ?? null } },
    }).catch(() => undefined);
    return connection.status;
  });
  if (!result) return { ok: false, error: "Database not configured" };
  return { ok: true, status: result };
}

/** POST /api/automation/integrations/:provider/connect — always mock/architectural in this pass (no real OAuth wired). */
export async function connectIntegration(ctx: OrgContext, provider: string, config: Record<string, unknown> = {}): Promise<{ ok: boolean; status?: string; error?: string }> {
  if (!CONNECTABLE_PROVIDERS.includes(provider as (typeof CONNECTABLE_PROVIDERS)[number])) {
    return { ok: false, error: `Unknown integration provider: ${provider}` };
  }
  const result = await withAutomationDb(ctx, async (tx) => {
    const workspaceId = await ensureWorkspace(tx, ctx);
    const definition = await tx.integrationDefinition.upsert({
      where: { key: provider },
      update: {},
      create: { key: provider, name: provider, category: "automation", description: `${provider} integration`, status: "beta" },
    });
    const authType = provider === "webhook" ? "webhook" : "mock";
    const connection = await tx.workspaceIntegration.upsert({
      where: { orgId_definitionId: { orgId: ctx.orgId, definitionId: definition.id } },
      update: { status: "connected", authType, workspaceId, configSnapshot: toPrismaJson(config), connectedAt: new Date(), connectedBy: toUuidOrNull(ctx.actorId) },
      create: {
        tenantId: ctx.tenantId, orgId: ctx.orgId, workspaceId, definitionId: definition.id,
        status: "connected", authType, configSnapshot: toPrismaJson(config), connectedAt: new Date(), connectedBy: toUuidOrNull(ctx.actorId),
      },
    });
    await tx.auditLog.create({
      data: { tenantId: ctx.tenantId, orgId: ctx.orgId, service: "automation-os", eventType: "integration.connected", sourceRef: connection.id, occurredAt: new Date(), payload: { provider, actorId: ctx.actorId ?? null } },
    }).catch(() => undefined);
    return connection.status;
  });
  if (!result) return { ok: false, error: "Database not configured" };
  return { ok: true, status: result };
}

/** POST /api/automation/integrations/:provider/disconnect */
export async function disconnectIntegration(ctx: OrgContext, provider: string): Promise<{ ok: boolean; error?: string }> {
  const result = await withAutomationDb(ctx, async (tx) => {
    const definition = await tx.integrationDefinition.findUnique({ where: { key: provider } });
    if (!definition) throw new Error(`Unknown integration provider: ${provider}`);
    await tx.workspaceIntegration.updateMany({
      where: { orgId: ctx.orgId, definitionId: definition.id },
      data: { status: "not_connected", credentialRef: null, connectedAt: null },
    });
    await tx.auditLog.create({
      data: { tenantId: ctx.tenantId, orgId: ctx.orgId, service: "automation-os", eventType: "integration.disconnected", sourceRef: definition.id, occurredAt: new Date(), payload: { provider, actorId: ctx.actorId ?? null } },
    }).catch(() => undefined);
    return true;
  });
  if (!result) return { ok: false, error: "Database not configured or provider not found" };
  return { ok: true };
}

/** POST /api/automation/integrations/:provider/test */
export async function testIntegrationConnectionAction(ctx: OrgContext, provider: string): Promise<{ ok: boolean; status?: string; label?: string; error?: string }> {
  if (!CONNECTABLE_PROVIDERS.includes(provider as (typeof CONNECTABLE_PROVIDERS)[number])) {
    return { ok: false, error: `Unknown integration provider: ${provider}` };
  }
  const result = await withAutomationDb(ctx, async (tx) => {
    const workspaceId = await ensureWorkspace(tx, ctx);
    const test = await testIntegrationConnectionImpl({ tx, tenantId: ctx.tenantId, orgId: ctx.orgId, workspaceId }, provider);
    if (test.status === "failed") {
      const definition = await tx.integrationDefinition.findUnique({ where: { key: provider } });
      if (definition) {
        await tx.workspaceIntegration.updateMany({ where: { orgId: ctx.orgId, definitionId: definition.id }, data: { lastErrorAt: new Date() } });
      }
    }
    return test;
  });
  if (!result) return { ok: false, error: "Database not configured" };
  return { ok: true, status: result.status, label: result.label };
}

/** GET /api/automation/workflows/:id — deployed workflow detail with steps. */
export async function getDeployedWorkflowDetail(ctx: OrgContext, deployedWorkflowId: string): Promise<
  (DeployedWorkflowRecord & { lifecycleStatus: string; version: number; steps: Array<{ stepNumber: number; name: string; agentKey: string; stepType: string; approvalRequired: boolean }> }) | null
> {
  const result = await withAutomationDb(ctx, async (tx) => {
    const row = await tx.deployedWorkflow.findFirst({
      where: { id: deployedWorkflowId, tenantId: ctx.tenantId, orgId: ctx.orgId },
      include: { template: { select: { key: true } }, steps: { orderBy: { stepNumber: "asc" } }, runs: { select: { id: true } } },
    });
    if (!row) return null;
    return {
      id: row.id, name: row.name, templateKey: row.template.key, status: row.status,
      deployedAt: row.deployedAt, runCount: row.runs.length, lifecycleStatus: row.lifecycleStatus, version: row.version,
      steps: row.steps.map((s) => ({ stepNumber: s.stepNumber, name: s.name, agentKey: s.agentKey, stepType: s.stepType, approvalRequired: s.approvalRequired })),
    };
  });
  return result ?? null;
}

/** PATCH /api/automation/workflows/:id */
export async function updateDeployedWorkflow(ctx: OrgContext, deployedWorkflowId: string, patch: { name?: string }): Promise<{ ok: boolean; error?: string }> {
  const result = await withAutomationDb(ctx, async (tx) => {
    const row = await tx.deployedWorkflow.findFirst({ where: { id: deployedWorkflowId, tenantId: ctx.tenantId, orgId: ctx.orgId } });
    if (!row) throw new Error("Workflow not found");
    await tx.deployedWorkflow.update({ where: { id: deployedWorkflowId }, data: { name: patch.name ?? row.name } });
    return true;
  });
  if (!result) return { ok: false, error: "Database not configured or workflow not found" };
  return { ok: true };
}

/** POST /api/automation/workflows/:id/publish — locks in a new version and sets lifecycleStatus=active. */
export async function publishDeployedWorkflow(ctx: OrgContext, deployedWorkflowId: string): Promise<{ ok: boolean; version?: number; error?: string }> {
  const result = await withAutomationDb(ctx, async (tx) => {
    const row = await tx.deployedWorkflow.findFirst({ where: { id: deployedWorkflowId, tenantId: ctx.tenantId, orgId: ctx.orgId } });
    if (!row) throw new Error("Workflow not found");
    const updated = await tx.deployedWorkflow.update({
      where: { id: deployedWorkflowId },
      data: { version: row.version + 1, publishedAt: new Date(), lifecycleStatus: "active" },
    });
    await tx.auditLog.create({
      data: { tenantId: ctx.tenantId, orgId: ctx.orgId, service: "automation-os", eventType: "workflow.published", sourceRef: deployedWorkflowId, occurredAt: new Date(), payload: { version: updated.version, actorId: ctx.actorId ?? null } },
    }).catch(() => undefined);
    return updated.version;
  });
  if (!result) return { ok: false, error: "Database not configured or workflow not found" };
  return { ok: true, version: result };
}

/** POST /api/automation/workflows/:id/archive */
export async function archiveDeployedWorkflow(ctx: OrgContext, deployedWorkflowId: string): Promise<{ ok: boolean; error?: string }> {
  const result = await withAutomationDb(ctx, async (tx) => {
    const row = await tx.deployedWorkflow.findFirst({ where: { id: deployedWorkflowId, tenantId: ctx.tenantId, orgId: ctx.orgId } });
    if (!row) throw new Error("Workflow not found");
    await tx.deployedWorkflow.update({ where: { id: deployedWorkflowId }, data: { lifecycleStatus: "archived" } });
    await tx.auditLog.create({
      data: { tenantId: ctx.tenantId, orgId: ctx.orgId, service: "automation-os", eventType: "workflow.archived", sourceRef: deployedWorkflowId, occurredAt: new Date(), payload: { actorId: ctx.actorId ?? null } },
    }).catch(() => undefined);
    return true;
  });
  if (!result) return { ok: false, error: "Database not configured or workflow not found" };
  return { ok: true };
}

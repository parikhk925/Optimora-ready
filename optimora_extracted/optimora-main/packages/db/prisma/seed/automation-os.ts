/**
 * Seed: Automation OS catalog data.
 *
 * Inserts all 13 industry packs, a workflow template for every workflow listed
 * inside every pack, agent definitions, and integration catalog records.
 *
 * Run: pnpm --filter @optimora/db tsx prisma/seed/automation-os.ts
 * Safe to re-run: uses upsert/delete+recreate for catalog joins.
 */
import { PrismaClient } from "@prisma/client";
import {
  AGENT_LIBRARY,
  INDUSTRY_PACKS,
  WORKFLOW_TEMPLATES,
  type DeployStatus,
} from "../../../../apps/web/src/lib/os-data.ts";

const prisma = new PrismaClient();

type IntegrationSeed = {
  key: string;
  name: string;
  category: string;
  description: string;
  authMethod: string;
  status: "not_connected" | "connected" | "needs_auth" | "failed" | "requires_setup" | "demo_mode";
  demoNotes?: string;
};

type WorkflowSeed = {
  key: string;
  name: string;
  icon: string;
  color: string;
  baseType: string;
  industryKey: string;
  trigger: string;
  businessUseCase: string;
  requiredInputs: string[];
  requiredIntegrations: string[];
  approvalCheckpoints: string[];
  roiMetricsTracked: string[];
  sampleOutput: string;
  roiEstimate: string;
  status: DeployStatus;
  setupStatus: DeployStatus;
  steps: Array<{ step: number; label: string; agentKey: string; humanCheckpoint: boolean }>;
};

const INTEGRATIONS: IntegrationSeed[] = [
  { key: "gmail", name: "Gmail", category: "email", description: "Official Gmail API connection for email actions. Not live until OAuth is connected.", authMethod: "oauth", status: "not_connected" },
  { key: "google-calendar", name: "Google Calendar", category: "calendar", description: "Official Google Calendar connection for booking and reminder workflows.", authMethod: "oauth", status: "not_connected" },
  { key: "google-sheets", name: "Google Sheets", category: "spreadsheet", description: "Read and write workspace data in Google Sheets after OAuth setup.", authMethod: "oauth", status: "not_connected" },
  { key: "whatsapp", name: "WhatsApp Business", category: "messaging", description: "Placeholder for the official WhatsApp Business API. No messages are sent until configured.", authMethod: "api_key", status: "requires_setup", demoNotes: "Official API setup required; demo mode only." },
  { key: "linkedin", name: "LinkedIn", category: "social", description: "Official LinkedIn integration placeholder only. No scraping is implemented or claimed.", authMethod: "oauth", status: "requires_setup", demoNotes: "Official integration or manual approval required. No scraping." },
  { key: "shopify", name: "Shopify", category: "commerce", description: "Shopify API/webhook placeholder for orders, carts, returns, and support signals.", authMethod: "oauth", status: "requires_setup" },
  { key: "crm", name: "CRM", category: "crm", description: "Generic CRM placeholder for HubSpot, Zoho, Salesforce, or webhook-backed CRMs.", authMethod: "oauth", status: "requires_setup" },
  { key: "ats", name: "ATS", category: "ats", description: "Applicant tracking system placeholder. CSV and webhook ingestion are supported before native ATS setup.", authMethod: "webhook", status: "requires_setup" },
  { key: "webhook", name: "Webhook", category: "data", description: "HTTP webhook event ingestion for external business systems.", authMethod: "none", status: "not_connected" },
  { key: "csv-upload", name: "CSV Upload", category: "data", description: "Upload CSV files as workflow data sources.", authMethod: "none", status: "demo_mode" },
  { key: "form-submission", name: "Form Submission", category: "data", description: "Capture website form submissions as workflow triggers.", authMethod: "none", status: "demo_mode" },
  { key: "file-upload", name: "File Upload", category: "data", description: "Upload files and documents for parsing, review, and workflow intake.", authMethod: "none", status: "demo_mode" },
  { key: "email", name: "Email Provider", category: "email", description: "Generic email provider placeholder. Gmail is separate and requires OAuth.", authMethod: "oauth", status: "requires_setup" },
  { key: "sms", name: "SMS Gateway", category: "messaging", description: "SMS gateway placeholder. No SMS is sent until a provider is connected.", authMethod: "api_key", status: "requires_setup" },
  { key: "erp", name: "ERP / WMS", category: "operations", description: "ERP, WMS, logistics, or manufacturing system connected through webhook/API setup.", authMethod: "webhook", status: "requires_setup" },
  { key: "accounting", name: "Accounting System", category: "finance", description: "Tally, QuickBooks, or accounting sheet connector placeholder.", authMethod: "oauth", status: "requires_setup" },
];

const ROI_KEYS = [
  "hours_saved",
  "tasks_automated",
  "salary_cost_saved",
  "leads_recovered",
  "appointments_booked",
  "candidates_shortlisted",
  "support_tickets_resolved",
  "cod_orders_confirmed",
  "carts_recovered",
  "invoices_followed_up",
  "shipments_tracked",
  "reports_generated",
  "revenue_opportunities_created",
  "client_reports_generated",
  "reviews_requested",
  "reminders_sent",
];

const BUSINESS_OBJECTS_BY_INDUSTRY: Record<string, string[]> = {
  agency: ["clients", "campaigns", "reports"],
  "real-estate": ["leads", "properties", "visits"],
  hr: ["candidates", "roles", "interviews"],
  education: ["inquiries", "students", "demos", "fee_reminders"],
  ecommerce: ["orders", "carts", "returns", "tickets"],
  clinic: ["appointments", "patients", "reminders"],
  logistics: ["shipments", "inventory", "documents"],
  saas: ["leads", "trials", "accounts", "tickets", "renewals"],
  finance: ["invoices", "payments", "compliance_documents"],
  legal: ["clients", "matters", "projects", "documents", "deadlines"],
  restaurant: ["reservations", "reviews", "complaints", "vendor_tasks"],
  manufacturing: ["production_reports", "vendors", "stock", "dispatches"],
  "local-services": ["bookings", "payments", "reviews", "repeat_customers"],
};

const RISKY_ACTION_PATTERNS = [
  "outreach",
  "follow-up",
  "follow up",
  "invite",
  "interview",
  "client report",
  "invoice",
  "payment",
  "patient",
  "clinic",
  "post",
  "broadcast",
  "legal",
  "finance",
  "compliance",
  "review request",
  "reminder",
  "proposal",
  "whatsapp",
  "email",
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeStatus(status: DeployStatus): DeployStatus {
  return status;
}

function integrationKey(label: string): string {
  const value = label.toLowerCase();
  if (value.includes("gmail")) return "gmail";
  if (value.includes("calendar") || value.includes("calendly")) return "google-calendar";
  if (value.includes("sheet")) return "google-sheets";
  if (value.includes("whatsapp")) return "whatsapp";
  if (value.includes("linkedin")) return "linkedin";
  if (value.includes("shopify") || value.includes("commerce") || value.includes("woocommerce")) return "shopify";
  if (value.includes("crm") || value.includes("hubspot") || value.includes("zoho") || value.includes("salesforce")) return "crm";
  if (value.includes("ats")) return "ats";
  if (value.includes("webhook") || value.includes("api")) return "webhook";
  if (value.includes("csv")) return "csv-upload";
  if (value.includes("form")) return "form-submission";
  if (value.includes("file") || value.includes("document")) return "file-upload";
  if (value.includes("sms")) return "sms";
  if (value.includes("tally") || value.includes("accounting") || value.includes("invoice")) return "accounting";
  if (value.includes("erp") || value.includes("wms") || value.includes("warehouse") || value.includes("logistics")) return "erp";
  if (value.includes("email")) return "email";
  return slugify(label);
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function includesRiskyAction(text: string): boolean {
  const lowered = text.toLowerCase();
  return RISKY_ACTION_PATTERNS.some((pattern) => lowered.includes(pattern));
}

function workflowKey(packKey: string, workflowName: string): string {
  return `${packKey}-${slugify(workflowName)}`;
}

function agentKey(agentName: string): string {
  return slugify(agentName);
}

function genericSteps(workflowName: string, packAgents: string[], needsApproval: boolean) {
  const agents = packAgents.length > 0 ? packAgents : ["Operations Agent", "Report Agent"];
  const intakeAgent = agentKey(agents[0]);
  const actionAgent = agentKey(agents[1] ?? agents[0]);
  const reviewAgent = agentKey(agents[2] ?? agents[0]);
  const reportAgent = agentKey(agents.find((name) => /report|summary|analyst/i.test(name)) ?? agents[agents.length - 1] ?? agents[0]);

  return [
    { step: 1, label: `Capture trigger and validate data for ${workflowName}`, agentKey: intakeAgent, humanCheckpoint: false },
    { step: 2, label: `Analyze context and prepare next action for ${workflowName}`, agentKey: actionAgent, humanCheckpoint: false },
    { step: 3, label: `Draft or execute internal automation step in demo/real mode`, agentKey: actionAgent, humanCheckpoint: false },
    { step: 4, label: `Review risky external action before release`, agentKey: reviewAgent, humanCheckpoint: needsApproval },
    { step: 5, label: `Log outcome, activity, and ROI metrics`, agentKey: reportAgent, humanCheckpoint: false },
  ];
}

function makeWorkflowSeeds(): WorkflowSeed[] {
  const staticByName = new Map(WORKFLOW_TEMPLATES.map((wf) => [wf.name.toLowerCase(), wf]));
  const seeds: WorkflowSeed[] = [];

  for (const pack of INDUSTRY_PACKS) {
    for (const workflowName of pack.workflows) {
      const staticWorkflow = staticByName.get(workflowName.toLowerCase());
      const risky = includesRiskyAction(`${workflowName} ${pack.name}`);
      const requiredIntegrations = unique(pack.integrations.map(integrationKey));
      const key = workflowKey(pack.key, workflowName);
      const steps = staticWorkflow
        ? staticWorkflow.steps.map((step) => ({
            step: step.step,
            label: step.label,
            agentKey: agentKey(step.agent),
            humanCheckpoint: step.humanCheckpoint || risky,
          }))
        : genericSteps(workflowName, pack.agents, risky);

      seeds.push({
        key,
        name: workflowName,
        icon: staticWorkflow?.icon ?? pack.icon,
        color: staticWorkflow?.color ?? pack.color,
        baseType: slugify(workflowName.replace(/ workflow$/i, "")),
        industryKey: pack.key,
        trigger: staticWorkflow?.trigger ?? `${pack.name} ${workflowName} trigger from connected data, form submission, CSV upload, or manual start`,
        businessUseCase: staticWorkflow?.businessUseCase ?? `${workflowName} for ${pack.name}: automate intake, analysis, guarded actions, logging, and ROI tracking without hardcoded HR-only fields.`,
        requiredInputs: [
          "workspace_id",
          "industry_key",
          "business_object_type",
          "trigger_payload",
          "approval_policy",
          "integration_status",
        ],
        requiredIntegrations,
        approvalCheckpoints: risky ? ["External send/release requires approval"] : [],
        roiMetricsTracked: ROI_KEYS,
        sampleOutput: staticWorkflow?.sampleOutput ?? `${pack.name} demo output for ${workflowName}: activity logged, next action prepared, integration gaps flagged, and ROI baseline updated.`,
        roiEstimate: staticWorkflow?.roiEstimate ?? pack.roiEstimate,
        status: normalizeStatus(pack.status),
        setupStatus: normalizeStatus(pack.status),
        steps,
      });
    }
  }

  return seeds;
}

function makeAgentSeeds() {
  const map = new Map<string, {
    key: string;
    name: string;
    icon: string;
    color: string;
    tagline: string;
    description: string;
    inputs: string[];
    outputs: string[];
    approvalRequired: boolean;
    integrationRequired: boolean;
    integrations: string[];
    compatibleWorkflows: string[];
    industries: string[];
    status: DeployStatus;
    actionsPerformed: string[];
    approvalRequirements: string[];
  }>();

  for (const agent of AGENT_LIBRARY) {
    map.set(agent.key, {
      key: agent.key,
      name: agent.name,
      icon: agent.icon,
      color: agent.color,
      tagline: agent.tagline,
      description: agent.what,
      inputs: agent.inputs,
      outputs: agent.outputs,
      approvalRequired: agent.approvalRequired,
      integrationRequired: agent.integrationRequired,
      integrations: agent.integrations.map(integrationKey),
      compatibleWorkflows: agent.workflows,
      industries: agent.industries,
      status: agent.status,
      actionsPerformed: agent.outputs,
      approvalRequirements: agent.approvalRequired ? ["Human approval before risky external action"] : [],
    });
  }

  for (const pack of INDUSTRY_PACKS) {
    for (const name of pack.agents) {
      const key = agentKey(name);
      const existing = map.get(key);
      if (existing) {
        existing.industries = unique([...existing.industries, pack.name]);
        continue;
      }
      const approvalRequired = includesRiskyAction(name);
      map.set(key, {
        key,
        name,
        icon: pack.icon,
        color: pack.color,
        tagline: `${pack.name} automation specialist`,
        description: `${name} handles ${pack.name} workflow tasks using workspace data, approval rules, and connected integrations when available.`,
        inputs: ["Workspace configuration", "Business object records", "Workflow trigger data", "Approval policy"],
        outputs: ["Structured task result", "Activity log", "ROI metric update", "Integration requirement status"],
        approvalRequired,
        integrationRequired: pack.integrations.length > 0,
        integrations: pack.integrations.map(integrationKey),
        compatibleWorkflows: pack.workflows,
        industries: [pack.name],
        status: pack.status,
        actionsPerformed: ["Validate data", "Prepare action", "Create output", "Log result"],
        approvalRequirements: approvalRequired ? ["Approval required before sending or publishing externally"] : [],
      });
    }
  }

  for (const workflow of makeWorkflowSeeds()) {
    for (const step of workflow.steps) {
      if (map.has(step.agentKey)) continue;
      const readableName = step.agentKey.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
      const approvalRequired = step.humanCheckpoint || includesRiskyAction(readableName);
      map.set(step.agentKey, {
        key: step.agentKey,
        name: readableName,
        icon: "Settings2",
        color: "gray",
        tagline: "Reusable workflow execution agent",
        description: `${readableName} is a reusable Automation OS agent created to support detailed workflow templates across industries.`,
        inputs: ["Step input data", "Workspace configuration", "Integration status"],
        outputs: ["Step output data", "Activity log", "Exception notes"],
        approvalRequired,
        integrationRequired: false,
        integrations: [],
        compatibleWorkflows: [workflow.name],
        industries: [workflow.industryKey],
        status: workflow.status,
        actionsPerformed: ["Run workflow step", "Return structured output", "Escalate exceptions"],
        approvalRequirements: approvalRequired ? ["Human approval required for this step"] : [],
      });
    }
  }

  return [...map.values()];
}

async function seedIntegrations() {
  for (const def of INTEGRATIONS) {
    await prisma.integrationDefinition.upsert({
      where: { key: def.key },
      update: {
        name: def.name,
        category: def.category,
        description: def.description,
        authMethod: def.authMethod,
        status: def.status,
      },
      create: {
        key: def.key,
        name: def.name,
        category: def.category,
        description: def.description,
        authMethod: def.authMethod,
        status: def.status,
      },
    });

    await prisma.integration.upsert({
      where: { key: def.key },
      update: {
        name: def.name,
        category: def.category,
        description: def.description,
        authMethod: def.authMethod,
        status: def.status,
        demoNotes: def.demoNotes ?? "",
      },
      create: {
        key: def.key,
        name: def.name,
        category: def.category,
        description: def.description,
        authMethod: def.authMethod,
        status: def.status,
        demoNotes: def.demoNotes ?? "",
      },
    });
  }
}

async function seedAgents(agentSeeds: ReturnType<typeof makeAgentSeeds>) {
  for (const agent of agentSeeds) {
    await prisma.agentDefinition.upsert({
      where: { key: agent.key },
      update: {
        name: agent.name,
        icon: agent.icon,
        color: agent.color,
        tagline: agent.tagline,
        description: agent.description,
        inputs: agent.inputs,
        outputs: agent.outputs,
        approvalRequired: agent.approvalRequired,
        integrationRequired: agent.integrationRequired,
        integrations: agent.integrations,
        compatibleWorkflows: agent.compatibleWorkflows,
        industries: agent.industries,
        actionsPerformed: agent.actionsPerformed,
        approvalRequirements: agent.approvalRequirements,
        status: agent.status,
      },
      create: {
        key: agent.key,
        name: agent.name,
        icon: agent.icon,
        color: agent.color,
        tagline: agent.tagline,
        description: agent.description,
        inputs: agent.inputs,
        outputs: agent.outputs,
        approvalRequired: agent.approvalRequired,
        integrationRequired: agent.integrationRequired,
        integrations: agent.integrations,
        compatibleWorkflows: agent.compatibleWorkflows,
        industries: agent.industries,
        actionsPerformed: agent.actionsPerformed,
        approvalRequirements: agent.approvalRequirements,
        status: agent.status,
      },
    });
  }
}

async function seedWorkflows(workflowSeeds: WorkflowSeed[]) {
  for (const wf of workflowSeeds) {
    const created = await prisma.workflowTemplate.upsert({
      where: { key: wf.key },
      update: {
        name: wf.name,
        icon: wf.icon,
        color: wf.color,
        baseType: wf.baseType,
        industryKey: wf.industryKey,
        trigger: wf.trigger,
        businessUseCase: wf.businessUseCase,
        requiredInputs: wf.requiredInputs,
        requiredIntegrations: wf.requiredIntegrations,
        approvalCheckpoints: wf.approvalCheckpoints,
        roiMetricsTracked: wf.roiMetricsTracked,
        sampleOutput: wf.sampleOutput,
        roiEstimate: wf.roiEstimate,
        setupStatus: wf.setupStatus,
        status: wf.status,
      },
      create: {
        key: wf.key,
        name: wf.name,
        icon: wf.icon,
        color: wf.color,
        baseType: wf.baseType,
        industryKey: wf.industryKey,
        trigger: wf.trigger,
        businessUseCase: wf.businessUseCase,
        requiredInputs: wf.requiredInputs,
        requiredIntegrations: wf.requiredIntegrations,
        approvalCheckpoints: wf.approvalCheckpoints,
        roiMetricsTracked: wf.roiMetricsTracked,
        sampleOutput: wf.sampleOutput,
        roiEstimate: wf.roiEstimate,
        setupStatus: wf.setupStatus,
        status: wf.status,
      },
    });

    await prisma.workflowTemplateStep.deleteMany({ where: { workflowId: created.id } });
    await prisma.workflowTemplateAgent.deleteMany({ where: { workflowId: created.id } });
    await prisma.workflowTemplateIntegration.deleteMany({ where: { workflowId: created.id } });

    for (const step of wf.steps) {
      await prisma.workflowTemplateStep.create({
        data: {
          workflowId: created.id,
          stepNumber: step.step,
          label: step.label,
          agentKey: step.agentKey,
          humanCheckpoint: step.humanCheckpoint,
        },
      });
    }

    const agentKeys = unique(wf.steps.map((step) => step.agentKey));
    for (let index = 0; index < agentKeys.length; index++) {
      await prisma.workflowTemplateAgent.create({
        data: {
          workflowId: created.id,
          agentKey: agentKeys[index],
          role: index === 0 ? "intake" : index === agentKeys.length - 1 ? "reporting" : "execution",
          sortOrder: index,
        },
      });
    }

    for (let index = 0; index < wf.requiredIntegrations.length; index++) {
      await prisma.workflowTemplateIntegration.create({
        data: {
          workflowId: created.id,
          integrationKey: wf.requiredIntegrations[index],
          required: true,
          purpose: `Required for ${wf.name}`,
          sortOrder: index,
        },
      });
    }
  }
}

async function seedPacks(workflowSeeds: WorkflowSeed[]) {
  const workflowByPackAndName = new Map(workflowSeeds.map((wf) => [`${wf.industryKey}::${wf.name}`, wf]));

  for (const pack of INDUSTRY_PACKS) {
    const created = await prisma.industryPack.upsert({
      where: { key: pack.key },
      update: {
        name: pack.name,
        icon: pack.icon,
        color: pack.color,
        headline: pack.headline,
        description: pack.description,
        hoursSaved: pack.hoursSaved,
        status: pack.status,
        targetBuyer: pack.forWho,
        businessOutcome: pack.businessOutcome,
        roiEstimate: pack.roiEstimate,
        sampleOutput: pack.sampleOutput,
        dashboardKpis: ROI_KEYS,
        requiredIntegrations: pack.integrations.map(integrationKey),
        approvalRequirements: pack.workflows.filter(includesRiskyAction),
        setupStatus: pack.status,
      },
      create: {
        key: pack.key,
        name: pack.name,
        icon: pack.icon,
        color: pack.color,
        headline: pack.headline,
        description: pack.description,
        hoursSaved: pack.hoursSaved,
        status: pack.status,
        targetBuyer: pack.forWho,
        businessOutcome: pack.businessOutcome,
        roiEstimate: pack.roiEstimate,
        sampleOutput: pack.sampleOutput,
        dashboardKpis: ROI_KEYS,
        requiredIntegrations: pack.integrations.map(integrationKey),
        approvalRequirements: pack.workflows.filter(includesRiskyAction),
        setupStatus: pack.status,
      },
    });

    await prisma.industryPackWorkflow.deleteMany({ where: { packId: created.id } });
    for (let i = 0; i < pack.workflows.length; i++) {
      const wf = workflowByPackAndName.get(`${pack.key}::${pack.workflows[i]}`);
      if (!wf) throw new Error(`Missing workflow seed for ${pack.key}: ${pack.workflows[i]}`);
      await prisma.industryPackWorkflow.create({
        data: {
          packId: created.id,
          workflowKey: wf.key,
          workflowName: wf.name,
          baseType: wf.baseType,
          config: {
            industryKey: pack.key,
            businessObjects: BUSINESS_OBJECTS_BY_INDUSTRY[pack.key] ?? [],
            setupStatus: wf.setupStatus,
          },
          sortOrder: i,
        },
      });
    }

    await prisma.industryPackAgent.deleteMany({ where: { packId: created.id } });
    for (let i = 0; i < pack.agents.length; i++) {
      await prisma.industryPackAgent.create({
        data: {
          packId: created.id,
          agentKey: agentKey(pack.agents[i]),
          agentName: pack.agents[i],
          role: `${pack.name} agent`,
          sortOrder: i,
        },
      });
    }
  }
}

async function main() {
  const workflowSeeds = makeWorkflowSeeds();
  const agentSeeds = makeAgentSeeds();

  await seedIntegrations();
  await seedAgents(agentSeeds);
  await seedWorkflows(workflowSeeds);
  await seedPacks(workflowSeeds);

  console.log("Automation OS seed complete.");
  console.log(`  ${INTEGRATIONS.length} integrations`);
  console.log(`  ${agentSeeds.length} agent definitions`);
  console.log(`  ${workflowSeeds.length} workflow templates`);
  console.log(`  ${INDUSTRY_PACKS.length} industry packs`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

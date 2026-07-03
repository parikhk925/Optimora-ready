/**
 * Seed: Production Demo Workflows (Section 6).
 *
 * Creates 5 fully execution-ready workflow templates — Lead Qualification
 * Agent, Support Ticket Triage Agent, Daily Business Report Agent, Ecommerce
 * Order Follow-Up Agent, Agency Client Update Agent — with real stepType/
 * config metadata for the execution engine, then deploys each one into the
 * demo workspace so they appear ready-to-run in the dashboard immediately.
 *
 * Idempotent: safe to re-run (upserts templates by key, skips deployment if
 * already deployed for the workspace).
 *
 * Run: pnpm --filter @optimora/db tsx prisma/seed/demo-workflows.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_DATABASE_URL });

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? "00000000-0000-0000-0000-000000000002";

interface StepSeed {
  stepNumber: number;
  label: string;
  agentKey: string;
  humanCheckpoint: boolean;
  stepType: string;
  config: Record<string, unknown>;
}

interface WorkflowSeed {
  key: string;
  name: string;
  icon: string;
  color: string;
  industryKey: string;
  trigger: string;
  businessUseCase: string;
  sampleOutput: string;
  roiEstimate: string;
  steps: StepSeed[];
}

const WORKFLOWS: WorkflowSeed[] = [
  {
    key: "lead-qualification-agent",
    name: "Lead Qualification Agent",
    icon: "UserCheck",
    color: "violet",
    industryKey: "general",
    trigger: "Manual run or webhook: new lead submitted",
    businessUseCase: "Automatically scores inbound leads, routes high-value leads through an approval gate, logs them to CRM, and notifies the sales team.",
    sampleOutput: "Lead scored 92/100 — routed for sales follow-up after approval.",
    roiEstimate: "3-5 hours/week saved on manual lead triage",
    steps: [
      { stepNumber: 1, label: "Receive lead data", agentKey: "lead-intake", humanCheckpoint: false, stepType: "trigger", config: {} },
      { stepNumber: 2, label: "AI qualifies lead", agentKey: "lead-qualifier", humanCheckpoint: false, stepType: "ai_agent", config: {} },
      { stepNumber: 3, label: "Check lead score", agentKey: "lead-score-check", humanCheckpoint: false, stepType: "condition", config: { field: "latestAiOutput.leadScore", operator: ">", value: 80, onFalse: "skip_next", skipCount: 1 } },
      { stepNumber: 4, label: "Approve high-value lead escalation", agentKey: "lead-approval-gate", humanCheckpoint: true, stepType: "approval", config: {} },
      { stepNumber: 5, label: "Write lead to mock CRM", agentKey: "crm-write", humanCheckpoint: false, stepType: "integration_action", config: { integrationKey: "crm", action: "create_lead", payload: { fromLatestAiOutput: true, objectType: "crm_lead" } } },
      { stepNumber: 6, label: "Send email notification", agentKey: "email-notify", humanCheckpoint: false, stepType: "integration_action", config: { integrationKey: "email", action: "send_email", payload: { subject: "New qualified lead", fromLatestAiOutput: true, bodyFromContextPath: "latestAiOutput.reasoning" } } },
      { stepNumber: 7, label: "Log outcome and update ROI", agentKey: "workflow-logger", humanCheckpoint: false, stepType: "log_output", config: { message: "Lead qualification workflow completed" } },
    ],
  },
  {
    key: "support-ticket-triage-agent",
    name: "Support Ticket Triage Agent",
    icon: "LifeBuoy",
    color: "sky",
    industryKey: "general",
    trigger: "Manual run or webhook: new support ticket",
    businessUseCase: "Classifies incoming support tickets by category and priority, escalates urgent tickets for approval, updates the ticket record, and notifies the on-call team.",
    sampleOutput: "Ticket classified as billing/urgent — escalated for on-call review.",
    roiEstimate: "2-4 hours/day saved on manual ticket triage",
    steps: [
      { stepNumber: 1, label: "Receive support ticket", agentKey: "ticket-intake", humanCheckpoint: false, stepType: "trigger", config: {} },
      { stepNumber: 2, label: "AI classifies category and priority", agentKey: "ticket-classifier", humanCheckpoint: false, stepType: "ai_agent", config: {} },
      { stepNumber: 3, label: "Check urgency", agentKey: "ticket-urgency-check", humanCheckpoint: false, stepType: "condition", config: { field: "latestAiOutput.urgent", onFalse: "skip_next", skipCount: 1 } },
      { stepNumber: 4, label: "Approve escalation to on-call engineer", agentKey: "ticket-approval-gate", humanCheckpoint: true, stepType: "approval", config: {} },
      { stepNumber: 5, label: "Write mock support update", agentKey: "support-record-write", humanCheckpoint: false, stepType: "integration_action", config: { integrationKey: "crm", action: "update_lead", payload: { fromLatestAiOutput: true, objectType: "support_ticket" } } },
      { stepNumber: 6, label: "Notify team by mock email", agentKey: "email-notify", humanCheckpoint: false, stepType: "integration_action", config: { integrationKey: "email", action: "send_email", payload: { subject: "Support ticket update", fromLatestAiOutput: true, bodyFromContextPath: "latestAiOutput.reasoning" } } },
      { stepNumber: 7, label: "Log outcome and update ROI", agentKey: "workflow-logger", humanCheckpoint: false, stepType: "log_output", config: { message: "Support ticket triage workflow completed" } },
    ],
  },
  {
    key: "daily-business-report-agent",
    name: "Daily Business Report Agent",
    icon: "BarChart2",
    color: "emerald",
    industryKey: "general",
    trigger: "Manual run (scheduled daily in production)",
    businessUseCase: "Gathers activity data, has AI summarize business performance, and emails a daily report to stakeholders.",
    sampleOutput: "Daily report generated: revenue +6% WoW, 4 workflows completed automatically.",
    roiEstimate: "30-45 min/day saved on manual reporting",
    steps: [
      { stepNumber: 1, label: "Gather mock activity data", agentKey: "report-intake", humanCheckpoint: false, stepType: "trigger", config: {} },
      { stepNumber: 2, label: "AI summarizes business performance", agentKey: "business-report-summarizer", humanCheckpoint: false, stepType: "ai_agent", config: {} },
      { stepNumber: 3, label: "Send/mock email report", agentKey: "email-notify", humanCheckpoint: false, stepType: "integration_action", config: { integrationKey: "email", action: "send_email", payload: { subject: "Daily business report", fromLatestAiOutput: true, bodyFromContextPath: "latestAiOutput.summary" } } },
      { stepNumber: 4, label: "Log report and update ROI", agentKey: "workflow-logger", humanCheckpoint: false, stepType: "log_output", config: { message: "Daily business report workflow completed" } },
    ],
  },
  {
    key: "ecommerce-order-followup-agent",
    name: "Ecommerce Order Follow-Up Agent",
    icon: "ShoppingCart",
    color: "amber",
    industryKey: "ecommerce",
    trigger: "Manual run or webhook: new order",
    businessUseCase: "Checks new orders for risk, escalates high-risk orders for manual approval, sends a mock follow-up email, and updates the mock order record.",
    sampleOutput: "Order flagged medium risk — proceeded with standard fulfillment follow-up.",
    roiEstimate: "1-2 hours/day saved on manual order review",
    steps: [
      { stepNumber: 1, label: "Receive order", agentKey: "order-intake", humanCheckpoint: false, stepType: "trigger", config: {} },
      { stepNumber: 2, label: "AI checks order risk/status", agentKey: "order-risk-checker", humanCheckpoint: false, stepType: "ai_agent", config: {} },
      { stepNumber: 3, label: "Check high-risk order", agentKey: "order-risk-check", humanCheckpoint: false, stepType: "condition", config: { field: "latestAiOutput.riskScore", operator: ">", value: 70, onFalse: "skip_next", skipCount: 1 } },
      { stepNumber: 4, label: "Approve manual review for high-risk order", agentKey: "order-approval-gate", humanCheckpoint: true, stepType: "approval", config: {} },
      { stepNumber: 5, label: "Send/mock follow-up email", agentKey: "email-notify", humanCheckpoint: false, stepType: "integration_action", config: { integrationKey: "email", action: "send_email", payload: { subject: "Order follow-up", fromLatestAiOutput: true, bodyFromContextPath: "latestAiOutput.reasoning" } } },
      { stepNumber: 6, label: "Update mock CRM/order record", agentKey: "order-record-write", humanCheckpoint: false, stepType: "integration_action", config: { integrationKey: "crm", action: "update_lead", payload: { fromLatestAiOutput: true, objectType: "order" } } },
      { stepNumber: 7, label: "Save activity and ROI", agentKey: "workflow-logger", humanCheckpoint: false, stepType: "log_output", config: { message: "Ecommerce order follow-up workflow completed" } },
    ],
  },
  {
    key: "agency-client-update-agent",
    name: "Agency Client Update Agent",
    icon: "Megaphone",
    color: "rose",
    industryKey: "agency",
    trigger: "Manual run",
    businessUseCase: "Collects campaign/task updates, has AI draft a client-friendly summary, requires approval before sending, then emails the client update.",
    sampleOutput: "Client update drafted and approved — sent summarizing campaign pacing and completed tasks.",
    roiEstimate: "1-2 hours/week saved per client account",
    steps: [
      { stepNumber: 1, label: "Collect mock campaign/task updates", agentKey: "campaign-intake", humanCheckpoint: false, stepType: "trigger", config: {} },
      { stepNumber: 2, label: "AI creates client-friendly update", agentKey: "client-update-writer", humanCheckpoint: false, stepType: "ai_agent", config: {} },
      { stepNumber: 3, label: "Approve before sending", agentKey: "client-update-approval-gate", humanCheckpoint: true, stepType: "approval", config: {} },
      { stepNumber: 4, label: "Send/mock email to client", agentKey: "email-notify", humanCheckpoint: false, stepType: "integration_action", config: { integrationKey: "email", action: "send_email", payload: { subject: "Your weekly update", fromLatestAiOutput: true, bodyFromContextPath: "latestAiOutput.updateText" } } },
      { stepNumber: 5, label: "Save logs and ROI", agentKey: "workflow-logger", humanCheckpoint: false, stepType: "log_output", config: { message: "Agency client update workflow completed" } },
    ],
  },
];

async function ensureWorkspace(): Promise<string> {
  const existing = await prisma.workspace.findFirst({ where: { tenantId: TENANT_ID, orgId: ORG_ID } });
  if (existing) return existing.id;
  const workspace = await prisma.workspace.create({
    data: {
      tenantId: TENANT_ID,
      orgId: ORG_ID,
      name: process.env.NEXT_PUBLIC_WORKSPACE_NAME ?? "Optimora Workspace",
      slug: process.env.NEXT_PUBLIC_WORKSPACE_SLUG ?? `workspace-${ORG_ID.slice(0, 8)}`,
      type: "business",
      status: "active",
    },
  });
  return workspace.id;
}

async function main() {
  const workspaceId = await ensureWorkspace();
  let templatesCreated = 0;
  let deployed = 0;

  for (const wf of WORKFLOWS) {
    const template = await prisma.workflowTemplate.upsert({
      where: { key: wf.key },
      update: {},
      create: {
        key: wf.key,
        name: wf.name,
        icon: wf.icon,
        color: wf.color,
        baseType: "production_demo",
        industryKey: wf.industryKey,
        trigger: wf.trigger,
        businessUseCase: wf.businessUseCase,
        requiredInputs: [],
        requiredIntegrations: ["crm", "email"],
        approvalCheckpoints: wf.steps.filter((s) => s.humanCheckpoint).map((s) => s.label),
        roiMetricsTracked: ["tasks_automated", "hours_saved"],
        sampleOutput: wf.sampleOutput,
        roiEstimate: wf.roiEstimate,
        setupStatus: "demo",
        status: "demo",
      },
    });
    templatesCreated += 1;

    const existingStepCount = await prisma.workflowTemplateStep.count({ where: { workflowId: template.id } });
    if (existingStepCount === 0) {
      for (const step of wf.steps) {
        await prisma.workflowTemplateStep.create({
          data: {
            workflowId: template.id,
            stepNumber: step.stepNumber,
            label: step.label,
            agentKey: step.agentKey,
            humanCheckpoint: step.humanCheckpoint,
            stepType: step.stepType,
            config: step.config,
            maxRetries: step.stepType === "ai_agent" || step.stepType === "integration_action" ? 1 : 0,
          },
        });
      }
    }

    const alreadyDeployed = await prisma.deployedWorkflow.findFirst({
      where: { tenantId: TENANT_ID, orgId: ORG_ID, workspaceId, templateId: template.id },
    });
    if (alreadyDeployed) continue;

    const deployedWorkflow = await prisma.deployedWorkflow.create({
      data: {
        tenantId: TENANT_ID,
        orgId: ORG_ID,
        workspaceId,
        templateId: template.id,
        name: wf.name,
        status: "demo",
        mode: "demo",
        version: 1,
        lifecycleStatus: "active",
        publishedAt: new Date(),
        settings: { demoMode: true, templateKey: wf.key, seededProductionDemo: true },
      },
    });

    for (const step of wf.steps) {
      await prisma.deployedWorkflowStep.create({
        data: {
          tenantId: TENANT_ID,
          orgId: ORG_ID,
          workspaceId,
          deployedWorkflowId: deployedWorkflow.id,
          stepNumber: step.stepNumber,
          name: step.label,
          agentKey: step.agentKey,
          approvalRequired: step.humanCheckpoint,
          status: "pending",
          stepType: step.stepType,
          config: step.config,
          maxRetries: step.stepType === "ai_agent" || step.stepType === "integration_action" ? 1 : 0,
        },
      });
    }
    deployed += 1;
  }

  console.log(`Production demo workflows seeded. Templates upserted: ${templatesCreated}. Newly deployed: ${deployed}. Workspace: ${workspaceId}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

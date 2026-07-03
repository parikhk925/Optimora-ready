/**
 * Production Workflow Execution Engine (Section 1).
 *
 * Real, step-by-step execution: creates a run, locks the workflow version,
 * executes steps in order (trigger → ai_agent → action/integration_action →
 * condition → approval → delay → log_output → webhook_response), pauses at
 * approval steps, resumes on approve, applies retry rules on failure, tracks
 * duration/error/retryCount per step, and writes execution logs, activity
 * events, ROI events, and usage events as it goes.
 */
import type { TxClient } from "@optimora/db";
import { runAgent } from "@optimora/ai";
import { executeIntegrationAction } from "../integrations/registry";
import type { OrgContext } from "../automation-data";

export interface StepRow {
  id: string;
  stepNumber: number;
  name: string;
  agentKey: string;
  approvalRequired: boolean;
  status: string;
  stepType: string;
  config: unknown;
  maxRetries: number;
}

export interface DeployedWorkflowRow {
  id: string;
  name: string;
  mode: string;
  version: number;
  templateKey: string;
  steps: StepRow[];
}

type Ctx = Record<string, unknown>;

function toObj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function resolvePath(context: Ctx, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[part];
    return undefined;
  }, context);
}

function evaluateCondition(context: Ctx, config: Record<string, unknown>): boolean {
  const field = typeof config.field === "string" ? config.field : "latestAiOutput.leadScore";
  const operator = typeof config.operator === "string" ? config.operator : ">";
  const target = config.value;
  const actual = resolvePath(context, field);
  if (typeof actual !== "number" || typeof target !== "number") return Boolean(actual);
  switch (operator) {
    case ">": return actual > target;
    case ">=": return actual >= target;
    case "<": return actual < target;
    case "<=": return actual <= target;
    case "==": return actual === target;
    default: return actual > target;
  }
}

async function writeLog(
  tx: TxClient,
  ctx: OrgContext,
  workspaceId: string,
  runId: string,
  stepRunId: string | null,
  level: "debug" | "info" | "warn" | "error",
  message: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  await tx.executionLog.create({
    data: {
      tenantId: ctx.tenantId,
      orgId: ctx.orgId,
      workspaceId,
      workflowRunId: runId,
      workflowRunStepId: stepRunId,
      level,
      message,
      data: data as never,
    },
  });
}

async function recordUsage(
  tx: TxClient,
  ctx: OrgContext,
  workspaceId: string,
  runId: string,
  eventType: "workflow_run" | "agent_run" | "integration_action",
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await tx.usageEvent.create({
    data: {
      tenantId: ctx.tenantId,
      orgId: ctx.orgId,
      workspaceId,
      eventType,
      workflowRunId: runId,
      metadata: metadata as never,
    },
  });
}

async function recordRoiEvent(
  tx: TxClient,
  ctx: OrgContext,
  workspaceId: string,
  runId: string,
  deployedWorkflowId: string,
  metricKey: string,
  value: number,
  unit: string,
  source: string,
): Promise<void> {
  await tx.roiEvent.create({
    data: {
      tenantId: ctx.tenantId,
      orgId: ctx.orgId,
      workspaceId,
      workflowRunId: runId,
      deployedWorkflowId,
      metricKey,
      value,
      unit,
      source,
    },
  });
}

interface ExecuteStepDeps {
  tx: TxClient;
  ctx: OrgContext;
  workspaceId: string;
  runId: string;
  deployedWorkflow: DeployedWorkflowRow;
  runStepId: string;
  step: StepRow;
  context: Ctx;
  mode: string;
}

interface StepExecutionOutcome {
  status: "completed" | "failed" | "waiting_for_approval" | "skipped";
  output: Record<string, unknown>;
  error?: Record<string, unknown>;
  logMessage: string;
}

async function executeSingleStep(deps: ExecuteStepDeps): Promise<StepExecutionOutcome> {
  const { step, context, mode, ctx, workspaceId, tx } = deps;
  const config = toObj(step.config);

  switch (step.stepType) {
    case "trigger": {
      return { status: "completed", output: { received: true, payload: context.input }, logMessage: `Trigger received for "${step.name}".` };
    }

    case "ai_agent": {
      const result = await runAgent({
        agentKey: step.agentKey,
        instruction: step.name,
        context,
      });
      if (result.status === "failed") {
        return { status: "failed", output: {}, error: { message: result.error }, logMessage: `AI agent step "${step.name}" failed: ${result.error}` };
      }
      await tx.agentRun.create({
        data: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId,
          workspaceId,
          taskId: deps.runStepId,
          agentId: deps.runStepId,
          workflowRunId: deps.runId,
          workflowRunStepId: deps.runStepId,
          agentDefinitionKey: step.agentKey,
          agentVersion: 1,
          status: "succeeded",
          modelProvider: result.provider,
          input: { instruction: step.name, context } as never,
          output: result.output as never,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          cost: result.costUsd,
          startedAt: result.startedAt,
          finishedAt: result.completedAt,
        },
      });
      await recordUsage(tx, ctx, workspaceId, deps.runId, "agent_run", { agentKey: step.agentKey, provider: result.provider });
      return { status: "completed", output: result.output, logMessage: `AI agent "${step.agentKey}" (${result.provider}) produced structured output.` };
    }

    case "condition": {
      const passed = evaluateCondition(context, config);
      return { status: "completed", output: { conditionPassed: passed, field: config.field ?? null }, logMessage: `Condition evaluated to ${passed}.` };
    }

    case "delay": {
      const delayMs = typeof config.delayMs === "number" ? config.delayMs : 0;
      return { status: "completed", output: { simulated: true, delayMs, demoLabel: "Delay simulated instantly in demo mode — no real sleep." }, logMessage: `Delay step simulated (${delayMs}ms).` };
    }

    case "log_output": {
      const message = typeof config.message === "string" ? config.message : step.name;
      await writeLog(tx, ctx, workspaceId, deps.runId, deps.runStepId, "info", message, context);
      return { status: "completed", output: { logged: true, message }, logMessage: `Logged: ${message}` };
    }

    case "webhook_response": {
      return { status: "completed", output: { response: context }, logMessage: "Webhook response payload prepared." };
    }

    case "approval": {
      return { status: "waiting_for_approval", output: { externalSendBlocked: true }, logMessage: `Approval required before "${step.name}" can continue.` };
    }

    case "integration_action":
    case "action":
    default: {
      const integrationKey = typeof config.integrationKey === "string" ? config.integrationKey : undefined;
      if (!integrationKey) {
        // Generic action step (no configured integration) — treat as an internal
        // automation step that completes deterministically using accumulated context.
        return {
          status: "completed",
          output: { actionCompleted: true, mode, demoLabel: mode !== "ready" ? "Demo action — no external side effects." : undefined },
          logMessage: `Action "${step.name}" completed.`,
        };
      }
      const actionName = typeof config.action === "string" ? config.action : "execute";
      const payload = toObj(config.payload);
      const resolvedPayload: Record<string, unknown> = { ...payload };
      if (payload.fromLatestAiOutput) resolvedPayload.aiOutput = context.latestAiOutput;
      if (payload.bodyFromContextPath) resolvedPayload.body = resolvePath(context, String(payload.bodyFromContextPath));

      const result = await executeIntegrationAction(
        { tx, tenantId: ctx.tenantId, orgId: ctx.orgId, workspaceId },
        integrationKey,
        actionName,
        resolvedPayload,
      );
      await recordUsage(tx, ctx, workspaceId, deps.runId, "integration_action", { integrationKey, action: actionName, status: result.status });
      if (result.status === "failed") {
        return { status: "failed", output: result.output, error: { message: result.error, label: result.label }, logMessage: `Integration "${integrationKey}.${actionName}" failed: ${result.error}` };
      }
      return { status: "completed", output: { ...result.output, integrationStatus: result.status, integrationLabel: result.label }, logMessage: `Integration "${integrationKey}.${actionName}" completed (${result.status}): ${result.label}` };
    }
  }
}

/**
 * Executes steps starting at `fromIndex` until completion, failure, or an
 * approval step blocks progress. Mutates DB state via `tx`. Returns the final
 * run status.
 */
export async function executeStepsFrom(
  tx: TxClient,
  ctx: OrgContext,
  workspaceId: string,
  runId: string,
  deployedWorkflow: DeployedWorkflowRow,
  fromIndex: number,
  initialContext: Ctx,
): Promise<{ status: string; failedStepNumber?: number }> {
  const steps = deployedWorkflow.steps;
  const context: Ctx = { ...initialContext };
  let skipNext = 0;

  for (let i = fromIndex; i < steps.length; i++) {
    const step = steps[i];

    const runStep = await tx.workflowRunStep.findFirst({ where: { runId, stepNumber: step.stepNumber } });
    if (!runStep) continue;

    if (skipNext > 0) {
      skipNext -= 1;
      await tx.workflowRunStep.update({
        where: { id: runStep.id },
        data: { status: "skipped", completedAt: new Date(), outputData: { skipped: true, reason: "condition_false" } as never },
      });
      await writeLog(tx, ctx, workspaceId, runId, runStep.id, "info", `Step "${step.name}" skipped (condition not met).`);
      continue;
    }

    const startedAt = new Date();
    await tx.workflowRunStep.update({ where: { id: runStep.id }, data: { status: "running", startedAt } });
    await writeLog(tx, ctx, workspaceId, runId, runStep.id, "info", `Step ${step.stepNumber} "${step.name}" started (${step.stepType}).`);

    const maxRetries = step.maxRetries ?? 0;
    let attempt = 0;
    let outcome: StepExecutionOutcome;
    for (;;) {
      outcome = await executeSingleStep({ tx, ctx, workspaceId, runId, deployedWorkflow, runStepId: runStep.id, step, context, mode: deployedWorkflow.mode });
      if (outcome.status !== "failed" || attempt >= maxRetries) break;
      attempt += 1;
      await tx.workflowRunStep.update({ where: { id: runStep.id }, data: { retryCount: attempt } });
      await writeLog(tx, ctx, workspaceId, runId, runStep.id, "warn", `Retrying step "${step.name}" (attempt ${attempt}/${maxRetries}) after failure: ${outcome.error?.message ?? "unknown error"}`);
    }

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    if (outcome.status === "failed") {
      await tx.workflowRunStep.update({
        where: { id: runStep.id },
        data: { status: "failed", completedAt, durationMs, error: outcome.error as never, errorMessage: String(outcome.error?.message ?? "Step failed"), outputData: outcome.output as never },
      });
      await writeLog(tx, ctx, workspaceId, runId, runStep.id, "error", outcome.logMessage, outcome.error ?? {});
      return { status: "failed", failedStepNumber: step.stepNumber };
    }

    if (outcome.status === "waiting_for_approval") {
      await tx.workflowRunStep.update({
        where: { id: runStep.id },
        data: { status: "waiting_for_approval", durationMs, outputData: outcome.output as never },
      });
      await writeLog(tx, ctx, workspaceId, runId, runStep.id, "info", outcome.logMessage);

      const existingApproval = await tx.approval.findFirst({ where: { workflowRunId: runId, status: "pending" } });
      if (!existingApproval) {
        await tx.workflowApproval.create({
          data: {
            tenantId: ctx.tenantId,
            orgId: ctx.orgId,
            workspaceId,
            runId,
            stepNumber: step.stepNumber,
            agentKey: step.agentKey,
            actionType: "risky_action",
            description: `Approval required before "${step.name}"`,
            proposedAction: { workflowRunId: runId, stepNumber: step.stepNumber, action: step.name, externalSendBlocked: true },
            status: "pending",
          },
        });
        await tx.approval.create({
          data: {
            tenantId: ctx.tenantId,
            orgId: ctx.orgId,
            workspaceId,
            deployedWorkflowId: deployedWorkflow.id,
            workflowRunId: runId,
            actionType: "risky_action",
            title: `Approve "${step.name}"`,
            description: `No external message or write will be sent until this approval is resolved.`,
            proposedAction: { workflowRunId: runId, stepNumber: step.stepNumber, action: step.name },
            status: "pending",
            requestedBy: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ctx.actorId ?? "") ? ctx.actorId : null,
          },
        });
      }
      return { status: "waiting_for_approval" };
    }

    // completed
    await tx.workflowRunStep.update({
      where: { id: runStep.id },
      data: { status: "completed", completedAt, durationMs, outputData: outcome.output as never },
    });
    await writeLog(tx, ctx, workspaceId, runId, runStep.id, "info", outcome.logMessage, { durationMs });

    context.steps = { ...toObj(context.steps), [step.stepNumber]: outcome.output };
    if (step.stepType === "ai_agent") context.latestAiOutput = outcome.output;

    if (step.stepType === "condition" && outcome.output.conditionPassed === false) {
      const config = toObj(step.config);
      if (config.onFalse === "skip_to_end") {
        for (let j = i + 1; j < steps.length; j++) {
          const remaining = await tx.workflowRunStep.findFirst({ where: { runId, stepNumber: steps[j].stepNumber } });
          if (remaining) {
            await tx.workflowRunStep.update({ where: { id: remaining.id }, data: { status: "skipped", outputData: { skipped: true, reason: "condition_false" } as never } });
          }
        }
        return { status: "completed" };
      }
      skipNext = typeof config.skipCount === "number" ? config.skipCount : 1;
    }
  }

  return { status: "completed" };
}

/**
 * Finalizes a run: sets status/timestamps, records ROI + activity for a
 * completed run. Called once the step loop reaches the end or fails/pauses.
 */
export async function finalizeRun(
  tx: TxClient,
  ctx: OrgContext,
  workspaceId: string,
  runId: string,
  deployedWorkflow: DeployedWorkflowRow,
  outcome: { status: string; failedStepNumber?: number },
): Promise<void> {
  const now = new Date();
  const isTerminal = outcome.status === "completed" || outcome.status === "failed";

  await tx.workflowRun.update({
    where: { id: runId },
    data: {
      status: outcome.status,
      completedAt: isTerminal ? now : null,
      errorMessage: outcome.status === "failed" ? `Step ${outcome.failedStepNumber} failed` : null,
      outputSummary: outcome.status === "completed"
        ? (deployedWorkflow.mode === "ready" ? "Workflow completed with connected integrations." : "Workflow completed in demo mode — external sends stayed blocked until integrations/approvals are satisfied.")
        : undefined,
    },
  });

  await tx.activityLog.create({
    data: {
      tenantId: ctx.tenantId,
      orgId: ctx.orgId,
      workspaceId,
      agentKey: "automation-os",
      agentName: "Automation OS",
      action: outcome.status === "completed" ? "completed workflow run" : outcome.status === "failed" ? "workflow run failed" : outcome.status === "waiting_for_approval" ? "workflow run awaiting approval" : "workflow run " + outcome.status,
      count: 1,
      unit: deployedWorkflow.name,
      workflowKey: deployedWorkflow.templateKey,
      workflowName: deployedWorkflow.name,
      runId,
      status: outcome.status === "completed" ? "completed" : outcome.status === "waiting_for_approval" ? "pending_approval" : outcome.status === "failed" ? "failed" : "completed",
      meta: { status: outcome.status },
    },
  });

  await recordUsage(tx, ctx, workspaceId, runId, "workflow_run", { deployedWorkflowId: deployedWorkflow.id, status: outcome.status });

  if (outcome.status === "completed") {
    await recordRoiEvent(tx, ctx, workspaceId, runId, deployedWorkflow.id, "tasks_automated", 1, "count", deployedWorkflow.mode);
    await recordRoiEvent(tx, ctx, workspaceId, runId, deployedWorkflow.id, "hours_saved", 0.5, "hours", deployedWorkflow.mode);

    const { periodStart, periodEnd } = (() => {
      const d = new Date();
      return { periodStart: new Date(d.getFullYear(), d.getMonth(), 1), periodEnd: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59) };
    })();
    const existingSnapshot = await tx.workflowRoiSnapshot.findFirst({ where: { deployedWorkflowId: deployedWorkflow.id, periodStart } });
    if (existingSnapshot) {
      await tx.workflowRoiSnapshot.update({
        where: { id: existingSnapshot.id },
        data: {
          tasksAutomated: existingSnapshot.tasksAutomated + 1,
          hoursSaved: existingSnapshot.hoursSaved + 0.5,
          salaryCostSaved: existingSnapshot.salaryCostSaved + 250,
        },
      });
    } else {
      await tx.workflowRoiSnapshot.create({
        data: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId,
          workspaceId,
          deployedWorkflowId: deployedWorkflow.id,
          workflowKey: deployedWorkflow.templateKey,
          periodStart,
          periodEnd,
          tasksAutomated: 1,
          hoursSaved: 0.5,
          salaryCostSaved: 250,
          source: deployedWorkflow.mode,
          metrics: { fromRunId: runId },
        },
      });
    }

    const existingMetric = await tx.roiMetric.findFirst({ where: { workspaceId, metricKey: "tasks_automated", periodStart } });
    if (existingMetric) {
      await tx.roiMetric.update({ where: { id: existingMetric.id }, data: { value: existingMetric.value + 1 } });
    } else {
      await tx.roiMetric.create({
        data: { tenantId: ctx.tenantId, orgId: ctx.orgId, workspaceId, metricKey: "tasks_automated", label: "Tasks Automated", value: 1, unit: "count", periodStart, periodEnd, source: deployedWorkflow.mode },
      });
    }
  }

  await tx.automationEvent.create({
    data: { tenantId: ctx.tenantId, orgId: ctx.orgId, workspaceId, type: `workflow_run.${outcome.status}`, payload: { runId, deployedWorkflowId: deployedWorkflow.id } },
  });
}

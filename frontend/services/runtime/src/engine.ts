/**
 * Agent Runtime Core engine (T-9.1). A deterministic, tenant-aware, fail-closed
 * execution shell: it runs one agent (ABI) against one scheduled task through a
 * model provider (deterministic stub by default — NO paid calls) and an
 * authorized tool runner, validates I/O against the ABI schemas, records an
 * immutable run, emits runtime events, and advances the task through the EXISTING
 * Task Engine (in_progress -> in_review on success, -> failed on failure). It
 * does not redesign the Task Engine, ABI, or Cognition Plane; reflection/learning
 * hand-off is left to the caller via the returned output.
 */
import type { TxClient } from "@optimora/db";
import { authorize } from "@optimora/auth-core";
import { safeParseAgentDefinition, validateInput, validateOutput } from "@optimora/agent-contract";
import { getTask, transitionTask } from "@optimora/execution";
import { EchoModelProvider } from "./echo-model.js";
import { DeterministicToolRunner } from "./tool-runner.js";
import {
  createRun,
  emitRuntimeEvent,
  markRunFailed,
  markRunning,
  markSucceeded,
} from "./store.js";
import {
  InvalidRunStateError,
  InvalidRuntimeContextError,
  InvalidRuntimeInputError,
  InvalidRuntimeOutputError,
  MissingRuntimeContextError,
  UnauthorizedToolError,
  type AgentRunView,
  type ExecuteRunInput,
  type ModelProvider,
  type ModelRequest,
  type RunResult,
  type RuntimeContext,
  type ToolResult,
  type ToolRunner,
} from "./types.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateContext(ctx: RuntimeContext): void {
  if (!UUID_RE.test(ctx.tenantId ?? "") || !UUID_RE.test(ctx.orgId ?? "")) {
    throw new InvalidRuntimeContextError("Missing or invalid tenant/org context.");
  }
}

/** Returns true if execution is NOT authorized by policy (deny). No principal => allowed. */
function policyDenies(ctx: RuntimeContext): boolean {
  if (!ctx.principal) return false;
  const permission = ctx.requiredPermission ?? "runtime:execute";
  const decision = authorize({
    principal: ctx.principal,
    action: permission,
    resource: { type: "agent_run", id: ctx.orgId, tenantId: ctx.tenantId, orgId: ctx.orgId },
    context: { requiredPermission: permission },
  });
  return !decision.allowed;
}

export interface ExecuteRunOptions {
  model?: ModelProvider;
  toolRunner?: ToolRunner;
}

/**
 * Execute one run of an agent against a scheduled task. Fails closed on bad
 * context/task/agent/input, an unauthorized tool, or output that violates the
 * ABI output schema — recording the failure on the run + task before rethrowing.
 */
export async function executeRun(
  tx: TxClient,
  ctx: RuntimeContext,
  input: ExecuteRunInput,
  options: ExecuteRunOptions = {},
): Promise<RunResult> {
  validateContext(ctx);
  if (policyDenies(ctx)) {
    throw new InvalidRuntimeContextError("Unauthorized runtime execution.");
  }

  // Fail closed on missing/invalid agent definition.
  const parsed = safeParseAgentDefinition(input.definition);
  if (!parsed.success) {
    throw new MissingRuntimeContextError("Missing or invalid agent definition.");
  }
  const definition = parsed.data;

  // Fail closed on missing task id / task (tenant-scoped read => cross-tenant too).
  if (!UUID_RE.test(input.taskId ?? "")) {
    throw new MissingRuntimeContextError("Missing or invalid task id.");
  }
  const task = await getTask(tx, input.taskId);
  if (!task) {
    throw new MissingRuntimeContextError("Task not found in tenant context.");
  }
  // The runtime executes a SCHEDULED task (assigned by the Scheduler/Decision).
  if (task.status !== "scheduled") {
    throw new InvalidRunStateError(`Task must be 'scheduled' to run (is '${task.status}').`);
  }

  // Fail closed on input that violates the ABI input schema.
  const inCheck = validateInput(definition, input.input);
  if (!inCheck.valid) {
    throw new InvalidRuntimeInputError(`Input violates agent input schema: ${inCheck.errors.join("; ")}`);
  }

  const model = options.model ?? new EchoModelProvider();
  const toolRunner = options.toolRunner ?? new DeterministicToolRunner();
  const allowedTools = new Set(definition.tools.map((t) => t.name));

  // Immutable run record, born pending -> running. Task scheduled -> in_progress.
  const run = await createRun(tx, {
    tenantId: ctx.tenantId,
    orgId: ctx.orgId,
    taskId: task.id,
    agentId: definition.identity.agentId,
    agentVersion: definition.version,
    agentHash: definition.contentHash || null,
    modelProvider: model.name,
    input: input.input,
  });
  await emitRuntimeEvent(tx, {
    tenantId: ctx.tenantId,
    runId: run.id,
    type: "runtime.started",
    payload: { taskId: task.id, agentId: definition.identity.agentId, model: model.name },
  });
  await markRunning(tx, run.id);
  await transitionTask(tx, task.id, "in_progress", { runId: run.id });

  try {
    // Assemble the (deterministic) model request — no memory/context-fabric yet.
    const request: ModelRequest = {
      role: definition.role,
      jobDescription: definition.jobDescription,
      taskTitle: task.title,
      input: input.input,
      outputSchema: definition.outputSchema,
    };
    const completion = await model.complete(request);

    // Execute any tool calls, authorizing each against the ABI tool bindings.
    const toolResults: ToolResult[] = [];
    for (const call of completion.toolCalls ?? []) {
      if (!allowedTools.has(call.name)) {
        throw new UnauthorizedToolError(`Tool "${call.name}" is not declared on the agent ABI.`);
      }
      toolResults.push(await toolRunner.run(call));
    }

    // Fail closed on output that violates the ABI output schema.
    const outCheck = validateOutput(definition, completion.output);
    if (!outCheck.valid) {
      throw new InvalidRuntimeOutputError(
        `Output violates agent output schema: ${outCheck.errors.join("; ")}`,
      );
    }

    const succeeded = await markSucceeded(tx, run.id, {
      output: completion.output,
      toolCalls: toolResults,
      tokensIn: completion.tokensIn,
      tokensOut: completion.tokensOut,
    });
    await emitRuntimeEvent(tx, {
      tenantId: ctx.tenantId,
      runId: run.id,
      type: "runtime.succeeded",
      payload: { taskId: task.id, tokensIn: completion.tokensIn, tokensOut: completion.tokensOut },
    });
    // Hand the task to review (Reflection picks it up; caller decides).
    const reviewed = await transitionTask(tx, task.id, "in_review", { runId: run.id });

    return { run: succeeded, output: completion.output, taskStatus: reviewed.status };
  } catch (err) {
    // A failure AFTER the run started (model/tool/output) is recorded on the run
    // and the task is failed closed — then RETURNED (not thrown), so the audit
    // trail persists within the caller's transaction rather than rolling back.
    const reason = err instanceof Error ? err.message : String(err);
    const failed = await failRun(tx, ctx, run, task.id, reason);
    return { run: failed, output: {}, taskStatus: "failed" };
  }
}

/** Record a run+task failure and emit the event (best-effort within the tx). */
async function failRun(
  tx: TxClient,
  ctx: RuntimeContext,
  run: AgentRunView,
  taskId: string,
  reason: string,
): Promise<AgentRunView> {
  const failed = await markRunFailed(tx, run.id, reason);
  await emitRuntimeEvent(tx, {
    tenantId: ctx.tenantId,
    runId: run.id,
    type: "runtime.failed",
    payload: { taskId, reason },
  });
  await transitionTask(tx, taskId, "failed", { runId: run.id, reason });
  return failed;
}

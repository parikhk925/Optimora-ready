/**
 * Tool executor (E9 Tools). Deterministic, tenant-aware, fail-closed: looks up
 * the tool, checks availability + capability + policy, validates input/output,
 * executes the stub fn, persists the invocation record (no secrets stored), and
 * emits a tool.executed audit event. Implements the runtime ToolRunner interface
 * as PersistedToolRunner so the Agent Runtime can swap in this layer later.
 *
 * Fail-closed cases: missing/invalid tenant/agent, tool not found, tool
 * unavailable, required-cap not granted, policy denial, invalid input, invalid
 * output, malformed request.
 */
import type { TxClient } from "@optimora/db";
import { authorize } from "@optimora/auth-core";
import type { ToolCall, ToolResult, ToolRunner } from "@optimora/runtime";
import type { ToolRegistry } from "./registry.js";
import { validate } from "./schema-validator.js";
import { createToolInvocation, emitToolEvent } from "./store.js";
import {
  InvalidToolContextError,
  InvalidToolInputError,
  InvalidToolOutputError,
  MalformedToolRequestError,
  ToolNotFoundError,
  ToolUnavailableError,
  UnauthorizedToolAccessError,
  type ToolContext,
  type ToolInvocationView,
} from "./types.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateContext(ctx: ToolContext): void {
  if (!UUID_RE.test(ctx.tenantId ?? "") || !UUID_RE.test(ctx.orgId ?? "")) {
    throw new InvalidToolContextError("Missing or invalid tenant/org context.");
  }
  if (!UUID_RE.test(ctx.agentId ?? "")) {
    throw new InvalidToolContextError("Missing or invalid agentId.");
  }
}

function policyDenies(ctx: ToolContext, toolName: string): boolean {
  if (!ctx.principal) return false;
  const action = ctx.requiredPermission ?? "tool:execute";
  const decision = authorize({
    principal: ctx.principal,
    action,
    resource: { type: "tool_invocation", id: toolName, tenantId: ctx.tenantId, orgId: ctx.orgId },
    context: { requiredPermission: action },
  });
  return !decision.allowed;
}

export interface ExecuteToolResult {
  invocation: ToolInvocationView;
  toolResult: ToolResult;
}

export async function executeTool(
  tx: TxClient,
  ctx: ToolContext,
  call: ToolCall,
  registry: ToolRegistry,
  /** Agent's declared capability tags — checked against tool.requiredCaps. */
  agentCaps: string[] = [],
): Promise<ExecuteToolResult> {
  validateContext(ctx);

  if (!call?.name || typeof call.name !== "string" || call.name.trim() === "") {
    throw new MalformedToolRequestError("ToolCall.name must be a non-empty string.");
  }
  if (typeof call.args !== "object" || call.args === null || Array.isArray(call.args)) {
    throw new MalformedToolRequestError("ToolCall.args must be a plain object.");
  }

  const entry = registry.get(call.name);
  if (!entry) throw new ToolNotFoundError(`Tool "${call.name}" is not registered.`);
  if (!entry.definition.available) throw new ToolUnavailableError(`Tool "${call.name}" is unavailable.`);

  // Capability check: all required caps must be present in the agent's declared caps.
  for (const cap of entry.definition.requiredCaps) {
    if (!agentCaps.includes(cap)) {
      throw new UnauthorizedToolAccessError(`Missing capability "${cap}" required by tool "${call.name}".`);
    }
  }

  if (policyDenies(ctx, call.name)) {
    throw new UnauthorizedToolAccessError(`Tool "${call.name}" use denied by policy.`);
  }

  const inputCheck = validate(call.args, entry.definition.inputSchema);
  if (!inputCheck.valid) {
    throw new InvalidToolInputError(`Tool "${call.name}" input invalid: ${inputCheck.errors.join("; ")}`);
  }

  const output = await entry.fn(call.args);

  const outputCheck = validate(output, entry.definition.outputSchema);
  if (!outputCheck.valid) {
    const reason = `Tool "${call.name}" output invalid: ${outputCheck.errors.join("; ")}`;
    const inv = await createToolInvocation(tx, {
      tenantId: ctx.tenantId, orgId: ctx.orgId, agentId: ctx.agentId,
      taskId: ctx.taskId ?? null, toolName: call.name,
      status: "failed", failureReason: reason,
    });
    await emitToolEvent(tx, { tenantId: ctx.tenantId, invocationId: inv.id, type: "tool.failed", payload: { toolName: call.name, reason } });
    throw new InvalidToolOutputError(reason);
  }

  const invocation = await createToolInvocation(tx, {
    tenantId: ctx.tenantId, orgId: ctx.orgId, agentId: ctx.agentId,
    taskId: ctx.taskId ?? null, toolName: call.name,
    status: "succeeded",
  });
  await emitToolEvent(tx, {
    tenantId: ctx.tenantId, invocationId: invocation.id,
    type: "tool.executed",
    payload: { toolName: call.name, agentId: ctx.agentId },
  });

  return { invocation, toolResult: { name: call.name, ok: true, output } };
}

/**
 * PersistedToolRunner: a ToolRunner (runtime seam) backed by the tool executor.
 * The Agent Runtime can swap in this runner in place of DeterministicToolRunner —
 * it records every invocation and emits audit events without any other change.
 */
export class PersistedToolRunner implements ToolRunner {
  readonly name = "persisted";

  constructor(
    private readonly tx: TxClient,
    private readonly ctx: ToolContext,
    private readonly registry: ToolRegistry,
    private readonly agentCaps: string[] = [],
  ) {}

  async run(call: ToolCall): Promise<ToolResult> {
    const res = await executeTool(this.tx, this.ctx, call, this.registry, this.agentCaps);
    return res.toolResult;
  }
}

/**
 * Agent Runtime Core types (T-9.1). A deterministic execution shell that runs an
 * agent (ABI) against a task. Model routing and tool execution sit behind
 * provider seams — the defaults are deterministic stubs and make NO paid AI
 * calls. Context Fabric / Memory are intentionally out of scope here (separate
 * EMS tasks); the model request carries only the ABI + task input.
 */
import type { AgentDefinition } from "@optimora/agent-contract";
import type { Principal } from "@optimora/auth-core";

/** Run lifecycle. */
export const RUN_STATES = ["pending", "running", "succeeded", "failed"] as const;
export type RunStatus = (typeof RUN_STATES)[number];

export interface RuntimeContext {
  tenantId: string;
  orgId: string;
  /** When provided, execution is authorized via the Policy Engine (fail closed). */
  principal?: Principal;
  requiredPermission?: string;
}

/** A tool invocation requested by the model. */
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

/** Result of a tool invocation. */
export interface ToolResult {
  name: string;
  ok: boolean;
  output: Record<string, unknown>;
}

/**
 * Tool execution provider. The runtime authorizes each call against the agent's
 * declared `tools` bindings BEFORE invoking the runner; the runner itself
 * executes the (stubbed) tool. Unknown/unauthorized tools fail closed upstream.
 */
export interface ToolRunner {
  readonly name: string;
  run(call: ToolCall): ToolResult | Promise<ToolResult>;
}

/** Assembled model request (deterministic; no memory/context-fabric yet). */
export interface ModelRequest {
  role: string;
  jobDescription: string;
  taskTitle: string;
  input: Record<string, unknown>;
  /** The agent's declared output schema (the model must produce a valid object). */
  outputSchema: Record<string, unknown>;
}

/** Model completion result. */
export interface ModelResult {
  output: Record<string, unknown>;
  /** Tool calls the model wants executed before finalizing (default none). */
  toolCalls?: ToolCall[];
  tokensIn: number;
  tokensOut: number;
}

/**
 * Model provider abstraction. The default is a deterministic echo stub. A real,
 * paid provider plugs in here later (and only then does the claude-api guidance
 * apply). Implementations must be pure w.r.t. their request — no side effects.
 */
export interface ModelProvider {
  readonly name: string;
  complete(request: ModelRequest): ModelResult | Promise<ModelResult>;
}

/** Input to a single run. `input` is validated against the ABI input schema. */
export interface ExecuteRunInput {
  taskId: string;
  definition: AgentDefinition;
  input: Record<string, unknown>;
}

export interface AgentRunView {
  id: string;
  tenantId: string;
  orgId: string;
  taskId: string;
  agentId: string;
  agentVersion: number;
  agentHash: string | null;
  status: RunStatus;
  modelProvider: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  toolCalls: ToolResult[];
  tokensIn: number;
  tokensOut: number;
  cost: number;
  failureReason: string | null;
}

export interface RunResult {
  run: AgentRunView;
  output: Record<string, unknown>;
  /** Task status after the run (in_review on success, failed on failure). */
  taskStatus: string;
}

export class RuntimeError extends Error {}
export class InvalidRuntimeContextError extends RuntimeError {}
export class MissingRuntimeContextError extends RuntimeError {}
export class InvalidRunStateError extends RuntimeError {}
export class InvalidRuntimeInputError extends RuntimeError {}
export class InvalidRuntimeOutputError extends RuntimeError {}
export class UnauthorizedToolError extends RuntimeError {}
export class ModelProviderNotImplementedError extends RuntimeError {}

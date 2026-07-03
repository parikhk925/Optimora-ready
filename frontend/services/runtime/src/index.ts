/**
 * @optimora/runtime — the Agent Runtime Core (T-9.1).
 *
 * A deterministic, tenant-aware, fail-closed execution shell that runs an agent
 * (ABI) against a scheduled task. Model routing and tool execution sit behind
 * provider seams whose defaults are deterministic stubs — NO paid AI calls.
 * Context Fabric, Memory, real model routing, and integrations are out of scope
 * here (separate EMS tasks).
 */
export const PACKAGE_NAME = "@optimora/runtime" as const;

export { executeRun, type ExecuteRunOptions } from "./engine.js";
export { EchoModelProvider } from "./echo-model.js";
export { StubModelProvider } from "./model-stub.js";
export { DeterministicToolRunner, TOOL_REGISTRY } from "./tool-runner.js";
export {
  createRun,
  getRun,
  emitRuntimeEvent,
  listRuntimeEvents,
  listRunsForTask,
} from "./store.js";
export {
  RUN_STATES,
  type RunStatus,
  type RuntimeContext,
  type ToolCall,
  type ToolResult,
  type ToolRunner,
  type ModelRequest,
  type ModelResult,
  type ModelProvider,
  type ExecuteRunInput,
  type AgentRunView,
  type RunResult,
  RuntimeError,
  InvalidRuntimeContextError,
  MissingRuntimeContextError,
  InvalidRunStateError,
  InvalidRuntimeInputError,
  InvalidRuntimeOutputError,
  UnauthorizedToolError,
  ModelProviderNotImplementedError,
} from "./types.js";

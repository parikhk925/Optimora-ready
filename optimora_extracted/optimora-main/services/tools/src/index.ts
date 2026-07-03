/**
 * @optimora/tools — Tool / Integration Execution Layer (E9 Tools).
 *
 * Deterministic, tenant-aware, fail-closed tool execution plane. Registered tools
 * are stub-only for now (echo / noop / summarize) — no real third-party
 * integrations, no paid calls. PersistedToolRunner implements the runtime
 * ToolRunner seam so the Agent Runtime can swap in this layer without changes.
 * Does not redesign Runtime, Context Fabric, Memory, Model Router, Task Engine,
 * Agent ABI, Cognition, Policy, or Org Graph.
 */
export const PACKAGE_NAME = "@optimora/tools" as const;

export { executeTool, PersistedToolRunner, type ExecuteToolResult } from "./executor.js";
export { ToolRegistry, buildDefaultRegistry, type ToolFn, type RegistryEntry } from "./registry.js";
export { validate, type ValidationResult } from "./schema-validator.js";
export { getToolInvocation, listToolEvents, emitToolEvent } from "./store.js";
export {
  type ToolCall,
  type ToolResult,
  type ToolRunner,
  type ToolContext,
  type JsonSchema,
  type ToolDefinition,
  type ToolInvocationView,
  ToolError,
  InvalidToolContextError,
  ToolNotFoundError,
  ToolUnavailableError,
  InvalidToolInputError,
  InvalidToolOutputError,
  UnauthorizedToolAccessError,
  MalformedToolRequestError,
} from "./types.js";

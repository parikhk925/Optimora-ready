/**
 * Tool / Integration Execution Layer types (E9 Tools). A deterministic, tenant-
 * aware, fail-closed tool-execution plane. Registered tools are stub-only for
 * now — no real third-party integrations, no paid calls. The ToolRunner seam from
 * the runtime is re-exported so this package is a drop-in for executeRun.
 * Fails closed on missing tenant/agent, unavailable tool, invalid input/output,
 * capability/policy denial, malformed request, or cross-tenant access.
 */
import type { Principal } from "@optimora/auth-core";
import type { ToolCall, ToolResult, ToolRunner } from "@optimora/runtime";

// Re-export runtime seam types so callers only need @optimora/tools.
export type { ToolCall, ToolResult, ToolRunner };

export interface ToolContext {
  tenantId: string;
  orgId: string;
  agentId: string;
  taskId?: string;
  principal?: Principal;
  requiredPermission?: string;
}

/** JSON-Schema subset for tool input/output validation (deterministic, no deps). */
export type JsonSchema = Record<string, unknown>;

export interface ToolDefinition {
  /** Unique tool name within the registry. */
  name: string;
  description: string;
  /** Required capability tags the calling agent must declare. */
  requiredCaps: string[];
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  available: boolean;
}

export interface ToolInvocationView {
  id: string;
  tenantId: string;
  orgId: string;
  agentId: string;
  taskId: string | null;
  toolName: string;
  status: "succeeded" | "failed";
  failureReason: string | null;
  createdAt: Date;
}

export class ToolError extends Error {}
export class InvalidToolContextError extends ToolError {}
export class ToolNotFoundError extends ToolError {}
export class ToolUnavailableError extends ToolError {}
export class InvalidToolInputError extends ToolError {}
export class InvalidToolOutputError extends ToolError {}
export class UnauthorizedToolAccessError extends ToolError {}
export class MalformedToolRequestError extends ToolError {}

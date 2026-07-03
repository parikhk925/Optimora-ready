/**
 * Integration / MCP Connector Foundation types (E9 Integrations). A deterministic,
 * tenant-aware, fail-closed connector plane. Connectors are stub-only — no real
 * third-party API calls or OAuth production flows. Secrets are referenced by opaque
 * key only; no plaintext secrets stored. Connector capabilities are exposed as
 * ToolDefinition+ToolFn pairs registered into the @optimora/tools ToolRegistry so
 * agents invoke them through the existing tool-execution seam. Fails closed on
 * missing tenant, invalid connector, unavailable capability, unauthorized usage,
 * malformed request, missing secret reference, or cross-tenant access.
 */
import type { Principal } from "@optimora/auth-core";

export interface ConnectorContext {
  tenantId: string;
  orgId: string;
  principal?: Principal;
  requiredPermission?: string;
}

export const CONNECTOR_STATUSES = ["connected", "disconnected", "error"] as const;
export type ConnectorStatus = (typeof CONNECTOR_STATUSES)[number];

/** A registered connector type (e.g. "slack", "github", "google-calendar"). */
export interface ConnectorDefinition {
  /** Unique connector type key. */
  key: string;
  displayName: string;
  description: string;
  /** Capability tags this connector provides (matched against agent requiredCaps). */
  caps: string[];
  available: boolean;
}

/** Capability exposed by a connector — maps 1-to-1 to a ToolDefinition. */
export interface ConnectorCapability {
  /** Tool name to register: `<connectorKey>.<capName>`. */
  toolName: string;
  description: string;
  requiredCaps: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

/**
 * A live connector implementation. The stub default returns deterministic
 * fixture data with no network calls.
 */
export interface Connector {
  readonly definition: ConnectorDefinition;
  readonly capabilities: ConnectorCapability[];
  /** Invokes a named capability. Stub: deterministic, no I/O. */
  invoke(capName: string, args: Record<string, unknown>, secretRef: string | null): Record<string, unknown> | Promise<Record<string, unknown>>;
}

/** A tenant-scoped connection record (persisted). Stores secret reference, not the secret. */
export interface ConnectionView {
  id: string;
  tenantId: string;
  orgId: string;
  connectorKey: string;
  status: ConnectorStatus;
  /** Opaque reference to the secret in a future vault (never the raw secret). */
  secretRef: string | null;
  meta: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/** Persisted audit record for a connector invocation (no raw args/responses stored). */
export interface ConnectorInvocationView {
  id: string;
  tenantId: string;
  orgId: string;
  connectionId: string;
  capabilityName: string;
  status: "succeeded" | "failed";
  failureReason: string | null;
  createdAt: Date;
}

export class IntegrationError extends Error {}
export class InvalidConnectorContextError extends IntegrationError {}
export class ConnectorNotFoundError extends IntegrationError {}
export class ConnectorUnavailableError extends IntegrationError {}
export class CapabilityNotFoundError extends IntegrationError {}
export class UnauthorizedConnectorError extends IntegrationError {}
export class MalformedConnectorRequestError extends IntegrationError {}
export class MissingSecretRefError extends IntegrationError {}

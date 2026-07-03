/**
 * @optimora/integrations — Integration / MCP Connector Foundation (E9 Integrations).
 *
 * Deterministic, tenant-aware, fail-closed connector plane. Stub connectors only
 * (Slack, GitHub) — no real API calls, no OAuth production flow, no raw secrets
 * stored. Connector capabilities are exposed through the @optimora/tools ToolRegistry
 * seam via registerConnectorTools. Does not redesign Runtime, Tools, Model Router,
 * Context, Memory, Task Engine, Agent ABI, Cognition, Policy, or Org Graph.
 */
export const PACKAGE_NAME = "@optimora/integrations" as const;

export { ConnectorRegistry } from "./connector-registry.js";
export { invokeCapability, type InvokeCapabilityResult } from "./executor.js";
export { registerConnectorTools } from "./tool-seam.js";
export { SLACK_STUB, GITHUB_STUB, DEFAULT_STUB_CONNECTORS } from "./stubs.js";
export {
  createConnection,
  getConnection,
  listConnections,
  getConnectorInvocation,
  emitConnectorEvent,
  listConnectorEvents,
} from "./store.js";
export {
  CONNECTOR_STATUSES,
  type ConnectorStatus,
  type ConnectorContext,
  type ConnectorDefinition,
  type ConnectorCapability,
  type Connector,
  type ConnectionView,
  type ConnectorInvocationView,
  IntegrationError,
  InvalidConnectorContextError,
  ConnectorNotFoundError,
  ConnectorUnavailableError,
  CapabilityNotFoundError,
  UnauthorizedConnectorError,
  MalformedConnectorRequestError,
  MissingSecretRefError,
} from "./types.js";

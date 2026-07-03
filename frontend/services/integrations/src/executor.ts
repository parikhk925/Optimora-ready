/**
 * Connector executor (E9 Integrations). Deterministic, tenant-aware, fail-closed:
 * looks up the connector + capability, enforces availability + policy, validates
 * that a secretRef is present when required (never the raw secret), invokes the
 * stub, records the invocation (no raw args/output), and emits an audit event.
 *
 * Fail-closed: missing/invalid tenant/org, connector not found/unavailable,
 * capability not found, policy denial, missing secretRef, malformed request.
 */
import type { TxClient } from "@optimora/db";
import { authorize } from "@optimora/auth-core";
import type { ConnectorRegistry } from "./connector-registry.js";
import { createConnectorInvocation, emitConnectorEvent } from "./store.js";
import {
  CapabilityNotFoundError,
  ConnectorNotFoundError,
  ConnectorUnavailableError,
  InvalidConnectorContextError,
  MalformedConnectorRequestError,
  MissingSecretRefError,
  UnauthorizedConnectorError,
  type ConnectorContext,
  type ConnectorInvocationView,
} from "./types.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateContext(ctx: ConnectorContext): void {
  if (!UUID_RE.test(ctx.tenantId ?? "") || !UUID_RE.test(ctx.orgId ?? "")) {
    throw new InvalidConnectorContextError("Missing or invalid tenant/org context.");
  }
}

function policyDenies(ctx: ConnectorContext, resourceId: string): boolean {
  if (!ctx.principal) return false;
  const action = ctx.requiredPermission ?? "connector:invoke";
  const decision = authorize({
    principal: ctx.principal,
    action,
    resource: { type: "connector_invocation", id: resourceId, tenantId: ctx.tenantId, orgId: ctx.orgId },
    context: { requiredPermission: action },
  });
  return !decision.allowed;
}

export interface InvokeCapabilityResult {
  invocation: ConnectorInvocationView;
  output: Record<string, unknown>;
}

export async function invokeCapability(
  tx: TxClient,
  ctx: ConnectorContext,
  connectionId: string,
  connectorKey: string,
  capabilityName: string,
  args: Record<string, unknown>,
  secretRef: string | null,
  registry: ConnectorRegistry,
  /** Connectors that require a secretRef; if key is in this set and secretRef is null → fail closed. */
  secretRequired: boolean = false,
): Promise<InvokeCapabilityResult> {
  validateContext(ctx);

  if (!connectorKey || typeof connectorKey !== "string") {
    throw new MalformedConnectorRequestError("connectorKey must be a non-empty string.");
  }
  if (!capabilityName || typeof capabilityName !== "string") {
    throw new MalformedConnectorRequestError("capabilityName must be a non-empty string.");
  }
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw new MalformedConnectorRequestError("args must be a plain object.");
  }

  const connector = registry.get(connectorKey);
  if (!connector) throw new ConnectorNotFoundError(`Connector "${connectorKey}" is not registered.`);
  if (!connector.definition.available) {
    throw new ConnectorUnavailableError(`Connector "${connectorKey}" is unavailable.`);
  }

  const cap = connector.capabilities.find((c) => c.toolName === `${connectorKey}.${capabilityName}`);
  if (!cap) throw new CapabilityNotFoundError(`Capability "${capabilityName}" not found on "${connectorKey}".`);

  if (policyDenies(ctx, connectorKey)) {
    throw new UnauthorizedConnectorError(`Connector "${connectorKey}" usage denied by policy.`);
  }

  if (secretRequired && !secretRef) {
    throw new MissingSecretRefError(`Connector "${connectorKey}" requires a secret reference.`);
  }

  const output = await connector.invoke(capabilityName, args, secretRef);

  const invocation = await createConnectorInvocation(tx, {
    tenantId: ctx.tenantId,
    orgId: ctx.orgId,
    connectionId,
    capabilityName: `${connectorKey}.${capabilityName}`,
    status: "succeeded",
  });
  await emitConnectorEvent(tx, {
    tenantId: ctx.tenantId,
    invocationId: invocation.id,
    type: "connector.invoked",
    payload: { connectorKey, capabilityName, connectionId },
  });

  return { invocation, output };
}

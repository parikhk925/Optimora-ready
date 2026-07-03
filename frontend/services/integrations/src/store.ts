/**
 * Integration persistence (E9 Integrations). Tenant-scoped via TxClient (RLS).
 * Connection records store a secretRef (opaque key), never the raw secret.
 * Invocation records store no raw args or responses.
 */
import type { TxClient } from "@optimora/db";
import type { ConnectionView, ConnectorInvocationView, ConnectorStatus } from "./types.js";

// ---- Connection store ----

interface ConnectionRow {
  id: string;
  tenantId: string;
  orgId: string;
  connectorKey: string;
  status: string;
  secretRef: string | null;
  meta: unknown;
  createdAt: Date;
  updatedAt: Date;
}

function toConnectionView(r: ConnectionRow): ConnectionView {
  return {
    id: r.id,
    tenantId: r.tenantId,
    orgId: r.orgId,
    connectorKey: r.connectorKey,
    status: r.status as ConnectorStatus,
    secretRef: r.secretRef,
    meta: (r.meta ?? {}) as Record<string, unknown>,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function createConnection(
  tx: TxClient,
  input: {
    tenantId: string;
    orgId: string;
    connectorKey: string;
    status: ConnectorStatus;
    secretRef?: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<ConnectionView> {
  const row = (await tx.connectorConnection.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      connectorKey: input.connectorKey,
      status: input.status,
      secretRef: input.secretRef ?? null,
      meta: (input.meta ?? {}) as object,
    },
  })) as ConnectionRow;
  return toConnectionView(row);
}

export async function getConnection(tx: TxClient, id: string): Promise<ConnectionView | null> {
  const row = (await tx.connectorConnection.findUnique({ where: { id } })) as ConnectionRow | null;
  return row ? toConnectionView(row) : null;
}

export async function listConnections(
  tx: TxClient,
  tenantId: string,
  orgId?: string,
): Promise<ConnectionView[]> {
  const where: Record<string, unknown> = { tenantId };
  if (orgId) where["orgId"] = orgId;
  const rows = (await tx.connectorConnection.findMany({
    where,
    orderBy: { createdAt: "asc" },
  })) as ConnectionRow[];
  return rows.map(toConnectionView);
}

// ---- Invocation store ----

interface InvocationRow {
  id: string;
  tenantId: string;
  orgId: string;
  connectionId: string;
  capabilityName: string;
  status: string;
  failureReason: string | null;
  createdAt: Date;
}

function toInvocationView(r: InvocationRow): ConnectorInvocationView {
  return {
    id: r.id,
    tenantId: r.tenantId,
    orgId: r.orgId,
    connectionId: r.connectionId,
    capabilityName: r.capabilityName,
    status: r.status as ConnectorInvocationView["status"],
    failureReason: r.failureReason,
    createdAt: r.createdAt,
  };
}

export async function createConnectorInvocation(
  tx: TxClient,
  input: {
    tenantId: string;
    orgId: string;
    connectionId: string;
    capabilityName: string;
    status: "succeeded" | "failed";
    failureReason?: string | null;
  },
): Promise<ConnectorInvocationView> {
  const row = (await tx.connectorInvocation.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      connectionId: input.connectionId,
      capabilityName: input.capabilityName,
      status: input.status,
      failureReason: input.failureReason ?? null,
    },
  })) as InvocationRow;
  return toInvocationView(row);
}

export async function getConnectorInvocation(
  tx: TxClient,
  id: string,
): Promise<ConnectorInvocationView | null> {
  const row = (await tx.connectorInvocation.findUnique({ where: { id } })) as InvocationRow | null;
  return row ? toInvocationView(row) : null;
}

export async function emitConnectorEvent(
  tx: TxClient,
  input: { tenantId: string; invocationId: string; type: string; payload?: Record<string, unknown> },
): Promise<void> {
  await tx.connectorEvent.create({
    data: {
      tenantId: input.tenantId,
      invocationId: input.invocationId,
      type: input.type,
      payload: (input.payload ?? {}) as object,
    },
  });
}

export async function listConnectorEvents(tx: TxClient, invocationId: string) {
  return tx.connectorEvent.findMany({ where: { invocationId }, orderBy: { createdAt: "asc" } });
}

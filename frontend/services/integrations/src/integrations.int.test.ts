/**
 * Integration / Connector integration tests (E9 Integrations). Proves: create
 * connection, list capabilities, invoke stub capability, tool-seam wiring,
 * policy/capability denial, cross-tenant denial, malformed-request fail-closed,
 * missing-secretRef denial, no-secrets guarantee, audit event emission.
 * Requires dev Postgres + migrations.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import { buildDefaultRegistry, executeTool } from "@optimora/tools";
import {
  CapabilityNotFoundError,
  ConnectorNotFoundError,
  ConnectorRegistry,
  createConnection,
  DEFAULT_STUB_CONNECTORS,
  getConnection,
  getConnectorInvocation,
  InvalidConnectorContextError,
  invokeCapability,
  listConnections,
  listConnectorEvents,
  MalformedConnectorRequestError,
  MissingSecretRefError,
  registerConnectorTools,
  type ConnectorContext,
} from "./index.js";

const sys = getSystemPrisma();
const prisma = getPrisma();
const tenantA = randomUUID();
const orgA = randomUUID();
const tenantB = randomUUID();
const orgB = randomUUID();

const inA = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, fn);
const inB = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantB, orgId: orgB }, fn);

const ctx: ConnectorContext = { tenantId: tenantA, orgId: orgA };

function makeRegistry(): ConnectorRegistry {
  const r = new ConnectorRegistry();
  for (const c of DEFAULT_STUB_CONNECTORS) r.register(c);
  return r;
}

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `int-${tenantA}`, name: "Int A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `int-${tenantB}`, name: "Int B" } });
  await sys.organization.create({ data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" } });
  await sys.organization.create({ data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" } });
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Integration / Connector Foundation", () => {
  it("creates a stub connector connection (secretRef, no raw secret)", async () => {
    const conn = await inA((tx) =>
      createConnection(tx, { tenantId: tenantA, orgId: orgA, connectorKey: "slack", status: "connected", secretRef: "vault:ref:abc123" }),
    );
    expect(conn.connectorKey).toBe("slack");
    expect(conn.secretRef).toBe("vault:ref:abc123");
    const stored = await inA((tx) => getConnection(tx, conn.id));
    expect(stored?.secretRef).toBe("vault:ref:abc123");
    // Verify raw secret is never persisted as a field on the view.
    const inv = conn as unknown as Record<string, unknown>;
    expect(inv["secret"]).toBeUndefined();
    expect(inv["rawSecret"]).toBeUndefined();
  });

  it("lists connections scoped to tenant/org", async () => {
    await inA((tx) =>
      createConnection(tx, { tenantId: tenantA, orgId: orgA, connectorKey: "github", status: "connected" }),
    );
    const conns = await inA((tx) => listConnections(tx, tenantA, orgA));
    expect(conns.some((c) => c.connectorKey === "github")).toBe(true);
  });

  it("lists available connector capabilities from registry", () => {
    const r = makeRegistry();
    const defs = r.availableDefinitions();
    expect(defs.length).toBeGreaterThanOrEqual(2);
    const caps = r.all().flatMap((c) => c.capabilities.map((cap) => cap.toolName));
    expect(caps).toContain("slack.send_message");
    expect(caps).toContain("github.list_issues");
  });

  it("invokes a stub capability, stores invocation record, emits event", async () => {
    const registry = makeRegistry();
    const conn = await inA((tx) =>
      createConnection(tx, { tenantId: tenantA, orgId: orgA, connectorKey: "slack", status: "connected" }),
    );
    const res = await inA((tx) =>
      invokeCapability(tx, ctx, conn.id, "slack", "send_message", { channel: "#dev", text: "hi" }, null, registry),
    );
    expect(res.output["ok"]).toBe(true);
    expect(res.invocation.status).toBe("succeeded");
    const stored = await inA((tx) => getConnectorInvocation(tx, res.invocation.id));
    expect(stored?.capabilityName).toBe("slack.send_message");
    const events = await inA((tx) => listConnectorEvents(tx, res.invocation.id));
    expect(events.map((e: { type: string }) => e.type)).toContain("connector.invoked");
  });

  it("connector tool exposed through @optimora/tools seam (executeTool)", async () => {
    const connectorReg = makeRegistry();
    const toolReg = buildDefaultRegistry();
    registerConnectorTools(connectorReg, toolReg);

    const agentId = randomUUID();
    const toolCtx = { tenantId: tenantA, orgId: orgA, agentId };
    const res = await inA((tx) =>
      executeTool(tx, toolCtx, { name: "slack.list_channels", args: {} }, toolReg, ["messaging:read"]),
    );
    expect(res.toolResult.ok).toBe(true);
    expect((res.toolResult.output as { channels: string[] }).channels).toBeDefined();
  });

  it("fails closed: connector not found", async () => {
    const registry = makeRegistry();
    const connId = randomUUID();
    await expect(
      inA((tx) => invokeCapability(tx, ctx, connId, "nonexistent", "op", {}, null, registry)),
    ).rejects.toBeInstanceOf(ConnectorNotFoundError);
  });

  it("fails closed: capability not found on connector", async () => {
    const registry = makeRegistry();
    const connId = randomUUID();
    await expect(
      inA((tx) => invokeCapability(tx, ctx, connId, "slack", "ghost_op", {}, null, registry)),
    ).rejects.toBeInstanceOf(CapabilityNotFoundError);
  });

  it("fails closed: missing secretRef when required", async () => {
    const registry = makeRegistry();
    const connId = randomUUID();
    await expect(
      inA((tx) => invokeCapability(tx, ctx, connId, "slack", "send_message", { channel: "#x", text: "y" }, null, registry, true)),
    ).rejects.toBeInstanceOf(MissingSecretRefError);
  });

  it("fails closed: malformed request (empty connectorKey, non-object args)", async () => {
    const registry = makeRegistry();
    const connId = randomUUID();
    await expect(
      inA((tx) => invokeCapability(tx, ctx, connId, "", "send_message", {}, null, registry)),
    ).rejects.toBeInstanceOf(MalformedConnectorRequestError);
    await expect(
      inA((tx) => invokeCapability(tx, ctx, connId, "slack", "send_message", "bad" as unknown as Record<string, unknown>, null, registry)),
    ).rejects.toBeInstanceOf(MalformedConnectorRequestError);
  });

  it("fails closed: invalid tenant/org context", async () => {
    const registry = makeRegistry();
    const connId = randomUUID();
    await expect(
      inA((tx) => invokeCapability(tx, { tenantId: "bad", orgId: orgA }, connId, "slack", "send_message", {}, null, registry)),
    ).rejects.toBeInstanceOf(InvalidConnectorContextError);
  });

  it("denies cross-tenant access (RLS: tenant B invocation invisible under tenant A)", async () => {
    const registry = makeRegistry();
    const connB = await inB((tx) =>
      createConnection(tx, { tenantId: tenantB, orgId: orgB, connectorKey: "slack", status: "connected" }),
    );
    const res = await inB((tx) =>
      invokeCapability(tx, { tenantId: tenantB, orgId: orgB }, connB.id, "slack", "list_channels", {}, null, registry),
    );
    expect(res.invocation.tenantId).toBe(tenantB);
    const notVisible = await inA((tx) => getConnectorInvocation(tx, res.invocation.id));
    expect(notVisible).toBeNull();
  });
});

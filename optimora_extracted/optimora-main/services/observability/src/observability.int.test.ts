/**
 * Observability integration tests (E9 Observability). Requires dev Postgres.
 * Proves: ingest events, query by tenant/org/service/type/agent/task/run/sourceRef/
 * correlationId/time range, cross-tenant denial (RLS), malformed fail-closed,
 * normalized shape, audit access enforcement, no external vendor dependency.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import {
  getAuditEvent,
  ingestEvent,
  InvalidObservabilityContextError,
  MalformedEventQueryError,
  queryEvents,
  type ObservabilityContext,
} from "./index.js";

const sys = getSystemPrisma();
const prisma = getPrisma();

const tenantA = randomUUID();
const orgA = randomUUID();
const tenantB = randomUUID();
const orgB = randomUUID();
const actorA = "service:runtime";

const ctxA: ObservabilityContext = { tenantId: tenantA, orgId: orgA, actorId: actorA };
const ctxB: ObservabilityContext = { tenantId: tenantB, orgId: orgB, actorId: "service:runtime" };

const inA = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, fn);

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `obs-${tenantA}`, name: "Obs A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `obs-${tenantB}`, name: "Obs B" } });
  await sys.organization.create({ data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" } });
  await sys.organization.create({ data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" } });
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Observability / Audit Analytics", () => {
  it("ingests an audit event and returns a normalized AuditEventView", async () => {
    const ev = await ingestEvent(prisma, ctxA, {
      service: "runtime",
      eventType: "agent.run.completed",
      severity: "info",
      payload: { runId: randomUUID() },
    });
    expect(ev.service).toBe("runtime");
    expect(ev.eventType).toBe("agent.run.completed");
    expect(ev.severity).toBe("info");
    expect(ev.tenantId).toBe(tenantA);
    expect(typeof ev.payload).toBe("object");

    // Verify stored via getAuditEvent (tenant-scoped read).
    const stored = await inA((tx) => getAuditEvent(tx, ev.id));
    expect(stored?.id).toBe(ev.id);
  });

  it("queries events by tenant/org and returns results", async () => {
    await ingestEvent(prisma, ctxA, { service: "tools", eventType: "tool.executed", severity: "info" });
    const results = await inA((tx) => queryEvents(tx, ctxA, { orgId: orgA }));
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const r of results) expect(r.tenantId).toBe(tenantA);
  });

  it("filters by service", async () => {
    await ingestEvent(prisma, ctxA, { service: "model_router", eventType: "model.routed", severity: "info" });
    const results = await inA((tx) => queryEvents(tx, ctxA, { service: "model_router" }));
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const r of results) expect(r.service).toBe("model_router");
  });

  it("filters by eventType", async () => {
    const uniqueType = `test.event.${randomUUID()}`;
    await ingestEvent(prisma, ctxA, { service: "runtime", eventType: uniqueType });
    const results = await inA((tx) => queryEvents(tx, ctxA, { eventType: uniqueType }));
    expect(results.length).toBe(1);
    expect(results[0]!.eventType).toBe(uniqueType);
  });

  it("filters by agentId", async () => {
    const agentId = randomUUID();
    await ingestEvent(prisma, ctxA, { service: "runtime", eventType: "agent.run.started", agentId });
    const results = await inA((tx) => queryEvents(tx, ctxA, { agentId }));
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const r of results) expect(r.agentId).toBe(agentId);
  });

  it("filters by taskId", async () => {
    const taskId = randomUUID();
    await ingestEvent(prisma, ctxA, { service: "tools", eventType: "tool.executed", taskId });
    const results = await inA((tx) => queryEvents(tx, ctxA, { taskId }));
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const r of results) expect(r.taskId).toBe(taskId);
  });

  it("filters by runId", async () => {
    const runId = randomUUID();
    await ingestEvent(prisma, ctxA, { service: "runtime", eventType: "agent.run.completed", runId });
    const results = await inA((tx) => queryEvents(tx, ctxA, { runId }));
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const r of results) expect(r.runId).toBe(runId);
  });

  it("filters by sourceRef", async () => {
    const sourceRef = `inv:${randomUUID()}`;
    await ingestEvent(prisma, ctxA, { service: "integrations", eventType: "connector.invoked", sourceRef });
    const results = await inA((tx) => queryEvents(tx, ctxA, { sourceRef }));
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const r of results) expect(r.sourceRef).toBe(sourceRef);
  });

  it("filters by correlationId / traceId (distributed trace support)", async () => {
    const correlationId = `trace:${randomUUID()}`;
    await ingestEvent(prisma, ctxA, {
      service: "model_router",
      eventType: "model.routed",
      correlationId,
      traceId: randomUUID(),
    });
    const results = await inA((tx) => queryEvents(tx, ctxA, { correlationId }));
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.correlationId).toBe(correlationId);
  });

  it("filters by time range (since/until)", async () => {
    const before = new Date(Date.now() - 2000);
    await ingestEvent(prisma, ctxA, { service: "approval", eventType: "approval.requested" });
    const after = new Date(Date.now() + 2000);

    const results = await inA((tx) => queryEvents(tx, ctxA, { since: before, until: after }));
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("returns normalized event shape with all required fields", async () => {
    const ev = await ingestEvent(prisma, ctxA, {
      service: "metering",
      eventType: "metering.recorded",
      severity: "info",
      payload: { units: 100, cost: 0.001 },
    });
    // All AuditEventView fields present.
    expect(typeof ev.id).toBe("string");
    expect(typeof ev.tenantId).toBe("string");
    expect(typeof ev.orgId).toBe("string");
    expect(typeof ev.service).toBe("string");
    expect(typeof ev.eventType).toBe("string");
    expect(typeof ev.severity).toBe("string");
    expect(ev.occurredAt).toBeInstanceOf(Date);
    expect(ev.createdAt).toBeInstanceOf(Date);
    expect(typeof ev.payload).toBe("object");
  });

  it("cross-tenant denial: tenant B events invisible under tenant A (RLS)", async () => {
    const evB = await ingestEvent(prisma, ctxB, { service: "runtime", eventType: "agent.run.started" });
    const notVisible = await inA((tx) => getAuditEvent(tx, evB.id));
    expect(notVisible).toBeNull();
  });

  it("fails closed on malformed ingest input (unknown service, empty eventType)", async () => {
    await expect(
      ingestEvent(prisma, ctxA, { service: "bogus" as never, eventType: "x" }),
    ).rejects.toBeInstanceOf(MalformedEventQueryError);

    await expect(
      ingestEvent(prisma, ctxA, { service: "runtime", eventType: "  " }),
    ).rejects.toBeInstanceOf(MalformedEventQueryError);
  });

  it("fails closed on malformed query filter (since > until, limit out of range)", async () => {
    const now = new Date();
    await expect(
      inA((tx) =>
        queryEvents(tx, ctxA, { since: new Date(now.getTime() + 1000), until: now }),
      ),
    ).rejects.toBeInstanceOf(MalformedEventQueryError);

    await expect(
      inA((tx) => queryEvents(tx, ctxA, { limit: 0 })),
    ).rejects.toBeInstanceOf(MalformedEventQueryError);

    await expect(
      inA((tx) => queryEvents(tx, ctxA, { limit: 9999 })),
    ).rejects.toBeInstanceOf(MalformedEventQueryError);
  });

  it("fails closed on invalid tenant/org context", async () => {
    await expect(
      ingestEvent(prisma, { tenantId: "bad", orgId: orgA, actorId: actorA }, {
        service: "runtime",
        eventType: "test",
      }),
    ).rejects.toBeInstanceOf(InvalidObservabilityContextError);
  });

  it("no external vendor package imported (no OpenTelemetry/Langfuse dependency)", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require("../package.json") as { dependencies?: Record<string, string> };
    const deps = Object.keys(pkg.dependencies ?? {});
    const banned = ["opentelemetry", "langfuse", "datadog", "newrelic", "sentry"];
    for (const b of banned) {
      expect(deps.some((d) => d.includes(b))).toBe(false);
    }
  });
});

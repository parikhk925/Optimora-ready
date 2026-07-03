/**
 * Admin API integration tests (E9 Admin API). Requires dev Postgres + app server.
 * Proves: authorized GET/POST routes succeed, unauthorized denied (401/400),
 * cross-tenant RLS denial, malformed request fail-closed, no secrets exposed,
 * approval/memory/metering/audit-log routes functional.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getSystemPrisma, withTenantContext, getPrisma } from "@optimora/db";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../server.js";

const sys = getSystemPrisma();
const prisma = getPrisma();

const tenantA = randomUUID();
const orgA = randomUUID();
const tenantB = randomUUID();
const orgB = randomUUID();

let app: FastifyInstance;

// Headers that resolve tenantA with orgA (simulates a valid API-key-authenticated request).
const headersA = { "x-optimora-tenant": tenantA, "x-optimora-org": orgA };
// Headers for tenantB — used to prove cross-tenant isolation.
const _headersB = { "x-optimora-tenant": tenantB, "x-optimora-org": orgB };

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `adm-${tenantA}`, name: "Admin A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `adm-${tenantB}`, name: "Admin B" } });
  await sys.organization.create({ data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" } });
  await sys.organization.create({ data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" } });

  // Seed: a memory record in tenantA
  await withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, (tx) =>
    tx.memoryRecord.create({
      data: {
        tenantId: tenantA, orgId: orgA, agentId: randomUUID(), taskId: null,
        type: "fact", content: "Admin test fact", importance: 0.5,
        tags: [], status: "active",
      },
    }),
  );

  // Seed: an approval request in tenantA
  await withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, (tx) =>
    tx.approvalRequest.create({
      data: {
        tenantId: tenantA, orgId: orgA, requesterId: "agent:seed",
        reason: "risky_tool_call", description: "Seed approval",
        actionPayload: {}, state: "pending",
        expiresAt: new Date(Date.now() + 86400_000),
      },
    }),
  );

  // Seed: a connector connection in tenantA (opaque secretRef, never raw secret)
  await withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, (tx) =>
    tx.connectorConnection.create({
      data: {
        tenantId: tenantA, orgId: orgA, connectorKey: "slack",
        secretRef: "vault:ref:slack-token-1", status: "active",
      },
    }),
  );

  // Seed: a usage record in tenantA
  await withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, (tx) =>
    tx.usageRecord.create({
      data: {
        tenantId: tenantA, orgId: orgA, actorId: "agent:seed",
        service: "tools", operation: "tool_execution",
        units: 1, estimatedCostUsd: 0, currency: "USD",
        occurredAt: new Date(),
      },
    }),
  );

  // Seed: an audit log entry in tenantA
  await withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, (tx) =>
    tx.auditLog.create({
      data: {
        tenantId: tenantA, orgId: orgA, service: "runtime",
        eventType: "agent.run.completed", severity: "info",
        payload: {}, occurredAt: new Date(),
      },
    }),
  );

  app = buildServer({ baseDomains: ["optimora.app"] });
  await app.ready();
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await app.close();
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Admin API — auth and isolation", () => {
  it("returns 401 when no tenant header is provided (fail-closed)", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/admin/runs" });
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 when orgId is missing from context", async () => {
    // Tenant resolved but no org header — org_required.
    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/runs",
      headers: { "x-optimora-tenant": tenantA },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("org_required");
  });

  it("authorized admin GET /v1/admin/runs succeeds and is tenant-scoped", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/admin/runs", headers: headersA });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().runs)).toBe(true);
  });

  it("cross-tenant denial: tenant B runs not visible under tenant A (RLS)", async () => {
    // Seed a runtime run under tenantB then check it's invisible from tenantA.
    const runId = randomUUID();
    await withTenantContext(prisma, { tenantId: tenantB, orgId: orgB }, (tx) =>
      tx.agentRun.create({
        data: {
          id: runId, tenantId: tenantB, orgId: orgB, agentId: randomUUID(),
          taskId: randomUUID(), agentVersion: 1, modelProvider: "stub", status: "pending",
        },
      }),
    );
    const res = await app.inject({ method: "GET", url: "/v1/admin/runs", headers: headersA });
    expect(res.statusCode).toBe(200);
    const ids = res.json().runs.map((r: { id: string }) => r.id);
    expect(ids).not.toContain(runId);
  });
});

describe("Admin API — memory routes", () => {
  it("GET /v1/admin/memory returns tenant-scoped records", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/admin/memory", headers: headersA });
    expect(res.statusCode).toBe(200);
    const records = res.json().records;
    expect(Array.isArray(records)).toBe(true);
    for (const r of records) expect(r.tenantId).toBe(tenantA);
  });

  it("POST /v1/admin/memory creates a record", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/memory",
      headers: { ...headersA, "content-type": "application/json" },
      payload: {
        actorId: "admin",
        type: "fact",
        content: "Created via admin API",
        importance: 0.7,
        tags: ["admin"],
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().record.content).toBe("Created via admin API");
    expect(res.json().record.tenantId).toBe(tenantA);
  });

  it("POST /v1/admin/memory fails closed on malformed request", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/memory",
      headers: { ...headersA, "content-type": "application/json" },
      payload: { type: "bogus_type", content: "x" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("Admin API — approval routes", () => {
  it("GET /v1/admin/approvals returns tenant-scoped approval requests", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/admin/approvals", headers: headersA });
    expect(res.statusCode).toBe(200);
    const requests = res.json().requests;
    expect(Array.isArray(requests)).toBe(true);
    expect(requests.length).toBeGreaterThanOrEqual(1);
    for (const r of requests) expect(r.tenantId).toBe(tenantA);
  });

  it("POST /v1/admin/approvals creates a new approval request", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/approvals",
      headers: { ...headersA, "content-type": "application/json" },
      payload: {
        requesterId: "agent:test",
        reason: "data_export",
        description: "Export org data for audit",
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().approval.state).toBe("pending");
    expect(res.json().approval.reason).toBe("data_export");
  });

  it("POST /v1/admin/approvals fails closed on unknown reason", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/approvals",
      headers: { ...headersA, "content-type": "application/json" },
      payload: { requesterId: "x", reason: "bogus", description: "x" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /v1/admin/approvals/:id/resolve approves a pending request", async () => {
    // Create a fresh approval then resolve it.
    const createRes = await app.inject({
      method: "POST",
      url: "/v1/admin/approvals",
      headers: { ...headersA, "content-type": "application/json" },
      payload: { requesterId: "agent:x", reason: "policy_required", description: "Need sign-off" },
    });
    const id = createRes.json().approval.id as string;

    const resolveRes = await app.inject({
      method: "POST",
      url: `/v1/admin/approvals/${id}/resolve`,
      headers: { ...headersA, "content-type": "application/json" },
      payload: { decision: "approved", approverId: "admin", note: "LGTM" },
    });
    expect(resolveRes.statusCode).toBe(200);
    expect(resolveRes.json().approval.state).toBe("approved");
  });

  it("resolve returns 400 on invalid decision value", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/v1/admin/approvals/${randomUUID()}/resolve`,
      headers: { ...headersA, "content-type": "application/json" },
      payload: { decision: "maybe" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_decision");
  });
});

describe("Admin API — tools/integrations routes", () => {
  it("GET /v1/admin/tool-invocations returns array", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/admin/tool-invocations", headers: headersA });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().invocations)).toBe(true);
  });

  it("GET /v1/admin/connectors returns connections without raw secrets", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/admin/connectors", headers: headersA });
    expect(res.statusCode).toBe(200);
    const connections = res.json().connections;
    expect(Array.isArray(connections)).toBe(true);
    expect(connections.length).toBeGreaterThanOrEqual(1);
    for (const c of connections) {
      // secretRef is allowed (opaque reference key), but must never be a raw secret value.
      expect(c.secretRef).not.toMatch(/^(?:sk-|Bearer |token:)/i);
      // Raw credential fields must not appear.
      expect(c.rawSecret).toBeUndefined();
      expect(c.accessToken).toBeUndefined();
      expect(c.password).toBeUndefined();
    }
  });
});

describe("Admin API — metering usage route", () => {
  it("GET /v1/admin/usage returns records and aggregate for tenant", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/admin/usage", headers: headersA });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.records)).toBe(true);
    expect(typeof body.aggregate.totalEstimatedCostUsd).toBe("number");
    expect(typeof body.aggregate.count).toBe("number");
    expect(body.aggregate.currency).toBe("USD");
    for (const r of body.records) expect(r.tenantId).toBe(tenantA);
  });
});

describe("Admin API — audit log route", () => {
  it("GET /v1/admin/audit-logs returns events for tenant", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/admin/audit-logs", headers: headersA });
    expect(res.statusCode).toBe(200);
    const events = res.json().events;
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThanOrEqual(1);
    for (const e of events) expect(e.tenantId).toBe(tenantA);
  });

  it("GET /v1/admin/audit-logs filters by service", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/audit-logs?service=runtime",
      headers: headersA,
    });
    expect(res.statusCode).toBe(200);
    for (const e of res.json().events) expect(e.service).toBe("runtime");
  });

  it("GET /v1/admin/audit-logs cross-tenant denial (RLS)", async () => {
    // Seed event under tenantB, verify invisible under tenantA.
    await withTenantContext(prisma, { tenantId: tenantB, orgId: orgB }, (tx) =>
      tx.auditLog.create({
        data: {
          tenantId: tenantB, orgId: orgB, service: "tools",
          eventType: "tool.executed", severity: "info",
          payload: { secret: "should-not-appear" }, occurredAt: new Date(),
        },
      }),
    );
    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/audit-logs?service=tools",
      headers: headersA,
    });
    expect(res.statusCode).toBe(200);
    for (const e of res.json().events) expect(e.tenantId).toBe(tenantA);
  });
});

describe("Admin API — jurisdiction config routes", () => {
  it("POST /v1/admin/jurisdiction-configs creates a jurisdiction config", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/jurisdiction-configs",
      headers: { ...headersA, "content-type": "application/json" },
      payload: { countryCode: "IN", businessDomain: "accounting" },
    });
    expect(res.statusCode).toBe(201);
    const config = res.json().config;
    expect(config.countryCode).toBe("IN");
    expect(config.businessDomain).toBe("accounting");
    expect(config.version).toBeGreaterThanOrEqual(1);
    expect(config.profile.taxIdentifierLabels.primary).toBe("PAN");
    expect(typeof config.profile.complianceDisclaimer).toBe("string");
    expect(config.tenantId).toBe(tenantA);
  });

  it("POST creates US and CA configs", async () => {
    for (const countryCode of ["US", "CA"] as const) {
      const res = await app.inject({
        method: "POST",
        url: "/v1/admin/jurisdiction-configs",
        headers: { ...headersA, "content-type": "application/json" },
        payload: { countryCode, businessDomain: "payroll" },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().config.countryCode).toBe(countryCode);
    }
  });

  it("GET /v1/admin/jurisdiction-configs returns tenant-scoped configs", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/jurisdiction-configs",
      headers: headersA,
    });
    expect(res.statusCode).toBe(200);
    const configs = res.json().configs;
    expect(Array.isArray(configs)).toBe(true);
    expect(configs.length).toBeGreaterThanOrEqual(1);
    for (const c of configs) expect(c.tenantId).toBe(tenantA);
  });

  it("GET filters by countryCode", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/jurisdiction-configs?countryCode=IN",
      headers: headersA,
    });
    expect(res.statusCode).toBe(200);
    for (const c of res.json().configs) expect(c.countryCode).toBe("IN");
  });

  it("POST fails closed on invalid country code", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/jurisdiction-configs",
      headers: { ...headersA, "content-type": "application/json" },
      payload: { countryCode: "XX", businessDomain: "accounting" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST fails closed on invalid business domain", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/jurisdiction-configs",
      headers: { ...headersA, "content-type": "application/json" },
      payload: { countryCode: "IN", businessDomain: "bogus_domain" },
    });
    expect(res.statusCode).toBe(400);
  });
});

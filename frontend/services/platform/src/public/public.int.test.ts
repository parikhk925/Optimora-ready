/**
 * Public API routes integration tests (E9 Public API).
 * Proves: API key auth, scope enforcement, entitlement/quota checks,
 * task/run/memory CRUD, tools/integrations listing, approval decisions,
 * usage summary, cross-tenant denial, no secrets exposed, fail-closed.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getSystemPrisma, withTenantContext, getPrisma } from "@optimora/db";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../server.js";
import { createSubscription } from "@optimora/billing";
import { createApiKey } from "../auth/api-key.js";

const sys = getSystemPrisma();
const prisma = getPrisma();

const tenantA = randomUUID();
const orgA = randomUUID();
const tenantB = randomUUID();
const orgB = randomUUID();

let app: FastifyInstance;
let keyA: string;       // all scopes
let keyReadOnly: string; // tasks:read only
let keyB: string;       // tenant B key — for cross-tenant test

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `pub-${tenantA}`, name: "PubA" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `pub-${tenantB}`, name: "PubB" } });
  await sys.organization.create({ data: { id: orgA, tenantId: tenantA, slug: "main", name: "OA" } });
  await sys.organization.create({ data: { id: orgB, tenantId: tenantB, slug: "main", name: "OB" } });

  // Seed subscriptions
  await withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, (tx) =>
    createSubscription(tx, { tenantId: tenantA, orgId: orgA, actorId: "seed" }, {
      planKey: "growth", status: "active",
    }),
  );
  await withTenantContext(prisma, { tenantId: tenantB, orgId: orgB }, (tx) =>
    createSubscription(tx, { tenantId: tenantB, orgId: orgB, actorId: "seed" }, {
      planKey: "free", status: "active",
    }),
  );

  // Create API keys (uses system prisma directly since we need tx.apiKey.create outside RLS)
  const { plaintext: ka } = await withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, (tx) =>
    createApiKey(tx, orgA, "full-access", ["*"]),
  );
  keyA = ka;

  const { plaintext: kr } = await withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, (tx) =>
    createApiKey(tx, orgA, "read-only", ["tasks:read"]),
  );
  keyReadOnly = kr;

  const { plaintext: kb } = await withTenantContext(prisma, { tenantId: tenantB, orgId: orgB }, (tx) =>
    createApiKey(tx, orgB, "b-full", ["*"]),
  );
  keyB = kb;

  app = buildServer({ baseDomains: ["optimora.app"] });
  await app.ready();
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await app.close();
  await sys.$disconnect();
  await prisma.$disconnect();
});

// Helper to inject with API key — uses x-optimora-api-key which both resolves tenant AND is forwarded to scope guard
function apiReq(key: string) {
  return { "x-optimora-api-key": key };
}

describe("Auth guards", () => {
  it("missing API key returns 401", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/public/tasks" });
    expect(res.statusCode).toBe(401);
  });

  it("invalid API key format returns 401", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/public/tasks",
      headers: { "x-api-key": "not-a-valid-key" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("revoked API key returns 401", async () => {
    // Create and immediately revoke a key
    const { plaintext: rk, id: rkId } = await withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, (tx) =>
      createApiKey(tx, orgA, "to-revoke", ["*"]),
    );
    await withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, (tx) =>
      tx.apiKey.update({ where: { id: rkId }, data: { revokedAt: new Date() } }),
    );
    const res = await app.inject({
      method: "GET",
      url: "/v1/public/tasks",
      headers: { "x-api-key": rk },
    });
    expect(res.statusCode).toBe(401);
  });

  it("insufficient scope returns 403", async () => {
    // keyReadOnly has tasks:read but not tasks:write
    const res = await app.inject({
      method: "POST",
      url: "/v1/public/tasks",
      headers: { ...apiReq(keyReadOnly), "content-type": "application/json" },
      payload: { title: "Should fail" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("insufficient_scope");
  });

  it("Authorization: Bearer token also works", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/public/tasks",
      headers: { authorization: `Bearer ${keyA}` },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("Agents route", () => {
  it("GET /v1/public/agents returns array", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/public/agents", headers: apiReq(keyA) });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().agents)).toBe(true);
  });
});

describe("Task routes", () => {
  let createdTaskId: string;

  it("POST /v1/public/tasks creates a task", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/public/tasks",
      headers: { ...apiReq(keyA), "content-type": "application/json" },
      payload: { title: "SDK test task", priority: 2, inputData: { source: "sdk" } },
    });
    expect(res.statusCode).toBe(201);
    const task = res.json().task;
    expect(task.title).toBe("SDK test task");
    expect(task.tenantId).toBe(tenantA);
    createdTaskId = task.id as string;
  });

  it("GET /v1/public/tasks/:id returns task status", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/v1/public/tasks/${createdTaskId}`,
      headers: apiReq(keyA),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().task.id).toBe(createdTaskId);
  });

  it("GET /v1/public/tasks lists tasks", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/public/tasks", headers: apiReq(keyA) });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().tasks)).toBe(true);
    expect(res.json().tasks.some((t: { id: string }) => t.id === createdTaskId)).toBe(true);
  });

  it("GET /v1/public/tasks/:id returns 404 for nonexistent task", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/v1/public/tasks/${randomUUID()}`,
      headers: apiReq(keyA),
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /v1/public/tasks fails closed on missing title", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/public/tasks",
      headers: { ...apiReq(keyA), "content-type": "application/json" },
      payload: { priority: 1 },
    });
    expect(res.statusCode).toBe(400);
  });

  it("cross-tenant: tenant B task not accessible via tenant A key (RLS)", async () => {
    const bRes = await app.inject({
      method: "POST",
      url: "/v1/public/tasks",
      headers: { ...apiReq(keyB), "content-type": "application/json" },
      payload: { title: "B task" },
    });
    const bTaskId = bRes.json().task.id as string;
    const res = await app.inject({
      method: "GET",
      url: `/v1/public/tasks/${bTaskId}`,
      headers: apiReq(keyA),
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("Run route", () => {
  it("POST /v1/public/runs creates an agent run", async () => {
    const taskRes = await app.inject({
      method: "POST",
      url: "/v1/public/tasks",
      headers: { ...apiReq(keyA), "content-type": "application/json" },
      payload: { title: "Run test task" },
    });
    const taskId = taskRes.json().task.id as string;

    const res = await app.inject({
      method: "POST",
      url: "/v1/public/runs",
      headers: { ...apiReq(keyA), "content-type": "application/json" },
      payload: { agentId: randomUUID(), taskId, modelProvider: "stub" },
    });
    expect(res.statusCode).toBe(201);
    const run = res.json().run;
    expect(run.status).toBe("pending");
    expect(run.tenantId).toBe(tenantA);
  });

  it("POST /v1/public/runs fails closed on missing agentId", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/public/runs",
      headers: { ...apiReq(keyA), "content-type": "application/json" },
      payload: { taskId: randomUUID() },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("Memory route", () => {
  it("POST /v1/public/memory creates a memory record", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/public/memory",
      headers: { ...apiReq(keyA), "content-type": "application/json" },
      payload: { agentId: randomUUID(), type: "fact", content: "SDK memory test", importance: 0.8 },
    });
    expect(res.statusCode).toBe(201);
    const record = res.json().record;
    expect(record.type).toBe("fact");
    expect(record.tenantId).toBe(tenantA);
  });

  it("POST /v1/public/memory fails closed on missing content", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/public/memory",
      headers: { ...apiReq(keyA), "content-type": "application/json" },
      payload: { agentId: randomUUID(), type: "fact" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("Tools / Integrations routes", () => {
  it("GET /v1/public/tools returns array (growth plan has tools)", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/public/tools", headers: apiReq(keyA) });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().tools)).toBe(true);
  });

  it("GET /v1/public/integrations returns array without secrets", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/public/integrations", headers: apiReq(keyA) });
    expect(res.statusCode).toBe(200);
    const integrations = res.json().integrations as Record<string, unknown>[];
    for (const i of integrations) {
      expect(i.secretRef).toBeUndefined();
      expect(i.hashedKey).toBeUndefined();
      expect(i.accessToken).toBeUndefined();
    }
  });

  it("GET /v1/public/tools denied when tools module not in plan (free plan)", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/public/tools", headers: apiReq(keyB) });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("entitlement_denied");
  });
});

describe("Approval decision route", () => {
  let approvalId: string;

  beforeAll(async () => {
    const appr = await withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, (tx) =>
      tx.approvalRequest.create({
        data: {
          tenantId: tenantA, orgId: orgA, requesterId: "agent:test",
          reason: "risky_tool_call", description: "SDK test approval",
          actionPayload: {}, state: "pending",
          expiresAt: new Date(Date.now() + 86400_000),
        },
      }),
    );
    approvalId = appr.id;
  });

  it("POST /v1/public/approvals/:id/decision approves request", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/v1/public/approvals/${approvalId}/decision`,
      headers: { ...apiReq(keyA), "content-type": "application/json" },
      payload: { decision: "approved", note: "LGTM from SDK" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().approval.state).toBe("approved");
  });

  it("POST decision returns 409 when already resolved", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/v1/public/approvals/${approvalId}/decision`,
      headers: { ...apiReq(keyA), "content-type": "application/json" },
      payload: { decision: "rejected" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("POST decision returns 400 on invalid decision value", async () => {
    const newAppr = await withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, (tx) =>
      tx.approvalRequest.create({
        data: {
          tenantId: tenantA, orgId: orgA, requesterId: "agent:x",
          reason: "data_export", description: "Test",
          actionPayload: {}, state: "pending",
          expiresAt: new Date(Date.now() + 86400_000),
        },
      }),
    );
    const res = await app.inject({
      method: "POST",
      url: `/v1/public/approvals/${newAppr.id}/decision`,
      headers: { ...apiReq(keyA), "content-type": "application/json" },
      payload: { decision: "maybe" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("Usage / limits route", () => {
  it("GET /v1/public/usage returns usage and quota summary", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/public/usage", headers: apiReq(keyA) });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.usage.estimatedCostUsd).toBe("number");
    expect(typeof body.usage.taskCount).toBe("number");
    expect(typeof body.quotas.monthlyTasks.limit).toBe("number");
    expect(typeof body.quotas.monthlyTasks.allowed).toBe("boolean");
    // No payment data in usage response
    expect((body as Record<string, unknown>).cardNumber).toBeUndefined();
  });

  it("GET /v1/public/usage requires usage:read scope", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/public/usage", headers: apiReq(keyReadOnly) });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("insufficient_scope");
  });
});

describe("Entitlement denial (billing-linked)", () => {
  it("free plan: salesAgent entitlement denied via entitlement route", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/billing/entitlement/salesAgent",
      headers: { "x-optimora-tenant": tenantB, "x-optimora-org": orgB },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().entitlement.allowed).toBe(false);
  });
});

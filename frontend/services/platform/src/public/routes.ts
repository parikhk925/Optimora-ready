/**
 * Public API routes — versioned, API-key scoped, tenant-isolated, fail-closed.
 * Namespace: /v1/public/*
 *
 * Auth model:
 *   - `x-api-key: opt_<prefix>.<secret>` OR `Authorization: Bearer opt_<prefix>.<secret>`
 *   - Tenant is already resolved by the global hook via x-optimora-api-key / Authorization.
 *   - Scope is re-verified here from the key to enforce per-route access control.
 *
 * Fail-closed on: missing key, revoked key, insufficient scope, missing subscription,
 *   over-quota, malformed request, cross-tenant access (RLS), missing entitlement.
 *
 * Responses are client-safe: no secrets, no internal traces, no raw policy payloads.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getSystemPrisma } from "@optimora/db";
import { verifyApiKeyRaw } from "../auth/api-key.js";
import { checkEntitlement, checkQuota } from "@optimora/billing";
import type { BillingContext } from "@optimora/billing";
import type { EntitlementCheckResult, QuotaCheckResult, QuotaResource } from "@optimora/billing";
import { aggregateUsage } from "@optimora/metering";

// ---- Scope constants ----
const SCOPES = {
  TASKS_READ: "tasks:read",
  TASKS_WRITE: "tasks:write",
  RUNS_WRITE: "runs:write",
  MEMORY_WRITE: "memory:write",
  TOOLS_READ: "tools:read",
  APPROVALS_WRITE: "approvals:write",
  USAGE_READ: "usage:read",
} as const;

type Scope = (typeof SCOPES)[keyof typeof SCOPES];
type PublicUsageAggregate = Awaited<ReturnType<typeof aggregateUsage>>;

interface PublicAgentRunSummary {
  agentId: string;
  modelProvider: string;
  agentVersion: number;
  status: string;
  createdAt: Date;
}

interface PublicCreatedTask {
  id: string;
  tenantId: string;
  orgId: string;
  title: string;
  status: string;
  priority: number;
  createdAt: Date;
}

interface PublicTaskSummary {
  id: string;
  title: string;
  status: string;
  priority: number;
  assignedAgentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PublicTaskDetail extends PublicTaskSummary {
  tenantId: string;
  orgId: string;
}

interface PublicCreatedRun {
  id: string;
  tenantId: string;
  orgId: string;
  agentId: string;
  taskId: string;
  agentVersion: number;
  modelProvider: string;
  status: string;
  createdAt: Date;
}

interface PublicMemoryRecord {
  id: string;
  tenantId: string;
  orgId: string;
  agentId: string;
  type: string;
  importance: number;
  status: string;
  createdAt: Date;
}

interface PublicToolInvocation {
  toolName: string;
  status: string;
}

interface PublicIntegration {
  id: string;
  connectorKey: string;
  status: string;
  createdAt: Date;
}

interface PublicApprovalLookup {
  state: string;
  expiresAt: Date;
}

interface PublicApprovalDecision {
  id: string;
  state: string;
  reason: string;
  resolvedAt: Date | null;
}

// ---- Helpers ----

function monthStart(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function rawKeyFromRequest(req: FastifyRequest): string | null {
  // x-optimora-api-key (primary — also drives tenant resolution)
  const xOptimoraKey = req.headers["x-optimora-api-key"];
  if (typeof xOptimoraKey === "string" && xOptimoraKey.trim()) return xOptimoraKey.trim();
  // x-api-key (public alias)
  const xApiKey = req.headers["x-api-key"];
  if (typeof xApiKey === "string" && xApiKey.trim()) return xApiKey.trim();
  // Authorization: Bearer <key>
  const auth = req.headers.authorization;
  if (typeof auth === "string") {
    const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
    if (m) return m[1]!.trim();
  }
  return null;
}

interface ApiKeyGuard {
  tenantId: string;
  orgId: string;
  keyId: string;
  scopes: string[];
}

async function resolveAndVerifyKey(req: FastifyRequest): Promise<ApiKeyGuard | null> {
  const raw = rawKeyFromRequest(req);
  if (!raw) return null;
  const sys = getSystemPrisma();
  return verifyApiKeyRaw(sys, raw);
}

function hasScope(identity: ApiKeyGuard, scope: Scope): boolean {
  // Wildcard scope grants everything
  if (identity.scopes.includes("*")) return true;
  return identity.scopes.includes(scope);
}

async function guardScope(
  req: FastifyRequest,
  reply: FastifyReply,
  scope: Scope,
): Promise<ApiKeyGuard | null> {
  const identity = await resolveAndVerifyKey(req);
  if (!identity) {
    await reply.code(401).send({ error: "invalid_or_missing_api_key" });
    return null;
  }
  // Cross-tenant: key's tenant must match the resolved tenant context
  if (!req.tenantContext || identity.tenantId !== req.tenantContext.tenantId) {
    await reply.code(403).send({ error: "cross_tenant_denied" });
    return null;
  }
  if (!hasScope(identity, scope)) {
    await reply.code(403).send({ error: "insufficient_scope", required: scope });
    return null;
  }
  return identity;
}

async function checkModuleEntitlement(
  req: FastifyRequest,
  reply: FastifyReply,
  identity: ApiKeyGuard,
  feature: string,
): Promise<boolean> {
  const billingCtx: BillingContext = { tenantId: identity.tenantId, orgId: identity.orgId, actorId: `key:${identity.keyId}` };
  const result = await req.runScoped!<EntitlementCheckResult>((tx) => checkEntitlement(tx, billingCtx, feature));
  if (!result.allowed) {
    await reply.code(403).send({ error: "entitlement_denied", feature, reason: result.reason });
    return false;
  }
  return true;
}

async function checkAndEnforceQuota(
  req: FastifyRequest,
  reply: FastifyReply,
  identity: ApiKeyGuard,
  resource: QuotaResource,
  currentUsage: number,
): Promise<boolean> {
  const billingCtx: BillingContext = { tenantId: identity.tenantId, orgId: identity.orgId, actorId: `key:${identity.keyId}` };
  const result = await req.runScoped!<QuotaCheckResult>((tx) => checkQuota(tx, billingCtx, resource, currentUsage));
  if (!result.allowed) {
    await reply.code(429).send({ error: "quota_exceeded", resource, limit: result.limit, currentUsage: result.currentUsage });
    return false;
  }
  return true;
}

// ---- Routes ----

export function registerPublicRoutes(app: FastifyInstance): void {

  // GET /v1/public/agents — list agent runs (agent definitions are implicit in this architecture)
  app.get("/v1/public/agents", async (req, reply) => {
    const identity = await guardScope(req, reply, SCOPES.TASKS_READ);
    if (!identity) return reply;

    const { limit, offset } = req.query as Record<string, string | undefined>;
    // Agent definitions live in AgentRun records — expose distinct agent IDs + last status
    const runs = await req.runScoped!<PublicAgentRunSummary[]>((tx) =>
      tx.agentRun.findMany({
        where: { orgId: identity.orgId },
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(limit ?? 20), 100),
        skip: Number(offset ?? 0),
        select: {
          agentId: true, modelProvider: true, agentVersion: true, status: true, createdAt: true,
        },
      }),
    );

    // Deduplicate by agentId — return latest status per agent
    const seen = new Map<string, (typeof runs)[number]>();
    for (const r of runs) {
      if (!seen.has(r.agentId)) seen.set(r.agentId, r);
    }

    return reply.send({ agents: Array.from(seen.values()) });
  });

  // POST /v1/public/tasks — submit a task
  app.post("/v1/public/tasks", async (req, reply) => {
    const identity = await guardScope(req, reply, SCOPES.TASKS_WRITE);
    if (!identity) return reply;

    // Enforce runtime entitlement before creating tasks
    if (!await checkModuleEntitlement(req, reply, identity, "runtime")) return reply;

    // Enforce monthly task quota
    const taskCount = await req.runScoped!<number>((tx) =>
      tx.task.count({ where: { tenantId: identity.tenantId, orgId: identity.orgId,
        createdAt: { gte: monthStart() } } }),
    );
    if (!await checkAndEnforceQuota(req, reply, identity, "monthlyTasks", taskCount)) return reply;

    const body = req.body as Record<string, unknown> | undefined;
    if (!body?.title || typeof body.title !== "string") {
      return reply.code(400).send({ error: "title_required" });
    }

    const task = await req.runScoped!<PublicCreatedTask>((tx) =>
      tx.task.create({
        data: {
          tenantId: identity.tenantId,
          orgId: identity.orgId,
          title: body.title as string,
          status: "draft",
          priority: typeof body.priority === "number" ? body.priority : 3,
          inputData: typeof body.inputData === "object" && body.inputData ? body.inputData as never : {},
          deadline: body.deadline ? new Date(body.deadline as string) : null,
        },
        select: { id: true, tenantId: true, orgId: true, title: true, status: true, priority: true, createdAt: true },
      }),
    );

    return reply.code(201).send({ task });
  });

  // GET /v1/public/tasks/:id — get task status
  app.get("/v1/public/tasks/:id", async (req, reply) => {
    const identity = await guardScope(req, reply, SCOPES.TASKS_READ);
    if (!identity) return reply;

    const { id } = req.params as { id: string };
    const task = await req.runScoped!<PublicTaskDetail | null>((tx) =>
      tx.task.findUnique({
        where: { id },
        select: { id: true, tenantId: true, orgId: true, title: true, status: true,
          priority: true, assignedAgentId: true, createdAt: true, updatedAt: true },
      }),
    );

    if (!task) return reply.code(404).send({ error: "task_not_found" });
    // RLS already scoped, but belt-and-suspenders: verify org matches
    if (task.orgId !== identity.orgId) return reply.code(404).send({ error: "task_not_found" });

    return reply.send({ task });
  });

  // GET /v1/public/tasks — list tasks
  app.get("/v1/public/tasks", async (req, reply) => {
    const identity = await guardScope(req, reply, SCOPES.TASKS_READ);
    if (!identity) return reply;

    const { status, limit, offset } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = { orgId: identity.orgId };
    if (status) where["status"] = status;

    const tasks = await req.runScoped!<PublicTaskSummary[]>((tx) =>
      tx.task.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(limit ?? 20), 100),
        skip: Number(offset ?? 0),
        select: { id: true, title: true, status: true, priority: true, assignedAgentId: true, createdAt: true, updatedAt: true },
      }),
    );

    return reply.send({ tasks });
  });

  // POST /v1/public/runs — start a runtime run
  app.post("/v1/public/runs", async (req, reply) => {
    const identity = await guardScope(req, reply, SCOPES.RUNS_WRITE);
    if (!identity) return reply;

    if (!await checkModuleEntitlement(req, reply, identity, "runtime")) return reply;

    const body = req.body as Record<string, unknown> | undefined;
    if (!body?.agentId || typeof body.agentId !== "string") {
      return reply.code(400).send({ error: "agentId_required" });
    }
    if (!body?.taskId || typeof body.taskId !== "string") {
      return reply.code(400).send({ error: "taskId_required" });
    }

    const run = await req.runScoped!<PublicCreatedRun>((tx) =>
      tx.agentRun.create({
        data: {
          tenantId: identity.tenantId,
          orgId: identity.orgId,
          agentId: body.agentId as string,
          taskId: body.taskId as string,
          agentVersion: typeof body.agentVersion === "number" ? body.agentVersion : 1,
          modelProvider: typeof body.modelProvider === "string" ? body.modelProvider : "stub",
          status: "pending",
          input: typeof body.input === "object" && body.input ? body.input as never : {},
        },
        select: { id: true, tenantId: true, orgId: true, agentId: true, taskId: true,
          agentVersion: true, modelProvider: true, status: true, createdAt: true },
      }),
    );

    return reply.code(201).send({ run });
  });

  // POST /v1/public/memory — create a memory record
  app.post("/v1/public/memory", async (req, reply) => {
    const identity = await guardScope(req, reply, SCOPES.MEMORY_WRITE);
    if (!identity) return reply;

    if (!await checkModuleEntitlement(req, reply, identity, "memory")) return reply;

    // Check memory records quota
    const memCount = await req.runScoped!<number>((tx) =>
      tx.memoryRecord.count({ where: { tenantId: identity.tenantId, orgId: identity.orgId, status: "active" } }),
    );
    if (!await checkAndEnforceQuota(req, reply, identity, "memoryRecords", memCount)) return reply;

    const body = req.body as Record<string, unknown> | undefined;
    if (!body?.agentId || typeof body.agentId !== "string") {
      return reply.code(400).send({ error: "agentId_required" });
    }
    if (!body?.type || typeof body.type !== "string") {
      return reply.code(400).send({ error: "type_required" });
    }
    if (!body?.content || typeof body.content !== "string") {
      return reply.code(400).send({ error: "content_required" });
    }

    const record = await req.runScoped!<PublicMemoryRecord>((tx) =>
      tx.memoryRecord.create({
        data: {
          tenantId: identity.tenantId,
          orgId: identity.orgId,
          agentId: body.agentId as string,
          taskId: typeof body.taskId === "string" ? body.taskId : null,
          type: body.type as string,
          content: body.content as string,
          importance: typeof body.importance === "number" ? body.importance : 0.5,
          tags: Array.isArray(body.tags) ? body.tags as string[] : [],
          status: "active",
        },
        select: { id: true, tenantId: true, orgId: true, agentId: true, type: true,
          importance: true, status: true, createdAt: true },
      }),
    );

    return reply.code(201).send({ record });
  });

  // GET /v1/public/tools — list allowed tools (distinct tool names from invocations + entitlement)
  app.get("/v1/public/tools", async (req, reply) => {
    const identity = await guardScope(req, reply, SCOPES.TOOLS_READ);
    if (!identity) return reply;

    const toolsAllowed = await checkModuleEntitlement(req, reply, identity, "tools");
    if (!toolsAllowed) return reply;

    const invocations = await req.runScoped!<PublicToolInvocation[]>((tx) =>
      tx.toolInvocation.findMany({
        where: { orgId: identity.orgId },
        distinct: ["toolName"],
        select: { toolName: true, status: true },
        take: 100,
      }),
    );

    return reply.send({ tools: invocations.map((t) => ({ name: t.toolName })) });
  });

  // GET /v1/public/integrations — list active connector connections (no secrets)
  app.get("/v1/public/integrations", async (req, reply) => {
    const identity = await guardScope(req, reply, SCOPES.TOOLS_READ);
    if (!identity) return reply;

    const integrationsAllowed = await checkModuleEntitlement(req, reply, identity, "integrations");
    if (!integrationsAllowed) return reply;

    const connections = await req.runScoped!<PublicIntegration[]>((tx) =>
      tx.connectorConnection.findMany({
        where: { orgId: identity.orgId, status: "active" },
        select: { id: true, connectorKey: true, status: true, createdAt: true },
        // secretRef and any credential fields are explicitly excluded
      }),
    );

    return reply.send({ integrations: connections });
  });

  // POST /v1/public/approvals/:id/decision — submit an approval decision
  app.post("/v1/public/approvals/:id/decision", async (req, reply) => {
    const identity = await guardScope(req, reply, SCOPES.APPROVALS_WRITE);
    if (!identity) return reply;

    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown> | undefined;
    const decision = body?.decision;
    if (decision !== "approved" && decision !== "rejected" && decision !== "cancelled") {
      return reply.code(400).send({ error: "invalid_decision", allowed: ["approved", "rejected", "cancelled"] });
    }

    const existing = await req.runScoped!<PublicApprovalLookup | null>((tx) =>
      tx.approvalRequest.findUnique({
        where: { id },
        select: { state: true, expiresAt: true },
      }),
    );
    if (!existing) return reply.code(404).send({ error: "approval_not_found" });
    if (existing.state !== "pending") return reply.code(409).send({ error: "approval_already_resolved", state: existing.state });
    if (existing.expiresAt && new Date(existing.expiresAt) <= new Date()) {
      return reply.code(410).send({ error: "approval_expired" });
    }

    const updated = await req.runScoped!<PublicApprovalDecision>((tx) =>
      tx.approvalRequest.update({
        where: { id },
        data: {
          state: decision,
          approverId: `key:${identity.keyId}`,
          approverNote: typeof body?.note === "string" ? body.note : null,
          resolvedAt: new Date(),
        },
        select: { id: true, state: true, reason: true, resolvedAt: true },
      }),
    );

    return reply.send({ approval: updated });
  });

  // GET /v1/public/usage — query usage and limits
  app.get("/v1/public/usage", async (req, reply) => {
    const identity = await guardScope(req, reply, SCOPES.USAGE_READ);
    if (!identity) return reply;

    const { since } = req.query as Record<string, string | undefined>;
    const sinceDate = since ? new Date(since) : monthStart();

    const [agg, taskCount, memCount] = await Promise.all([
      req.runScoped!<PublicUsageAggregate>((tx) =>
        aggregateUsage(tx, { tenantId: identity.tenantId, orgId: identity.orgId, since: sinceDate }),
      ),
      req.runScoped!<number>((tx) =>
        tx.task.count({ where: { tenantId: identity.tenantId, orgId: identity.orgId,
          createdAt: { gte: sinceDate } } }),
      ),
      req.runScoped!<number>((tx) =>
        tx.memoryRecord.count({ where: { tenantId: identity.tenantId, orgId: identity.orgId, status: "active" } }),
      ),
    ]);

    const billingCtx: BillingContext = { tenantId: identity.tenantId, orgId: identity.orgId, actorId: `key:${identity.keyId}` };
    const [taskQuota, memQuota, costQuota] = await Promise.all([
      req.runScoped!<QuotaCheckResult>((tx) => checkQuota(tx, billingCtx, "monthlyTasks", taskCount)),
      req.runScoped!<QuotaCheckResult>((tx) => checkQuota(tx, billingCtx, "memoryRecords", memCount)),
      req.runScoped!<QuotaCheckResult>((tx) =>
        checkQuota(tx, billingCtx, "monthlyModelUsageUsd", agg.totalEstimatedCostUsd),
      ),
    ]);

    return reply.send({
      usage: {
        since: sinceDate.toISOString(),
        estimatedCostUsd: agg.totalEstimatedCostUsd,
        totalUnits: agg.totalUnits,
        invocationCount: agg.count,
        taskCount,
        activeMemoryRecords: memCount,
      },
      quotas: {
        monthlyTasks: { limit: taskQuota.limit, used: taskCount, allowed: taskQuota.allowed },
        memoryRecords: { limit: memQuota.limit, used: memCount, allowed: memQuota.allowed },
        monthlyModelUsageUsd: { limit: costQuota.limit, used: agg.totalEstimatedCostUsd, allowed: costQuota.allowed },
      },
    });
  });
}

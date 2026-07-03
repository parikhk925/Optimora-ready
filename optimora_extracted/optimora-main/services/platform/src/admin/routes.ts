/**
 * Admin / Control Plane API routes (E9 Admin API). Tenant/org-scoped, fail-closed.
 * Reads use req.runScoped (RLS-active TxClient). Writes that need their own tx
 * import from the relevant service.
 *
 * Auth model: every route requires a resolved tenant context (global hook).
 * Org-scoped routes additionally require ctx.orgId. No secrets are returned.
 * Cross-tenant access is prevented by RLS — req.runScoped binds the session to
 * the resolved tenantId before any handler executes.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getPrisma } from "@optimora/db";
import {
  createApproval,
  resolveApproval,
  InvalidApprovalContextError,
  ApprovalNotFoundError,
  ApprovalAlreadyResolvedError,
  ApprovalExpiredError,
  MalformedApprovalRequestError,
} from "@optimora/approval";
import {
  createConfig as createJurisdictionConfig,
  listJurisdictionConfigs,
  InvalidCountryCodeError,
  InvalidBusinessDomainError,
  InvalidJurisdictionContextError as InvalidJurisdictionCtxError,
  MalformedJurisdictionConfigError,
  type JurisdictionContext,
} from "@optimora/jurisdiction";
import {
  createMemory,
  archiveMemory,
  InvalidMemoryContextError,
  InvalidMemoryInputError,
} from "@optimora/memory";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Shared guard: ensures orgId is present. */
function requireOrg(req: FastifyRequest, reply: FastifyReply): string | null {
  const ctx = req.tenantContext!;
  if (!ctx.orgId) {
    void reply.code(400).send({ error: "org_required" });
    return null;
  }
  return ctx.orgId;
}

export function registerAdminRoutes(app: FastifyInstance): void {
  // ---- Runtime runs ----
  app.get("/v1/admin/runs", async (req, reply) => {
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const { taskId, agentId, limit, offset } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (taskId) where["taskId"] = taskId;
    if (agentId) where["agentId"] = agentId;
    const runs = await req.runScoped!((tx) =>
      tx.agentRun.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(limit ?? 50), 200),
        skip: Number(offset ?? 0),
      }),
    );
    return reply.send({ runs });
  });

  app.get("/v1/admin/runs/:id", async (req, reply) => {
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const { id } = req.params as { id: string };
    if (!UUID_RE.test(id)) return reply.code(400).send({ error: "invalid_id" });
    const run = await req.runScoped!((tx) => tx.agentRun.findUnique({ where: { id } }));
    if (!run) return reply.code(404).send({ error: "not_found" });
    return reply.send({ run });
  });

  // ---- Context assemblies ----
  app.get("/v1/admin/context-assemblies", async (req, reply) => {
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const { taskId, agentId, limit, offset } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (taskId) where["taskId"] = taskId;
    if (agentId) where["agentId"] = agentId;
    const assemblies = await req.runScoped!((tx) =>
      tx.contextAssembly.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(limit ?? 50), 200),
        skip: Number(offset ?? 0),
      }),
    );
    return reply.send({ assemblies });
  });

  // ---- Memory records ----
  app.get("/v1/admin/memory", async (req, reply) => {
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const { agentId, taskId, type, limit, offset } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = { status: { not: "archived" } };
    if (agentId) where["agentId"] = agentId;
    if (taskId) where["taskId"] = taskId;
    if (type) where["type"] = type;
    const records = await req.runScoped!((tx) =>
      tx.memoryRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(limit ?? 50), 200),
        skip: Number(offset ?? 0),
      }),
    );
    return reply.send({ records });
  });

  app.post("/v1/admin/memory", async (req, reply) => {
    const ctx = req.tenantContext!;
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const body = req.body as Record<string, unknown> | undefined;
    if (!body) return reply.code(400).send({ error: "body_required" });
    try {
      const record = await req.runScoped!((tx) =>
        createMemory(tx, {
          tenantId: ctx.tenantId,
          orgId,
        }, {
        agentId: typeof body.agentId === "string" ? body.agentId : "00000000-0000-0000-0000-000000000000",
        taskId: typeof body.taskId === "string" ? body.taskId : undefined,
        type: body.type as never,
        content: typeof body.content === "string" ? body.content : "",
        importance: typeof body.importance === "number" ? body.importance : 0.5,
          tags: Array.isArray(body.tags) ? body.tags as string[] : [],
        }),
      );
      return reply.code(201).send({ record });
    } catch (err) {
      if (err instanceof InvalidMemoryContextError || err instanceof InvalidMemoryInputError) {
        return reply.code(400).send({ error: (err as Error).message });
      }
      throw err;
    }
  });

  app.delete("/v1/admin/memory/:id", async (req, reply) => {
    const ctx = req.tenantContext!;
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const { id } = req.params as { id: string };
    if (!UUID_RE.test(id)) return reply.code(400).send({ error: "invalid_id" });
    const existing = await req.runScoped!((tx) => tx.memoryRecord.findUnique({ where: { id } }));
    if (!existing) return reply.code(404).send({ error: "not_found" });
    try {
      await req.runScoped!((tx) => archiveMemory(tx, { tenantId: ctx.tenantId, orgId }, id));
    } catch (err) {
      if (err instanceof InvalidMemoryContextError) {
        return reply.code(403).send({ error: (err as Error).message });
      }
      throw err;
    }
    return reply.send({ ok: true });
  });

  // ---- Model invocations ----
  app.get("/v1/admin/model-invocations", async (req, reply) => {
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const { provider, limit, offset } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (provider) where["providerName"] = provider;
    const invocations = await req.runScoped!((tx) =>
      tx.modelInvocation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        // Never expose secretRef or raw prompt/completion — select safe fields only.
        select: {
          id: true, tenantId: true, orgId: true, providerName: true, qualityTier: true,
          estimatedCostUsd: true, status: true,
          tokensIn: true, tokensOut: true, createdAt: true,
        },
        take: Math.min(Number(limit ?? 50), 200),
        skip: Number(offset ?? 0),
      }),
    );
    return reply.send({ invocations });
  });

  // ---- Tool invocations ----
  app.get("/v1/admin/tool-invocations", async (req, reply) => {
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const { toolName, agentId, limit, offset } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (toolName) where["toolName"] = toolName;
    if (agentId) where["agentId"] = agentId;
    const invocations = await req.runScoped!((tx) =>
      tx.toolInvocation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(limit ?? 50), 200),
        skip: Number(offset ?? 0),
      }),
    );
    return reply.send({ invocations });
  });

  // ---- Connector connections + capabilities ----
  app.get("/v1/admin/connectors", async (req, reply) => {
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const connections = await req.runScoped!((tx) =>
      tx.connectorConnection.findMany({
        orderBy: { createdAt: "desc" },
        // Never expose secretRef content — return only the opaque reference key, never the secret.
        select: {
          id: true, tenantId: true, orgId: true, connectorKey: true,
          secretRef: true, // opaque key only — stored as ref, never raw secret
          status: true, createdAt: true,
        },
      }),
    );
    return reply.send({ connections });
  });

  // ---- Approval requests ----
  app.get("/v1/admin/approvals", async (req, reply) => {
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const { state, reason, limit, offset } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (state) where["state"] = state;
    if (reason) where["reason"] = reason;
    const requests = await req.runScoped!((tx) =>
      tx.approvalRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(limit ?? 50), 200),
        skip: Number(offset ?? 0),
      }),
    );
    return reply.send({ requests });
  });

  app.post("/v1/admin/approvals", async (req, reply) => {
    const ctx = req.tenantContext!;
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const body = req.body as Record<string, unknown> | undefined;
    if (!body) return reply.code(400).send({ error: "body_required" });
    try {
      const approval = await req.runScoped!((tx) =>
        createApproval(tx, {
          tenantId: ctx.tenantId,
          orgId,
          requesterId: String(body.requesterId ?? "admin"),
        }, {
          reason: body.reason as never,
          description: String(body.description ?? ""),
          actionPayload: typeof body.actionPayload === "object" && body.actionPayload !== null
            ? body.actionPayload as Record<string, unknown>
            : undefined,
          agentId: typeof body.agentId === "string" ? body.agentId : undefined,
          taskId: typeof body.taskId === "string" ? body.taskId : undefined,
        }),
      );
      return reply.code(201).send({ approval });
    } catch (err) {
      if (
        err instanceof InvalidApprovalContextError ||
        err instanceof MalformedApprovalRequestError
      ) {
        return reply.code(400).send({ error: (err as Error).message });
      }
      throw err;
    }
  });

  app.post("/v1/admin/approvals/:id/resolve", async (req, reply) => {
    const ctx = req.tenantContext!;
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const { id } = req.params as { id: string };
    if (!UUID_RE.test(id)) return reply.code(400).send({ error: "invalid_id" });
    const body = req.body as Record<string, unknown> | undefined;
    const decision = body?.decision;
    if (!["approved", "rejected", "cancelled"].includes(decision as string)) {
      return reply.code(400).send({ error: "invalid_decision" });
    }
    try {
      const updated = await resolveApproval(
        getPrisma(),
        { tenantId: ctx.tenantId, orgId, requesterId: String(body?.approverId ?? "admin") },
        id,
        decision as "approved" | "rejected" | "cancelled",
        typeof body?.note === "string" ? body.note : undefined,
      );
      return reply.send({ approval: updated });
    } catch (err) {
      if (err instanceof ApprovalNotFoundError) return reply.code(404).send({ error: "not_found" });
      if (err instanceof ApprovalAlreadyResolvedError) return reply.code(409).send({ error: "already_resolved" });
      if (err instanceof ApprovalExpiredError) return reply.code(410).send({ error: "expired" });
      if (err instanceof InvalidApprovalContextError) return reply.code(403).send({ error: (err as Error).message });
      throw err;
    }
  });

  // ---- Metering / usage ----
  app.get("/v1/admin/usage", async (req, reply) => {
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const { agentId, taskId, service, since, until, limit, offset } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (agentId) where["agentId"] = agentId;
    if (taskId) where["taskId"] = taskId;
    if (service) where["service"] = service;
    if (since || until) {
      const range: Record<string, Date> = {};
      if (since) range["gte"] = new Date(since);
      if (until) range["lte"] = new Date(until);
      where["occurredAt"] = range;
    }
    const [records, agg] = await req.runScoped!((tx) =>
      Promise.all([
        tx.usageRecord.findMany({
          where,
          orderBy: { occurredAt: "desc" },
          take: Math.min(Number(limit ?? 50), 200),
          skip: Number(offset ?? 0),
        }),
        tx.usageRecord.aggregate({
          where,
          _sum: { units: true, estimatedCostUsd: true },
          _count: { id: true },
        }),
      ]),
    );
    return reply.send({
      records,
      aggregate: {
        count: agg._count.id,
        totalUnits: agg._sum.units ?? 0,
        totalEstimatedCostUsd: agg._sum.estimatedCostUsd ?? 0,
        currency: "USD",
      },
    });
  });

  // ---- Audit / observability logs ----
  app.get("/v1/admin/audit-logs", async (req, reply) => {
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const { service, eventType, severity, agentId, taskId, runId, sourceRef,
      correlationId, since, until, limit, offset } = req.query as Record<string, string | undefined>;

    const where: Record<string, unknown> = {};
    if (service) where["service"] = service;
    if (eventType) where["eventType"] = eventType;
    if (severity) where["severity"] = severity;
    if (agentId) where["agentId"] = agentId;
    if (taskId) where["taskId"] = taskId;
    if (runId) where["runId"] = runId;
    if (sourceRef) where["sourceRef"] = sourceRef;
    if (correlationId) where["correlationId"] = correlationId;
    if (since || until) {
      const range: Record<string, Date> = {};
      if (since) range["gte"] = new Date(since);
      if (until) range["lte"] = new Date(until);
      where["occurredAt"] = range;
    }
    const events = await req.runScoped!((tx) =>
      tx.auditLog.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        take: Math.min(Number(limit ?? 100), 500),
        skip: Number(offset ?? 0),
      }),
    );
    return reply.send({ events });
  });

  // ---- Jurisdiction / compliance configs ----
  app.get("/v1/admin/jurisdiction-configs", async (req, reply) => {
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const ctx = req.tenantContext!;
    const { countryCode, businessDomain, active } = req.query as Record<string, string | undefined>;
    const configs = await req.runScoped!((tx) =>
      listJurisdictionConfigs(tx, {
        tenantId: ctx.tenantId,
        orgId,
        countryCode: countryCode as never,
        businessDomain: businessDomain as never,
        active: active !== undefined ? active === "true" : undefined,
      }),
    );
    return reply.send({ configs });
  });

  app.post("/v1/admin/jurisdiction-configs", async (req, reply) => {
    const ctx = req.tenantContext!;
    const orgId = requireOrg(req, reply);
    if (!orgId) return reply;
    const body = req.body as Record<string, unknown> | undefined;
    if (!body) return reply.code(400).send({ error: "body_required" });
    const jCtx: JurisdictionContext = { tenantId: ctx.tenantId, orgId, actorId: "admin" };
    try {
      const config = await req.runScoped!((tx) =>
        createJurisdictionConfig(tx, jCtx, {
          countryCode: body.countryCode as never,
          businessDomain: body.businessDomain as never,
          region: typeof body.region === "string" ? body.region : null,
          profileOverrides: typeof body.profileOverrides === "object" && body.profileOverrides !== null
            ? (body.profileOverrides as never)
            : undefined,
        }),
      );
      return reply.code(201).send({ config });
    } catch (err) {
      if (
        err instanceof InvalidCountryCodeError ||
        err instanceof InvalidBusinessDomainError ||
        err instanceof MalformedJurisdictionConfigError ||
        err instanceof InvalidJurisdictionCtxError
      ) {
        return reply.code(400).send({ error: (err as Error).message });
      }
      throw err;
    }
  });
}

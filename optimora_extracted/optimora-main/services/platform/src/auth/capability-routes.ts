/**
 * Capability token routes (T-2.8): issuance + revocation (admin-guarded) and an
 * agent-action endpoint that authorizes a capability-token holder through the
 * existing authorize() flow.
 */
import type { FastifyInstance } from "fastify";
import { auditDecision, type AuditSink } from "@optimora/auth-core";
import { requirePermission } from "../rbac/guard.js";
import { statusForCode } from "../audit/sink.js";
import { authorizeAgentAction, issueCapability, revokeCapability } from "./capability.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function singleHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function registerCapabilityRoutes(
  app: FastifyInstance,
  authSecret: string,
  sink?: AuditSink,
): void {
  // Issue a capability token for an agent (admin only).
  app.post("/v1/agents/:agentId/capability-tokens", async (req, reply) => {
    const caller = await requirePermission(req, reply, authSecret, "capability:issue", sink);
    if (!caller) return reply;
    const { agentId } = req.params as { agentId: string };
    if (!UUID_RE.test(agentId)) return reply.code(400).send({ error: "invalid_agent_id" });
    const body = req.body as
      | { scopes?: unknown; taskId?: unknown; ttlSeconds?: unknown }
      | undefined;
    const scopes =
      Array.isArray(body?.scopes) && body!.scopes.every((s) => typeof s === "string")
        ? (body!.scopes as string[])
        : [];
    const taskId = typeof body?.taskId === "string" ? body.taskId : null;
    const ttl = typeof body?.ttlSeconds === "number" ? body.ttlSeconds : undefined;
    const ctx = req.tenantContext!;
    const issued = await req.runScoped!((tx) =>
      issueCapability(
        tx,
        authSecret,
        { agentId, tenantId: ctx.tenantId, orgId: ctx.orgId, taskId, scopes },
        ttl,
      ),
    );
    return reply.code(201).send(issued);
  });

  // Revoke a capability grant (admin only).
  app.post("/v1/capability-tokens/:jti/revoke", async (req, reply) => {
    const caller = await requirePermission(req, reply, authSecret, "capability:revoke", sink);
    if (!caller) return reply;
    const { jti } = req.params as { jti: string };
    const ok = await req.runScoped!((tx) => revokeCapability(tx, jti));
    if (!ok) return reply.code(404).send({ error: "grant_not_found" });
    return reply.send({ ok: true });
  });

  // Agent action: authorize a capability-token holder. The token is presented in
  // X-Optimora-Capability; tenant is resolved normally and cross-checked.
  app.post("/v1/agent/actions", async (req, reply) => {
    const ctx = req.tenantContext!;
    const token = singleHeader(req.headers["x-optimora-capability"]);
    if (!token) return reply.code(401).send({ error: "capability_token_required" });
    const body = req.body as
      | { action?: unknown; capability?: unknown; resourceType?: unknown; resourceId?: unknown }
      | undefined;
    if (typeof body?.action !== "string" || typeof body?.capability !== "string") {
      return reply.code(400).send({ error: "action_and_capability_required" });
    }
    const resource = {
      type: typeof body.resourceType === "string" ? body.resourceType : "resource",
      id: typeof body.resourceId === "string" ? body.resourceId : (ctx.orgId ?? ctx.tenantId),
    };
    const decision = await req.runScoped!((tx) =>
      authorizeAgentAction(
        tx,
        authSecret,
        token,
        ctx.tenantId,
        body.action as string,
        body.capability as string,
        resource,
      ),
    );
    // Audit the decision (raw reasons -> audit) and respond with a safe explanation.
    const { decision: finalDecision, explanation } = await auditDecision(decision, "agent", {
      sink,
      requestId: String(req.id),
      orgId: ctx.orgId,
    });
    if (finalDecision.allowed) {
      return reply.code(200).send({ allowed: true });
    }
    return reply.code(statusForCode(explanation.code)).send({
      allowed: false,
      error: explanation.code,
      message: explanation.message,
    });
  });
}

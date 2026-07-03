/**
 * Caller authentication + permission guard (T-2.6).
 *
 * Identifies the calling user from their access token, builds their principal
 * from persisted RBAC data, and authorizes the requested permission via the
 * Policy Engine. Cross-tenant tokens are rejected (readSession checks the token
 * tenant against the resolved tenant). Fail-closed throughout.
 */
import type { FastifyReply, FastifyRequest } from "fastify";
import { authorizeWithAudit, type AuditSink, type UserPrincipal } from "@optimora/auth-core";
import { readSession } from "../auth/service.js";
import { statusForCode } from "../audit/sink.js";
import { buildUserPrincipal } from "./service.js";

/** Build the calling user's principal from a Bearer JWT, or null if unauthenticated. */
export async function getCallerPrincipal(
  req: FastifyRequest,
  authSecret: string,
): Promise<UserPrincipal | null> {
  const ctx = req.tenantContext;
  if (!ctx?.orgId) return null;
  const auth = req.headers.authorization;
  const value = Array.isArray(auth) ? auth[0] : auth;
  // JWT access tokens only (API keys use the `Bearer opt_` form and resolve tenant directly).
  if (!value || !value.startsWith("Bearer ") || value.startsWith("Bearer opt_")) return null;
  const token = value.slice("Bearer ".length);
  const claims = await readSession(authSecret, ctx.tenantId, token);
  if (!claims) return null;
  return req.runScoped!((tx) => buildUserPrincipal(tx, claims.sub, ctx.orgId!, ctx.tenantId));
}

/**
 * Ensure the caller holds `permission` for the current org. Sends the
 * appropriate error response and returns null on failure; returns the caller
 * principal on success.
 */
export async function requirePermission(
  req: FastifyRequest,
  reply: FastifyReply,
  authSecret: string,
  permission: string,
  sink?: AuditSink,
): Promise<UserPrincipal | null> {
  const ctx = req.tenantContext;
  if (!ctx?.orgId) {
    await reply.code(400).send({ error: "org_required" });
    return null;
  }
  const caller = await getCallerPrincipal(req, authSecret);
  if (!caller) {
    await reply.code(401).send({ error: "authentication_required" });
    return null;
  }
  const { decision, explanation } = await authorizeWithAudit(
    {
      principal: caller,
      action: permission,
      resource: { type: "role", id: ctx.orgId, tenantId: ctx.tenantId, orgId: ctx.orgId },
      context: { requiredPermission: permission },
    },
    { sink, requestId: String(req.id), orgId: ctx.orgId },
  );
  if (!decision.allowed) {
    // Safe explanation only — raw reasons live in the audit trail, not the response.
    await reply.code(statusForCode(explanation.code)).send({
      error: explanation.code,
      message: explanation.message,
    });
    return null;
  }
  return caller;
}

/**
 * Capability tokens for agent principals (T-2.8).
 *
 * A capability token is a short-lived, scoped, tenant-aware, task-bound credential
 * issued to an agent. It is a self-contained JWE (verifiable with the shared
 * secret, no secret leakage) backed by a capability_grants row that is the
 * authoritative revocation/expiry record. Every agent action is authorized
 * through the existing authorize() flow (the agent's scopes become its effective
 * permissions), so over-scoped / cross-tenant / expired / revoked / malformed
 * tokens all fail closed.
 */
import { randomUUID } from "node:crypto";
import { encode, decode } from "@auth/core/jwt";
import { authorize, type AgentPrincipal, type Decision } from "@optimora/auth-core";
import type { TxClient } from "@optimora/db";

const CAPABILITY_SALT = "optimora.auth.capability";
export const CAPABILITY_TTL_SECONDS = 5 * 60; // short-lived: 5 minutes

export interface CapabilityClaims {
  /**
   * Grant id — primary key of the capability_grants row. Named `gid` (not `jti`)
   * because @auth/core auto-generates/overwrites the standard `jti` claim.
   */
  gid: string;
  /** Agent id (subject). */
  sub: string;
  tenantId: string;
  orgId: string | null;
  /** Task this token is bound to. */
  taskId: string | null;
  /** Granted capabilities (permission keys) for the task. */
  scopes: string[];
  type: "capability";
}

export interface IssueCapabilityInput {
  agentId: string;
  tenantId: string;
  orgId?: string | null;
  taskId?: string | null;
  scopes: string[];
}

export interface IssuedCapability {
  token: string;
  jti: string;
  expiresAt: Date;
}

/**
 * Issue a capability token: persist the grant (for revocation) and return the
 * signed token. Runs on a tenant-scoped tx so the grant is RLS-isolated.
 */
export async function issueCapability(
  tx: TxClient,
  secret: string,
  input: IssueCapabilityInput,
  ttlSeconds: number = CAPABILITY_TTL_SECONDS,
): Promise<IssuedCapability> {
  const gid = randomUUID();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  await tx.capabilityGrant.create({
    data: {
      id: gid,
      agentId: input.agentId,
      tenantId: input.tenantId,
      orgId: input.orgId ?? null,
      taskId: input.taskId ?? null,
      scopes: input.scopes,
      expiresAt,
    },
  });

  const claims: CapabilityClaims = {
    gid,
    sub: input.agentId,
    tenantId: input.tenantId,
    orgId: input.orgId ?? null,
    taskId: input.taskId ?? null,
    scopes: input.scopes,
    type: "capability",
  };
  const token = await encode<CapabilityClaims>({
    token: claims,
    secret,
    salt: CAPABILITY_SALT,
    maxAge: ttlSeconds,
  });
  return { token, jti: gid, expiresAt };
}

/** Revoke a capability grant. Returns true if a live grant was revoked. */
export async function revokeCapability(tx: TxClient, jti: string): Promise<boolean> {
  const res = await tx.capabilityGrant.updateMany({
    where: { id: jti, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return res.count > 0;
}

/** Decode + structurally validate a capability token (no DB). Null = fail closed. */
export async function decodeCapabilityToken(
  secret: string,
  token: string,
): Promise<CapabilityClaims | null> {
  try {
    const claims = await decode<CapabilityClaims>({ token, secret, salt: CAPABILITY_SALT });
    if (
      !claims ||
      claims.type !== "capability" ||
      !claims.gid ||
      !claims.sub ||
      !claims.tenantId ||
      !Array.isArray(claims.scopes)
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

/**
 * Verify a capability token end-to-end: decode (handles expiry/malformed) then
 * confirm the grant exists, is not revoked, not expired, and belongs to the
 * token's tenant. Null on any failure (fail closed).
 */
export async function verifyCapability(
  tx: TxClient,
  secret: string,
  token: string,
): Promise<CapabilityClaims | null> {
  const claims = await decodeCapabilityToken(secret, token);
  if (!claims) return null;

  const grant = await tx.capabilityGrant.findUnique({
    where: { id: claims.gid },
    select: { revokedAt: true, expiresAt: true, tenantId: true },
  });
  if (!grant) return null; // unknown jti -> fail closed
  if (grant.revokedAt) return null;
  if (grant.expiresAt.getTime() <= Date.now()) return null;
  if (grant.tenantId !== claims.tenantId) return null;
  return claims;
}

/** Build an AgentPrincipal from capability claims: scopes are the effective permissions. */
export function agentPrincipalFromCapability(claims: CapabilityClaims): AgentPrincipal {
  return {
    type: "agent",
    id: claims.sub,
    tenantId: claims.tenantId,
    orgId: claims.orgId,
    roles: [], // task-bound least privilege: no broad roles, only scoped capabilities
    scopes: claims.scopes,
    permissions: claims.scopes,
  };
}

export interface AgentActionResource {
  type: string;
  id: string;
}

/**
 * Authorize an agent action presented with a capability token, scoped to the
 * resolved tenant. Verifies the token, enforces cross-tenant isolation, then
 * runs the existing authorize() flow with the agent principal. Always returns a
 * structured Decision (deny on any verification failure).
 */
export async function authorizeAgentAction(
  tx: TxClient,
  secret: string,
  token: string,
  resolvedTenantId: string,
  action: string,
  requiredCapability: string,
  resource: AgentActionResource,
): Promise<Decision> {
  const failClosed = (reason: string, principalId = "unknown"): Decision => ({
    effect: "deny",
    allowed: false,
    reasons: [reason],
    determiningPolicies: [],
    metadata: {
      principalId,
      principalType: "agent",
      tenantId: resolvedTenantId,
      action,
      resourceType: resource.type,
      resourceId: resource.id,
      engine: "capability",
      evaluatedAt: new Date().toISOString(),
    },
  });

  // Decode first (no DB) so tenant isolation is reported distinctly, even though
  // RLS would also hide a cross-tenant grant.
  const decoded = await decodeCapabilityToken(secret, token);
  if (!decoded) return failClosed("invalid_capability_token");
  if (decoded.tenantId !== resolvedTenantId)
    return failClosed("cross_tenant_capability", decoded.sub);

  // Confirm the grant is live (exists, not revoked, not expired) in this tenant.
  const claims = await verifyCapability(tx, secret, token);
  if (!claims) return failClosed("invalid_capability_token", decoded.sub);

  return authorize({
    principal: agentPrincipalFromCapability(claims),
    action,
    resource: {
      type: resource.type,
      id: resource.id,
      tenantId: resolvedTenantId,
      orgId: claims.orgId,
    },
    context: { requiredPermission: requiredCapability },
  });
}

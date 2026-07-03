/**
 * API keys (T-2.4) — scoped, hashed machine credentials.
 *
 * Format: `opt_<prefix>.<secret>` where `prefix` is a non-secret lookup id and
 * `secret` is high-entropy. Only the prefix and SHA-256(secret) are stored, so a
 * leaked database row cannot reconstruct a usable key. Keys are org-scoped (and
 * thus tenant-scoped) and authenticate machine callers via the resolver.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { PrismaClient, TxClient } from "@optimora/db";

const KEY_RE = /^opt_([0-9a-f]{12})\.([A-Za-z0-9_-]{20,})$/;

export interface GeneratedKey {
  plaintext: string;
  prefix: string;
  secretHash: string;
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function generateApiKey(): GeneratedKey {
  const prefix = randomBytes(6).toString("hex"); // 12 hex chars
  const secret = randomBytes(32).toString("base64url");
  return { plaintext: `opt_${prefix}.${secret}`, prefix, secretHash: hashSecret(secret) };
}

export function parseApiKey(raw: string): { prefix: string; secret: string } | null {
  const m = KEY_RE.exec(raw.trim());
  return m ? { prefix: m[1]!, secret: m[2]! } : null;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface CreatedApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  plaintext: string;
}

/** Create an API key for the current org; the plaintext is returned ONCE. */
export async function createApiKey(
  tx: TxClient,
  orgId: string,
  name: string,
  scopes: string[] = [],
): Promise<CreatedApiKey> {
  const { plaintext, prefix, secretHash } = generateApiKey();
  const row = await tx.apiKey.create({
    data: { organizationId: orgId, name, prefix, hashedKey: secretHash, scopes },
    select: { id: true, name: true, prefix: true, scopes: true },
  });
  return { ...row, plaintext };
}

export async function listApiKeys(tx: TxClient): Promise<ApiKeyRecord[]> {
  return tx.apiKey.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });
}

/** Revoke a key; returns true if a live key was revoked. */
export async function revokeApiKey(tx: TxClient, id: string): Promise<boolean> {
  const res = await tx.apiKey.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return res.count > 0;
}

export interface ApiKeyIdentity {
  tenantId: string;
  orgId: string;
  keyId: string;
  scopes: string[];
}

/**
 * Verify a presented raw key against the store (privileged, pre-auth routing
 * read). Returns the org/tenant identity or null (fail-closed). Bumps lastUsedAt.
 */
export async function verifyApiKeyRaw(
  sys: PrismaClient,
  raw: string,
): Promise<ApiKeyIdentity | null> {
  const parsed = parseApiKey(raw);
  if (!parsed) return null;

  const row = await sys.apiKey.findUnique({
    where: { prefix: parsed.prefix },
    select: {
      id: true,
      hashedKey: true,
      revokedAt: true,
      scopes: true,
      organizationId: true,
      organization: { select: { tenantId: true } },
    },
  });
  if (!row || row.revokedAt) return null;

  const expected = Buffer.from(row.hashedKey, "hex");
  const actual = Buffer.from(hashSecret(parsed.secret), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  // Best-effort usage stamp; never blocks auth.
  void sys.apiKey
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    tenantId: row.organization.tenantId,
    orgId: row.organizationId,
    keyId: row.id,
    scopes: row.scopes,
  };
}

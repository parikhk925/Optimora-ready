/**
 * Token service (T-2.1).
 * - Access token: short-lived JWT (JWE via @auth/core/jwt), carries the user +
 *   tenant claims. Self-contained; verified by decoding with the shared secret.
 * - Refresh token: opaque high-entropy string; only its SHA-256 hash is stored,
 *   enabling rotation + revocation (see auth/service.ts).
 */
import { createHash, randomBytes } from "node:crypto";
import { encode, decode } from "@auth/core/jwt";

const ACCESS_SALT = "optimora.auth.access";
export const ACCESS_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const MAGIC_LINK_TTL_SECONDS = 15 * 60; // 15 minutes

export interface AccessClaims {
  sub: string; // user id
  email: string;
  tenantId: string;
  type: "access";
}

export async function issueAccessToken(
  secret: string,
  claims: Omit<AccessClaims, "type">,
): Promise<string> {
  return encode<AccessClaims>({
    token: { ...claims, type: "access" },
    secret,
    salt: ACCESS_SALT,
    maxAge: ACCESS_TTL_SECONDS,
  });
}

/** Decode + validate an access token. Returns null on any failure (fail-closed). */
export async function verifyAccessToken(
  secret: string,
  token: string,
): Promise<AccessClaims | null> {
  try {
    const claims = await decode<AccessClaims>({ token, secret, salt: ACCESS_SALT });
    if (!claims || claims.type !== "access" || !claims.sub || !claims.tenantId) return null;
    return claims;
  } catch {
    return null;
  }
}

/** A fresh opaque refresh token plus the hash to persist. */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

/** A fresh opaque magic-link token plus the hash to persist. */
export function generateMagicToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

/** SHA-256 hex of an opaque token (what we store; never the raw token). */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

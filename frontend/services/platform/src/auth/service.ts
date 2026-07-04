/**
 * Auth service (T-2.1) — magic-link login + JWT/refresh session lifecycle.
 *
 * All DB work runs on a tenant-scoped TxClient (RLS), so verification tokens and
 * sessions are physically isolated per tenant. Raw tokens are never stored; only
 * SHA-256 hashes. The session model is provider-agnostic: OAuth providers will
 * reuse issueSession()/refresh()/logout() unchanged.
 */
import type { TxClient } from "@optimora/db";
import type { EmailSender } from "./providers.js";
import {
  generateMagicToken,
  generateRefreshToken,
  hashToken,
  issueAccessToken,
  MAGIC_LINK_TTL_SECONDS,
  REFRESH_TTL_SECONDS,
  verifyAccessToken,
  type AccessClaims,
} from "./tokens.js";

export class AuthError extends Error {}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface AuthDeps {
  secret: string;
  sender: EmailSender;
  /** Base URL used to build the magic link (brand-domain aware). */
  baseUrl: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Begin a magic-link login. Always succeeds from the caller's perspective (no
 * account enumeration); a verification token is recorded and "emailed".
 */
export async function requestMagicLink(
  tx: TxClient,
  deps: AuthDeps,
  tenantId: string,
  emailRaw: string,
): Promise<void> {
  const email = normalizeEmail(emailRaw);
  if (!EMAIL_RE.test(email)) throw new AuthError("invalid_email");

  const { token, hash } = generateMagicToken();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_SECONDS * 1000);

  await tx.verificationToken.create({
    data: { tenantId, identifier: email, tokenHash: hash, expiresAt },
  });

  const url = `${deps.baseUrl}/login?token=${encodeURIComponent(token)}`;
  await deps.sender.sendMagicLink({ to: email, url, token, tenantId });
}

async function issueSession(
  tx: TxClient,
  secret: string,
  tenantId: string,
  user: { id: string; email: string },
): Promise<IssuedTokens> {
  const accessToken = await issueAccessToken(secret, {
    sub: user.id,
    email: user.email,
    tenantId,
  });
  const refresh = generateRefreshToken();
  await tx.authSession.create({
    data: {
      userId: user.id,
      tenantId,
      refreshHash: refresh.hash,
      expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
    },
  });
  return { accessToken, refreshToken: refresh.token, user };
}

/** Consume a magic-link token, find/create the user, and issue a session. */
export async function verifyMagicLink(
  tx: TxClient,
  deps: AuthDeps,
  tenantId: string,
  rawToken: string,
): Promise<IssuedTokens> {
  const tokenHash = hashToken(rawToken);
  const record = await tx.verificationToken.findUnique({ where: { tokenHash } });
  if (!record || record.consumedAt || record.expiresAt.getTime() < Date.now()) {
    throw new AuthError("invalid_token");
  }
  await tx.verificationToken.update({
    where: { tokenHash },
    data: { consumedAt: new Date() },
  });

  return authenticateEmail(tx, deps.secret, tenantId, record.identifier);
}

/**
 * Find-or-create a user by verified email and issue a session. Shared by
 * magic-link verification and OAuth (where the email is already proven by the
 * upstream identity provider). The caller is responsible for verifying that
 * the email is genuinely authenticated before calling this.
 */
export async function authenticateEmail(
  tx: TxClient,
  secret: string,
  tenantId: string,
  emailRaw: string,
): Promise<IssuedTokens> {
  const email = normalizeEmail(emailRaw);
  if (!EMAIL_RE.test(email)) throw new AuthError("invalid_email");
  const user =
    (await tx.user.findUnique({ where: { email }, select: { id: true, email: true } })) ??
    (await tx.user.create({ data: { email }, select: { id: true, email: true } }));

  return issueSession(tx, secret, tenantId, user);
}

/** Rotate a refresh token: revoke the presented one, issue a fresh pair. */
export async function refreshSession(
  tx: TxClient,
  deps: AuthDeps,
  tenantId: string,
  rawRefresh: string,
): Promise<IssuedTokens> {
  const refreshHash = hashToken(rawRefresh);
  const session = await tx.authSession.findUnique({ where: { refreshHash } });
  if (
    !session ||
    session.revokedAt ||
    session.rotatedTo ||
    session.tenantId !== tenantId ||
    session.expiresAt.getTime() < Date.now()
  ) {
    throw new AuthError("invalid_refresh");
  }

  const user = await tx.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true },
  });
  if (!user) throw new AuthError("invalid_refresh");

  const issued = await issueSession(tx, deps.secret, tenantId, user);
  const newSession = await tx.authSession.findUnique({
    where: { refreshHash: hashToken(issued.refreshToken) },
    select: { id: true },
  });
  await tx.authSession.update({
    where: { refreshHash },
    data: { revokedAt: new Date(), rotatedTo: newSession?.id ?? null },
  });
  return issued;
}

/** Revoke the session for a refresh token (idempotent). */
export async function logout(tx: TxClient, rawRefresh: string): Promise<void> {
  const refreshHash = hashToken(rawRefresh);
  await tx.authSession.updateMany({
    where: { refreshHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Validate an access token for the resolved tenant. Returns null (fail-closed). */
export async function readSession(
  secret: string,
  tenantId: string,
  accessToken: string,
): Promise<AccessClaims | null> {
  const claims = await verifyAccessToken(secret, accessToken);
  if (!claims || claims.tenantId !== tenantId) return null;
  return claims;
}

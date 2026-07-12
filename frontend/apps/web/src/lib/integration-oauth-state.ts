import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

const VERSION = "v1";
const STATE_BYTES = 24;
export const INTEGRATION_OAUTH_STATE_TTL_SECONDS = 10 * 60;

export interface IntegrationOAuthContext {
  tenantId: string;
  orgId: string;
  actorId?: string;
}

export interface CreatedIntegrationOAuthState {
  state: string;
  cookieValue: string;
}

function getStateSecret(): string | null {
  return process.env.INTERNAL_AUTH_SECRET ?? process.env.AUTH_SECRET ?? null;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function parseContext(value: unknown): IntegrationOAuthContext | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.tenantId !== "string" || typeof record.orgId !== "string") return null;
  return {
    tenantId: record.tenantId,
    orgId: record.orgId,
    actorId: typeof record.actorId === "string" ? record.actorId : undefined,
  };
}

export function createIntegrationOAuthState(ctx: IntegrationOAuthContext): CreatedIntegrationOAuthState | null {
  const secret = getStateSecret();
  if (!secret) return null;

  const state = randomBytes(STATE_BYTES).toString("base64url");
  const payload = Buffer.from(JSON.stringify(ctx)).toString("base64url");
  const signedValue = `${VERSION}.${state}.${payload}`;
  const signature = sign(signedValue, secret);
  return {
    state,
    cookieValue: `${signedValue}.${signature}`,
  };
}

export function readIntegrationOAuthState(req: NextRequest, cookieName: string, state: string): IntegrationOAuthContext | null {
  const secret = getStateSecret();
  if (!secret) return null;

  const value = req.cookies.get(cookieName)?.value;
  if (!value) return null;

  const [version, expectedState, payload, signature] = value.split(".");
  if (version !== VERSION || !expectedState || !payload || !signature) return null;
  if (!safeEqual(expectedState, state)) return null;

  const signedValue = `${version}.${expectedState}.${payload}`;
  if (!safeEqual(signature, sign(signedValue, secret))) return null;

  try {
    return parseContext(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}

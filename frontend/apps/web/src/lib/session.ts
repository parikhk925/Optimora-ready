/**
 * Server-side session utilities for Next.js Route Handlers and Server Components.
 *
 * Access tokens are stored in a short-lived httpOnly cookie (`optimora_access`)
 * set by this layer - the token never touches client JS bundles.
 *
 * The backend refresh cookie (`optimora_refresh`) is maintained by the platform
 * service and is forwarded transparently through the /api/auth/* proxy routes.
 */
import { cookies } from "next/headers";
import { getTenantContext } from "./auth";
import {
  DEV_ACCESS_TOKEN,
  canUseDevAccessToken,
  isLocalDevStubEnabled,
  isPlatformAuthConfigured,
} from "./auth-mode";

const ACCESS_COOKIE = "optimora_access";
const ACCESS_TTL_SECONDS = 14 * 60; // slightly under backend 15-min TTL

export interface SessionUser {
  id: string;
  email: string;
}

export interface ServerSession {
  user: SessionUser;
  tenantId: string;
  orgId: string;
  /** Opaque - never sent to the browser directly. Used server-side only. */
  accessToken: string;
  /** True only for the local-development stub session (never in production). */
  dev?: boolean;
}

/** Read the access token from the server-side httpOnly cookie. Returns null if absent. */
export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

/** Persist an access token in a short-lived httpOnly cookie. Server action / Route Handler only. */
export async function setAccessCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_TTL_SECONDS,
  });
}

/** Remove the access cookie on logout. */
export async function clearAccessCookie(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
}

/**
 * Verify the stored access token against the platform /v1/auth/session endpoint.
 * Returns null (fail-closed) on any error, missing token, or network failure.
 *
 * Called from middleware and Server Components. Never called client-side.
 */
export async function getServerSession(): Promise<ServerSession | null> {
  const token = await getAccessToken();
  if (!token) return null;

  if (canUseDevAccessToken(token)) return getDevSession();
  if (!isPlatformAuthConfigured()) return null;

  const baseUrl = process.env.PLATFORM_API_URL;
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? "";

  try {
    const res = await fetch(`${baseUrl}/v1/auth/session`, {
      headers: {
        authorization: `Bearer ${token}`,
        "x-optimora-tenant": tenantId,
        accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: SessionUser; tenantId?: string; orgId?: string };
    if (!data.user || !data.tenantId) return null;
    return {
      user: data.user,
      tenantId: data.tenantId,
      orgId: data.orgId ?? getTenantContext().orgId,
      accessToken: token,
    };
  } catch {
    return null;
  }
}

/**
 * Try to silently refresh the access token using the httpOnly refresh cookie.
 * Called server-side when getServerSession returns null but we have a refresh cookie.
 * Returns new ServerSession or null.
 */
export async function tryRefreshSession(): Promise<ServerSession | null> {
  if (!isPlatformAuthConfigured()) return null;

  const baseUrl = process.env.PLATFORM_API_URL;
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? "";

  // Forward the refresh cookie from the incoming request
  const store = await cookies();
  const refreshCookie = store.get("optimora_refresh")?.value;
  if (!refreshCookie) return null;

  try {
    const res = await fetch(`${baseUrl}/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "x-optimora-tenant": tenantId,
        "content-type": "application/json",
        cookie: `optimora_refresh=${encodeURIComponent(refreshCookie)}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken?: string; user?: SessionUser };
    if (!data.accessToken || !data.user) return null;
    await setAccessCookie(data.accessToken);
    return {
      user: data.user,
      tenantId,
      orgId: getTenantContext().orgId,
      accessToken: data.accessToken,
    };
  } catch {
    return null;
  }
}

/**
 * Get or refresh the session. Used in Server Components and middleware.
 * Returns null if the user is definitively unauthenticated.
 */
export async function requireSession(): Promise<ServerSession | null> {
  const session = await getServerSession();
  if (session) return session;
  const refreshed = await tryRefreshSession();
  if (refreshed) return refreshed;
  return isLocalDevStubEnabled() ? getDevSession() : null;
}

/**
 * In local development without platform auth, return a safe stub session so the
 * UI renders without a live backend.
 */
export function getDevSession(): ServerSession {
  return {
    user: { id: "dev-user", email: "dev@optimora.local" },
    tenantId: getTenantContext().tenantId,
    orgId: getTenantContext().orgId,
    accessToken: DEV_ACCESS_TOKEN,
    dev: true,
  };
}

export function isAuthConfigured(): boolean {
  return isPlatformAuthConfigured();
}

export function getAutomationContextFromSession(session: ServerSession | null | undefined) {
  const fallback = getTenantContext();
  return {
    tenantId: session?.tenantId ?? fallback.tenantId,
    orgId: session?.orgId ?? fallback.orgId,
    actorId: session?.user.id,
  };
}

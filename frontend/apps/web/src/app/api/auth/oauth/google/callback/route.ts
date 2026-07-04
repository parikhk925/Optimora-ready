/**
 * GET /api/auth/oauth/google/callback
 * Completes Google sign-in: validates state, exchanges the code for tokens,
 * reads the verified email from Google's userinfo endpoint, then hands that
 * email to the platform's trusted /v1/auth/oauth/exchange endpoint (guarded by
 * INTERNAL_AUTH_SECRET) to mint a real session. Sets the access cookie and
 * forwards the platform's refresh cookie, then redirects into the app.
 */
import { NextRequest, NextResponse } from "next/server";
import { setAccessCookie } from "@/lib/session";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const OAUTH_STATE_COOKIE = "optimora_oauth_state";

const BASE = process.env.PLATFORM_API_URL ?? "";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "";

function loginError(req: NextRequest, reason: string) {
  const url = new URL("/login", req.nextUrl.origin);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError) return loginError(req, oauthError);
  if (!code || !state) return loginError(req, "missing_code_or_state");

  // Validate CSRF state against the cookie set in /start.
  const stateCookie = req.cookies.get(OAUTH_STATE_COOKIE)?.value ?? "";
  const [expectedState, nextPathRaw] = stateCookie.split(":");
  if (!expectedState || expectedState !== state) {
    return loginError(req, "invalid_state");
  }
  const nextPath = nextPathRaw && nextPathRaw.startsWith("/") ? nextPathRaw : "/dashboard";

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  const internalSecret = process.env.INTERNAL_AUTH_SECRET;
  if (!clientId || !clientSecret || !redirectUri || !BASE || !internalSecret) {
    return loginError(req, "oauth_not_configured");
  }

  try {
    // 1. Exchange the authorization code for tokens.
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return loginError(req, "token_exchange_failed");
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) return loginError(req, "no_access_token");

    // 2. Read the verified email/profile from Google.
    const infoRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!infoRes.ok) return loginError(req, "userinfo_failed");
    const info = (await infoRes.json()) as { email?: string; email_verified?: boolean };
    if (!info.email || info.email_verified === false) {
      return loginError(req, "email_unverified");
    }

    // 3. Trade the verified email for a real Optimora session (server-to-server).
    const exchange = await fetch(`${BASE}/v1/auth/oauth/exchange`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-optimora-tenant": TENANT_ID,
        "x-internal-auth": internalSecret,
      },
      body: JSON.stringify({ email: info.email }),
    });
    if (!exchange.ok) return loginError(req, "session_exchange_failed");
    const data = (await exchange.json()) as { accessToken: string };

    // 4. Set our own cookies and redirect into the app.
    await setAccessCookie(data.accessToken);
    const res = NextResponse.redirect(new URL(nextPath, req.nextUrl.origin));
    const setCookie = exchange.headers.get("set-cookie");
    if (setCookie) res.headers.set("set-cookie", setCookie);
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  } catch {
    return loginError(req, "oauth_error");
  }
}

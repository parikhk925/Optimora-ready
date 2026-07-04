/**
 * GET /api/auth/oauth/google/start
 * Begins Google sign-in by redirecting to Google's OAuth consent screen with
 * the openid/email/profile scopes. A random state value is stored in a
 * short-lived httpOnly cookie for CSRF protection and checked in the callback.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_STATE_COOKIE = "optimora_oauth_state";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "oauth_not_configured", message: "GOOGLE_CLIENT_ID / GOOGLE_OAUTH_REDIRECT_URI are not set." },
      { status: 503 },
    );
  }

  const nextPath = req.nextUrl.searchParams.get("next") ?? "/dashboard";
  const state = randomBytes(24).toString("base64url");

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(url.toString());
  res.cookies.set(OAUTH_STATE_COOKIE, `${state}:${nextPath}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  return res;
}

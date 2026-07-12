/**
 * GET /api/integrations/gmail/connect
 * Starts the Gmail OAuth flow by redirecting to Google's consent screen.
 * Requires GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI to be configured.
 */
import { NextResponse } from "next/server";
import { requireSession, getAutomationContextFromSession } from "@/lib/session";
import { createIntegrationOAuthState, INTEGRATION_OAUTH_STATE_TTL_SECONDS } from "@/lib/integration-oauth-state";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const GMAIL_OAUTH_STATE_COOKIE = "optimora_gmail_oauth_state";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "gmail_not_configured", message: "GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI are not set." },
      { status: 503 },
    );
  }

  const ctx = getAutomationContextFromSession(session);
  const oauthState = createIntegrationOAuthState({ tenantId: ctx.tenantId, orgId: ctx.orgId, actorId: ctx.actorId });
  if (!oauthState) {
    return NextResponse.json(
      { error: "oauth_state_not_configured", message: "INTERNAL_AUTH_SECRET or AUTH_SECRET must be set." },
      { status: 503 },
    );
  }

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_SEND_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", oauthState.state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set(GMAIL_OAUTH_STATE_COOKIE, oauthState.cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: INTEGRATION_OAUTH_STATE_TTL_SECONDS,
  });
  return res;
}

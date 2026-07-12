/**
 * GET /api/integrations/google-calendar/connect
 * Starts the Google Calendar OAuth flow by redirecting to Google's consent
 * screen. Reuses the same OAuth client as Gmail/sign-in (GOOGLE_CLIENT_ID),
 * with its own redirect URI since Google ties redirect URIs to a single
 * registered value per request.
 */
import { NextResponse } from "next/server";
import { requireSession, getAutomationContextFromSession } from "@/lib/session";
import { createIntegrationOAuthState, INTEGRATION_OAUTH_STATE_TTL_SECONDS } from "@/lib/integration-oauth-state";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const CALENDAR_OAUTH_STATE_COOKIE = "optimora_calendar_oauth_state";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "google_calendar_not_configured", message: "GOOGLE_CLIENT_ID / GOOGLE_CALENDAR_REDIRECT_URI are not set." },
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
  url.searchParams.set("scope", CALENDAR_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", oauthState.state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set(CALENDAR_OAUTH_STATE_COOKIE, oauthState.cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: INTEGRATION_OAUTH_STATE_TTL_SECONDS,
  });
  return res;
}

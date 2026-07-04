/**
 * GET /api/integrations/google-calendar/connect
 * Starts the Google Calendar OAuth flow by redirecting to Google's consent
 * screen. Reuses the same OAuth client as Gmail/sign-in (GOOGLE_CLIENT_ID),
 * with its own redirect URI since Google ties redirect URIs to a single
 * registered value per request.
 */
import { NextResponse } from "next/server";
import { requireSession, getAutomationContextFromSession } from "@/lib/session";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

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
  const state = Buffer.from(JSON.stringify({ tenantId: ctx.tenantId, orgId: ctx.orgId, actorId: ctx.actorId })).toString("base64url");

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", CALENDAR_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}

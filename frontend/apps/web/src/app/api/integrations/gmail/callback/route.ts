/**
 * GET /api/integrations/gmail/callback
 * Exchanges the OAuth authorization code for tokens and persists the
 * connection via connectGmailIntegration. Redirects back to the dashboard
 * integrations page with a success/error query param.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectGmailIntegration, type OrgContext } from "@/lib/automation-data";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function redirectToIntegrations(req: NextRequest, status: "connected" | "error", message?: string) {
  const url = new URL("/dashboard/integrations", req.nextUrl.origin);
  url.searchParams.set("gmail", status);
  if (message) url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError) return redirectToIntegrations(req, "error", oauthError);
  if (!code || !state) return redirectToIntegrations(req, "error", "missing_code_or_state");

  let ctx: OrgContext;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as Partial<OrgContext>;
    if (!decoded.tenantId || !decoded.orgId) throw new Error("invalid state payload");
    ctx = { tenantId: decoded.tenantId, orgId: decoded.orgId, actorId: decoded.actorId };
  } catch {
    return redirectToIntegrations(req, "error", "invalid_state");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return redirectToIntegrations(req, "error", "gmail_not_configured");
  }

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
  if (!tokenRes.ok) {
    return redirectToIntegrations(req, "error", `token_exchange_failed_${tokenRes.status}`);
  }
  const tokenData = (await tokenRes.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!tokenData.access_token) {
    return redirectToIntegrations(req, "error", "no_access_token");
  }

  const result = await connectGmailIntegration(ctx, {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000).toISOString(),
  });
  if (!result.ok) return redirectToIntegrations(req, "error", result.error ?? "connect_failed");

  return redirectToIntegrations(req, "connected");
}

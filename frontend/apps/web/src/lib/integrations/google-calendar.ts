/**
 * Google Calendar integration — real implementation once a workspace has
 * connected via the OAuth flow at /api/integrations/google-calendar/connect.
 * Tokens are read from ctx.configSnapshot (populated by connectGoogleCalendarIntegration
 * in automation-data.ts). No credentialRef/configSnapshot present means the
 * workspace hasn't connected Calendar yet, so every action reports
 * "requires_setup" — never a faked success.
 */
import type { IntegrationActionContext, IntegrationActionResult, IntegrationProvider } from "./base";

interface CalendarTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
}

function readTokens(ctx: IntegrationActionContext): CalendarTokens | undefined {
  const snapshot = ctx.configSnapshot as Partial<CalendarTokens> | undefined;
  if (!snapshot?.accessToken) return undefined;
  return { accessToken: snapshot.accessToken, refreshToken: snapshot.refreshToken, expiresAt: snapshot.expiresAt ?? "" };
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
  };
}

export const googleCalendarIntegration: IntegrationProvider = {
  key: "google-calendar",

  async executeAction(ctx: IntegrationActionContext, action: string, payload: Record<string, unknown>): Promise<IntegrationActionResult> {
    if (action !== "create_event") {
      return { status: "failed", output: {}, label: "Google Calendar", error: `Unknown Google Calendar action: ${action}` };
    }
    const tokens = readTokens(ctx);
    if (!tokens) {
      return {
        status: "requires_setup",
        output: {},
        label: "Google Calendar (not connected — connect via Settings → Integrations)",
        error: "Workspace has not completed Google Calendar OAuth.",
      };
    }

    const summary = (payload.summary as string | undefined) ?? "Optimora interview";
    const description = (payload.description as string | undefined) ?? "";
    const startIso = payload.startTime as string | undefined;
    const endIso = payload.endTime as string | undefined;
    const attendeeEmail = payload.attendeeEmail as string | undefined;
    if (!startIso || !endIso) {
      return { status: "failed", output: {}, label: "Google Calendar", error: "create_event requires `startTime` and `endTime` (ISO 8601)." };
    }

    let accessToken = tokens.accessToken;
    const expired = tokens.expiresAt ? new Date(tokens.expiresAt).getTime() < Date.now() : false;
    if (expired && tokens.refreshToken) {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      if (refreshed) accessToken = refreshed.accessToken;
    }

    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        summary,
        description,
        start: { dateTime: startIso },
        end: { dateTime: endIso },
        attendees: attendeeEmail ? [{ email: attendeeEmail }] : undefined,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      return { status: "failed", output: {}, label: "Google Calendar", error: `Calendar API request failed (${res.status}): ${errorText}` };
    }
    const data = (await res.json()) as { id?: string; htmlLink?: string };
    return {
      status: "real",
      output: { summary, startTime: startIso, endTime: endIso, eventId: data.id, eventUrl: data.htmlLink },
      label: "Google Calendar (event created)",
    };
  },

  async testConnection(ctx: IntegrationActionContext): Promise<IntegrationActionResult> {
    const tokens = readTokens(ctx);
    if (!tokens) {
      return { status: "requires_setup", output: { connected: false }, label: "Google Calendar (not connected)" };
    }
    return { status: "real", output: { connected: true }, label: "Google Calendar (connected)" };
  },
};

/**
 * Gmail integration — real implementation once a workspace has connected via
 * the OAuth flow at /api/integrations/gmail/connect. Tokens are read from
 * ctx.configSnapshot (populated by the workflow engine from
 * WorkspaceIntegration.configSnapshot — see connectGmailIntegration in
 * automation-data.ts). No credentialRef/configSnapshot present means the
 * workspace hasn't connected Gmail yet, so every action reports
 * "requires_setup" — never a faked success.
 */
import type { IntegrationActionContext, IntegrationActionResult, IntegrationProvider } from "./base";

interface GmailTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
}

function readTokens(ctx: IntegrationActionContext): GmailTokens | undefined {
  const snapshot = ctx.configSnapshot as Partial<GmailTokens> | undefined;
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

function buildMimeMessage(to: string, subject: string, body: string): string {
  const message = `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${body}`;
  return Buffer.from(message).toString("base64url");
}

export const gmailIntegration: IntegrationProvider = {
  key: "gmail",

  async executeAction(ctx: IntegrationActionContext, action: string, payload: Record<string, unknown>): Promise<IntegrationActionResult> {
    if (action !== "send_email") {
      return { status: "failed", output: {}, label: "Gmail", error: `Unknown Gmail action: ${action}` };
    }
    const tokens = readTokens(ctx);
    if (!tokens) {
      return {
        status: "requires_setup",
        output: {},
        label: "Gmail (not connected — connect via Settings → Integrations)",
        error: "Workspace has not completed Gmail OAuth.",
      };
    }

    const to = (payload.to as string | undefined) ?? "";
    const subject = (payload.subject as string | undefined) ?? "Optimora automation notification";
    const body = (payload.body as string | undefined) ?? "(no body provided)";
    if (!to) {
      return { status: "failed", output: {}, label: "Gmail", error: "send_email requires a `to` address." };
    }

    let accessToken = tokens.accessToken;
    const expired = tokens.expiresAt ? new Date(tokens.expiresAt).getTime() < Date.now() : false;
    if (expired && tokens.refreshToken) {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      if (refreshed) accessToken = refreshed.accessToken;
    }

    const res = await fetch("https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "message/rfc822",
      },
      body: buildMimeMessage(to, subject, body),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      return { status: "failed", output: {}, label: "Gmail", error: `Gmail API request failed (${res.status}): ${errorText}` };
    }
    const data = (await res.json()) as { id?: string };
    return { status: "real", output: { to, subject, sent: true, messageId: data.id }, label: "Gmail (real send)" };
  },

  async testConnection(ctx: IntegrationActionContext): Promise<IntegrationActionResult> {
    const tokens = readTokens(ctx);
    if (!tokens) {
      return { status: "requires_setup", output: { connected: false }, label: "Gmail (not connected)" };
    }
    return { status: "real", output: { connected: true }, label: "Gmail (connected)" };
  },
};

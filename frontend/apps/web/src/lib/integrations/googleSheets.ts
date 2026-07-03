/**
 * Google Sheets integration — MOCK mode by default; secure placeholder
 * architecture for real OAuth. Never claims to be live unless a real
 * credentialRef + configured spreadsheetId is present AND GOOGLE_SHEETS_OAUTH
 * is enabled (not implemented in this pass — architecture only).
 */
import type { IntegrationActionContext, IntegrationActionResult, IntegrationProvider } from "./base";

function isRealModeEnabled(): boolean {
  return process.env.GOOGLE_SHEETS_OAUTH_ENABLED === "true";
}

export const googleSheetsIntegration: IntegrationProvider = {
  key: "google-sheets",

  async executeAction(ctx: IntegrationActionContext, action: string, payload: Record<string, unknown>): Promise<IntegrationActionResult> {
    if (!isRealModeEnabled() || !ctx.credentialRef) {
      if (action === "append_row") {
        return {
          status: "mock",
          output: { appended: true, row: payload.row ?? {}, mock: true },
          label: "Google Sheets (mock — connect OAuth to append real rows)",
        };
      }
      if (action === "read_rows") {
        return {
          status: "mock",
          output: {
            rows: [
              { row: 1, values: ["Sample", "Demo", "Data"] },
              { row: 2, values: ["Connect", "Google", "Sheets"] },
            ],
            mock: true,
          },
          label: "Google Sheets (mock — connect OAuth to read real rows)",
        };
      }
      return { status: "failed", output: {}, label: "Google Sheets", error: `Unknown action: ${action}` };
    }

    // Real OAuth mode is architecturally supported but not implemented in this
    // pass (requires Google Cloud OAuth client credentials from the user).
    return {
      status: "requires_setup",
      output: {},
      label: "Google Sheets (real OAuth mode enabled but API call not implemented — requires_setup)",
      error: "GOOGLE_SHEETS_OAUTH_ENABLED=true but the real Sheets API client is not implemented in this pass.",
    };
  },

  async testConnection(ctx: IntegrationActionContext): Promise<IntegrationActionResult> {
    if (!isRealModeEnabled() || !ctx.credentialRef) {
      return { status: "mock", output: { connected: false }, label: "Google Sheets (mock mode — not connected)" };
    }
    return { status: "requires_setup", output: { connected: false }, label: "Google Sheets (requires_setup)" };
  },
};

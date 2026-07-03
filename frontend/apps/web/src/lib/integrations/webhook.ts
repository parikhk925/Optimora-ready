/**
 * Webhook integration — REAL (the only integration in this pass with a genuine
 * external network call, since it is protocol-level rather than vendor-specific).
 *
 *  - Inbound: handled directly by /api/webhooks/[workspaceId]/[workflowId]/route.ts
 *  - Outbound: this module performs the actual HTTP POST with basic retry.
 */
import type { IntegrationActionContext, IntegrationActionResult, IntegrationProvider } from "./base";

async function postWithRetry(url: string, body: unknown, maxRetries: number): Promise<{ ok: boolean; status: number; error?: string }> {
  let lastError: string | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return { ok: true, status: res.status };
      lastError = `Webhook responded with HTTP ${res.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  return { ok: false, status: 0, error: lastError };
}

export const webhookIntegration: IntegrationProvider = {
  key: "webhook",

  async executeAction(ctx: IntegrationActionContext, action: string, payload: Record<string, unknown>): Promise<IntegrationActionResult> {
    if (action !== "send_webhook") {
      return { status: "failed", output: {}, label: "Webhook", error: `Unknown webhook action: ${action}` };
    }
    const url = typeof payload.url === "string" ? payload.url : undefined;
    if (!url) {
      return { status: "failed", output: {}, label: "Webhook", error: "Missing target webhook URL in step config." };
    }
    const result = await postWithRetry(url, payload.body ?? {}, 2);
    if (result.ok) {
      return { status: "real", output: { delivered: true, httpStatus: result.status }, label: "Webhook (live HTTP call)" };
    }
    return { status: "failed", output: { delivered: false }, label: "Webhook (live HTTP call)", error: result.error };
  },

  async testConnection(): Promise<IntegrationActionResult> {
    return { status: "real", output: { reachable: true }, label: "Webhook integration is protocol-level; always available." };
  },
};

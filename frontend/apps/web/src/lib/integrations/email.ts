/**
 * Email integration — sends via the Resend API when RESEND_API_KEY is set,
 * otherwise runs in "mock" mode (nothing is delivered, and the result is
 * always labeled mock so callers can't mistake it for a real send). Supports
 * generating the email body from a prior AI step's structured output.
 */
import type { IntegrationActionContext, IntegrationActionResult, IntegrationProvider } from "./base";

function isRealModeEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

async function sendViaResend(to: string, subject: string, body: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");
  const from = process.env.EMAIL_FROM ?? "Optimora <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html: `<p>${body}</p>` }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${text}`);
  }
}

function bodyFromAiOutput(aiOutput: Record<string, unknown> | undefined): string | undefined {
  if (!aiOutput) return undefined;
  if (typeof aiOutput.updateText === "string") return aiOutput.updateText;
  if (typeof aiOutput.summary === "string") return aiOutput.summary;
  if (typeof aiOutput.reasoning === "string") return aiOutput.reasoning;
  return undefined;
}

export const emailIntegration: IntegrationProvider = {
  key: "email",

  async executeAction(ctx: IntegrationActionContext, action: string, payload: Record<string, unknown>): Promise<IntegrationActionResult> {
    if (action !== "send_email") {
      return { status: "failed", output: {}, label: "Email", error: `Unknown email action: ${action}` };
    }
    const generatedBody = bodyFromAiOutput(payload.aiOutput as Record<string, unknown> | undefined);
    const body = (payload.body as string | undefined) ?? generatedBody ?? "(no body provided)";
    const to = (payload.to as string | undefined) ?? "demo@optimora.local";
    const subject = (payload.subject as string | undefined) ?? "Optimora automation notification";

    if (!isRealModeEnabled()) {
      return {
        status: "mock",
        output: { to, subject, body, sent: false, mock: true },
        label: "Email (mock — no RESEND_API_KEY/SMTP_HOST configured; not actually sent)",
      };
    }

    try {
      await sendViaResend(to, subject, body);
      return {
        status: "real",
        output: { to, subject, body, sent: true },
        label: "Email (sent via Resend)",
      };
    } catch (err) {
      return {
        status: "failed",
        output: { to, subject, body, sent: false },
        error: err instanceof Error ? err.message : String(err),
        label: "Email (Resend send failed)",
      };
    }
  },

  async testConnection(): Promise<IntegrationActionResult> {
    if (!isRealModeEnabled()) {
      return { status: "mock", output: { connected: false }, label: "Email (mock mode — no provider configured)" };
    }
    return { status: "real", output: { connected: true }, label: "Email (Resend configured)" };
  },
};

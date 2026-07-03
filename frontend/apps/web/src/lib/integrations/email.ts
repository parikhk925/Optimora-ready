/**
 * Email integration — MOCK by default (no real SMTP/Resend key wired in this
 * pass, per explicit user choice). Every "send" is logged and stored, never
 * actually delivered, and always labeled "mock". Supports generating the email
 * body from a prior AI step's structured output.
 */
import type { IntegrationActionContext, IntegrationActionResult, IntegrationProvider } from "./base";

function isRealModeEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
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

    // Real provider mode is architecturally supported but not implemented in
    // this pass per explicit scope (mock-only email chosen for this build).
    return {
      status: "requires_setup",
      output: { to, subject, body },
      label: "Email (real provider configured but send call not implemented — requires_setup)",
    };
  },

  async testConnection(): Promise<IntegrationActionResult> {
    if (!isRealModeEnabled()) {
      return { status: "mock", output: { connected: false }, label: "Email (mock mode — no provider configured)" };
    }
    return { status: "requires_setup", output: { connected: false }, label: "Email (requires_setup)" };
  },
};

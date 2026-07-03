import type { IntegrationActionContext, IntegrationActionResult, IntegrationProvider } from "./base";
import { webhookIntegration } from "./webhook";
import { googleSheetsIntegration } from "./googleSheets";
import { emailIntegration } from "./email";
import { mockCrmIntegration } from "./mockCrm";
import { gmailIntegration } from "./gmail";

const REGISTRY: Record<string, IntegrationProvider> = {
  webhook: webhookIntegration,
  "google-sheets": googleSheetsIntegration,
  email: emailIntegration,
  crm: mockCrmIntegration,
  gmail: gmailIntegration,
};

export function getIntegrationProvider(key: string): IntegrationProvider | undefined {
  return REGISTRY[key];
}

export async function executeIntegrationAction(
  ctx: IntegrationActionContext,
  providerKey: string,
  action: string,
  payload: Record<string, unknown>,
): Promise<IntegrationActionResult> {
  const provider = getIntegrationProvider(providerKey);
  if (!provider) {
    return { status: "failed", output: {}, label: providerKey, error: `Integration "${providerKey}" is not implemented.` };
  }
  return provider.executeAction(ctx, action, payload);
}

export async function testIntegrationConnection(
  ctx: IntegrationActionContext,
  providerKey: string,
): Promise<IntegrationActionResult> {
  const provider = getIntegrationProvider(providerKey);
  if (!provider) {
    return { status: "failed", output: {}, label: providerKey, error: `Integration "${providerKey}" is not implemented.` };
  }
  return provider.testConnection(ctx);
}

export type { IntegrationActionContext, IntegrationActionResult, IntegrationProvider } from "./base";

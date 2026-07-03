/**
 * Integration architecture (Section 5 — Realistic first integrations).
 *
 * Every integration provider implements this interface so the workflow
 * execution engine and the /api/automation/integrations/:provider routes can
 * treat all providers uniformly. Status labels are always honest:
 *   - "real"            — a genuine external API call was made
 *   - "mock"            — simulated locally, no network call, clearly labeled
 *   - "requires_setup"  — needs real OAuth/API credentials before it can run live
 */
import type { TxClient } from "@optimora/db";

export type IntegrationRunStatus = "real" | "mock" | "requires_setup" | "failed";

export interface IntegrationActionResult {
  status: IntegrationRunStatus;
  output: Record<string, unknown>;
  label: string;
  error?: string;
}

export interface IntegrationActionContext {
  tx: TxClient;
  tenantId: string;
  orgId: string;
  workspaceId: string;
  /** credentialRef stored on WorkspaceIntegration — never the raw secret. */
  credentialRef?: string | null;
  configSnapshot?: Record<string, unknown>;
}

export interface IntegrationProvider {
  key: string;
  /** Executes a named action (e.g. "append_row", "send_email", "create_lead"). */
  executeAction(ctx: IntegrationActionContext, action: string, payload: Record<string, unknown>): Promise<IntegrationActionResult>;
  /** Verifies the connection is reachable/usable. Does not mutate anything. */
  testConnection(ctx: IntegrationActionContext): Promise<IntegrationActionResult>;
}

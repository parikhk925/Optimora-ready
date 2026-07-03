// Public API types mirroring /v1/public/* response shapes.

export interface SdkConfig {
  baseUrl: string;
  apiKey: string;
}

export interface SdkTask {
  id: string;
  tenantId: string;
  orgId: string;
  title: string;
  status: string;
  priority: number;
  assignedAgentId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface SdkRun {
  id: string;
  tenantId: string;
  orgId: string;
  agentId: string;
  taskId: string;
  agentVersion: number;
  modelProvider: string;
  status: string;
  createdAt: string;
}

export interface SdkMemoryRecord {
  id: string;
  tenantId: string;
  orgId: string;
  agentId: string;
  type: string;
  importance: number;
  status: string;
  createdAt: string;
}

export interface SdkAgent {
  agentId: string;
  modelProvider: string;
  agentVersion: number;
  status: string;
  createdAt: string;
}

export interface SdkTool {
  name: string;
}

export interface SdkIntegration {
  id: string;
  connectorKey: string;
  status: string;
  createdAt: string;
}

export interface SdkApprovalDecision {
  id: string;
  state: string;
  reason?: string;
  resolvedAt: string;
}

export interface SdkQuotaEntry {
  limit: number | null;
  used: number;
  allowed: boolean;
}

export interface SdkUsage {
  since: string;
  estimatedCostUsd: number;
  totalUnits: number;
  invocationCount: number;
  taskCount: number;
  activeMemoryRecords: number;
}

export interface SdkUsageSummary {
  usage: SdkUsage;
  quotas: {
    monthlyTasks: SdkQuotaEntry;
    memoryRecords: SdkQuotaEntry;
    monthlyModelUsageUsd: SdkQuotaEntry;
  };
}

export interface SdkEntitlement {
  allowed: boolean;
  feature: string;
  reason: string;
}

export interface SdkQuotaResult {
  allowed: boolean;
  resource: string;
  limit: number | null;
  currentUsage: number;
  reason: string;
}

export interface SdkPlan {
  key: string;
  limits: {
    maxClientWorkspaces: number | null;
    maxAgents: number | null;
    maxMonthlyTasks: number | null;
    maxMonthlyModelUsageUsd: number | null;
    maxMonthlyToolInvocations: number | null;
    maxIntegrations: number | null;
    maxMemoryRecords: number | null;
    maxSeats: number | null;
    enabledModules: string[];
    whiteLabelEnabled: boolean;
    customDomainEnabled: boolean;
  };
}

export class SdkError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SdkError";
  }
}

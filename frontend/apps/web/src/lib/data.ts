/**
 * Data adapter layer.
 * - When SDK is configured (NEXT_PUBLIC_API_KEY starts with "opt_"), calls the real Public API.
 * - Otherwise returns deterministic mock data so the UI renders safely in dev/demo mode.
 * - All functions are async so the calling pattern is identical in both modes.
 * - Nothing here writes data or calls paid AI models.
 */
import { getSdkClient, isSdkConfigured } from "./sdk";
import type {
  SdkAgent,
  SdkTask,
  SdkRun,
  SdkMemoryRecord,
  SdkTool,
  SdkIntegration,
  SdkUsageSummary,
  SdkPlan,
} from "@optimora/sdk";
import { DEMO_AGENTS, DEMO_TASKS, DEMO_RUNS } from "./demo-data";

// ─── Mock data (dev/demo) ────────────────────────────────────────────────────

const MOCK_AGENTS: SdkAgent[] = DEMO_AGENTS.map((a) => ({
  agentId: a.agentId,
  modelProvider: a.modelProvider,
  agentVersion: 1,
  status: a.status as "active" | "inactive",
  createdAt: "2026-06-01T00:00:00Z",
}));

const MOCK_TASKS: SdkTask[] = DEMO_TASKS.map((t) => ({
  id: t.id,
  tenantId: "demo",
  orgId: "demo",
  title: t.title,
  status: t.status,
  priority: t.priority,
  createdAt: t.createdAt,
}));

const MOCK_RUNS: SdkRun[] = DEMO_RUNS.map((r) => ({
  id: r.id,
  tenantId: "demo",
  orgId: "demo",
  agentId: `demo-agent-${r.agentKey}-001`,
  taskId: r.taskId,
  agentVersion: 1,
  modelProvider: r.modelProvider,
  status: r.status,
  createdAt: r.createdAt,
}));

const MOCK_MEMORY: SdkMemoryRecord[] = [
  { id: "mem-001", tenantId: "demo", orgId: "demo", agentId: "agent-finance-01", type: "fact", importance: 0.9, status: "active", createdAt: "2026-06-01T08:10:00Z" },
  { id: "mem-002", tenantId: "demo", orgId: "demo", agentId: "agent-support-01", type: "context", importance: 0.6, status: "active", createdAt: "2026-06-15T11:40:00Z" },
];

const MOCK_TOOLS: SdkTool[] = [
  { name: "web_search" },
  { name: "calculator" },
  { name: "file_reader" },
];

const MOCK_INTEGRATIONS: SdkIntegration[] = [
  { id: "int-001", connectorKey: "google_drive", status: "active", createdAt: "2026-01-05T10:00:00Z" },
  { id: "int-002", connectorKey: "slack", status: "active", createdAt: "2026-01-10T10:00:00Z" },
];

const MOCK_USAGE: SdkUsageSummary = {
  usage: {
    since: "2026-06-01T00:00:00Z",
    estimatedCostUsd: 2.47,
    totalUnits: 1240,
    invocationCount: 38,
    taskCount: 4,
    activeMemoryRecords: 2,
  },
  quotas: {
    monthlyTasks: { limit: 100, used: 4, allowed: true },
    memoryRecords: { limit: 500, used: 2, allowed: true },
    monthlyModelUsageUsd: { limit: 5, used: 2.47, allowed: true },
  },
};

const MOCK_PLANS: SdkPlan[] = [
  {
    key: "growth",
    limits: {
      maxClientWorkspaces: 25, maxAgents: 50, maxMonthlyTasks: 5000,
      maxMonthlyModelUsageUsd: 200, maxMonthlyToolInvocations: 10000,
      maxIntegrations: 10, maxMemoryRecords: 50000, maxSeats: 20,
      enabledModules: ["runtime", "memory", "tools", "integrations", "financeAgent", "reporting"],
      whiteLabelEnabled: false, customDomainEnabled: true,
    },
  },
];

// Mock for admin-only endpoints (audit, jurisdiction, agency) — not in Public API
export interface MockAuditEntry {
  id: string;
  action: string;
  actor: string;
  resourceType: string;
  createdAt: string;
}

export interface MockJurisdiction {
  id: string;
  code: string;
  label: string;
  dataResidency: string;
}

export interface MockAgencyProfile {
  id: string;
  name: string;
  defaultLocale: string;
  defaultCurrency: string;
  whiteLabelEnabled: boolean;
  customDomainEnabled: boolean;
  enabledModules: string[];
}

const MOCK_AUDIT: MockAuditEntry[] = [
  { id: "aud-001", action: "task.created", actor: "api-key:demo", resourceType: "Task", createdAt: "2026-06-22T14:00:00Z" },
  { id: "aud-002", action: "run.started", actor: "api-key:demo", resourceType: "AgentRun", createdAt: "2026-06-22T14:01:00Z" },
  { id: "aud-003", action: "approval.resolved", actor: "user:admin", resourceType: "ApprovalRequest", createdAt: "2026-06-22T15:30:00Z" },
];

const MOCK_JURISDICTIONS: MockJurisdiction[] = [
  { id: "jur-001", code: "IN", label: "India", dataResidency: "IN" },
  { id: "jur-002", code: "US", label: "United States", dataResidency: "US" },
  { id: "jur-003", code: "GLOBAL", label: "Global (generic)", dataResidency: "GLOBAL" },
];

const MOCK_AGENCY: MockAgencyProfile = {
  id: "agency-demo",
  name: "Demo Agency",
  defaultLocale: "en-US",
  defaultCurrency: "USD",
  whiteLabelEnabled: false,
  customDomainEnabled: true,
  enabledModules: ["runtime", "memory", "tools", "integrations", "financeAgent", "reporting"],
};

// ─── Result wrapper ───────────────────────────────────────────────────────────

export type DataResult<T> =
  | { status: "ok"; data: T; live: boolean }
  | { status: "error"; message: string };

async function safely<T>(fn: () => Promise<T>, mock: T): Promise<DataResult<T>> {
  if (!isSdkConfigured()) {
    return { status: "ok", data: mock, live: false };
  }
  try {
    return { status: "ok", data: await fn(), live: true };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ─── Public data fetchers ─────────────────────────────────────────────────────

export async function fetchAgents(): Promise<DataResult<SdkAgent[]>> {
  return safely(async () => {
    const { agents } = await getSdkClient().listAgents({ limit: 50 });
    return agents;
  }, MOCK_AGENTS);
}

export async function fetchTasks(opts?: { status?: string }): Promise<DataResult<SdkTask[]>> {
  return safely(async () => {
    const { tasks } = await getSdkClient().listTasks({ limit: 50, ...opts });
    return tasks;
  }, MOCK_TASKS);
}

export async function fetchRuns(): Promise<DataResult<SdkRun[]>> {
  // No listRuns in SDK yet — use mock even in live mode
  return { status: "ok", data: MOCK_RUNS, live: false };
}

export async function fetchMemory(): Promise<DataResult<SdkMemoryRecord[]>> {
  // No listMemory in SDK yet — use mock even in live mode
  return { status: "ok", data: MOCK_MEMORY, live: false };
}

export async function fetchTools(): Promise<DataResult<SdkTool[]>> {
  return safely(async () => {
    const { tools } = await getSdkClient().listTools();
    return tools;
  }, MOCK_TOOLS);
}

export async function fetchIntegrations(): Promise<DataResult<SdkIntegration[]>> {
  return safely(async () => {
    const { integrations } = await getSdkClient().listIntegrations();
    return integrations;
  }, MOCK_INTEGRATIONS);
}

export async function fetchUsage(): Promise<DataResult<SdkUsageSummary>> {
  return safely(async () => getSdkClient().getUsage(), MOCK_USAGE);
}

export async function fetchPlans(): Promise<DataResult<SdkPlan[]>> {
  return safely(async () => {
    const { plans } = await getSdkClient().listPlans();
    return plans;
  }, MOCK_PLANS);
}

// ─── Admin-only (always mock until admin API routes wired via session auth) ───

export async function fetchAuditLogs(): Promise<DataResult<MockAuditEntry[]>> {
  return { status: "ok", data: MOCK_AUDIT, live: false };
}

export async function fetchJurisdictions(): Promise<DataResult<MockJurisdiction[]>> {
  return { status: "ok", data: MOCK_JURISDICTIONS, live: false };
}

export async function fetchAgencyProfile(): Promise<DataResult<MockAgencyProfile>> {
  return { status: "ok", data: MOCK_AGENCY, live: false };
}

// ─── Overview aggregate ───────────────────────────────────────────────────────

export interface OverviewData {
  agentCount: number;
  taskCount: number;
  activeRunCount: number;
  usageSummary: SdkUsageSummary;
  live: boolean;
}

export async function fetchOverview(): Promise<DataResult<OverviewData>> {
  const [agentRes, taskRes, runRes, usageRes] = await Promise.all([
    fetchAgents(),
    fetchTasks(),
    fetchRuns(),
    fetchUsage(),
  ]);

  if (
    agentRes.status === "error" ||
    taskRes.status === "error" ||
    runRes.status === "error" ||
    usageRes.status === "error"
  ) {
    const err = [agentRes, taskRes, runRes, usageRes].find((r) => r.status === "error");
    return { status: "error", message: err && err.status === "error" ? err.message : "Failed to load overview" };
  }

  return {
    status: "ok",
    live: agentRes.live,
    data: {
      agentCount: agentRes.data.length,
      taskCount: taskRes.data.length,
      activeRunCount: runRes.data.filter((r) => r.status === "running").length,
      usageSummary: usageRes.data,
      live: agentRes.live,
    },
  };
}

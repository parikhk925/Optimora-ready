import type {
  SdkConfig,
  SdkTask,
  SdkRun,
  SdkMemoryRecord,
  SdkAgent,
  SdkTool,
  SdkIntegration,
  SdkApprovalDecision,
  SdkUsageSummary,
  SdkEntitlement,
  SdkQuotaResult,
  SdkPlan,
} from "./types.js";
import { SdkError } from "./types.js";

export class OptomoraClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: SdkConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.headers = {
      "x-api-key": config.apiKey,
      "content-type": "application/json",
      accept: "application/json",
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) params.set(k, String(v));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const res = await fetch(url, {
      method,
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new SdkError(
        res.status,
        (json as Record<string, unknown>).error as string ?? "api_error",
        `${method} ${path} failed with status ${res.status}`,
      );
    }

    return json as T;
  }

  // ---- Plans ----

  async listPlans(): Promise<{ plans: SdkPlan[] }> {
    return this.request("GET", "/v1/billing/plans");
  }

  // ---- Agents ----

  async listAgents(opts?: { limit?: number; offset?: number }): Promise<{ agents: SdkAgent[] }> {
    return this.request("GET", "/v1/public/agents", undefined, opts);
  }

  // ---- Tasks ----

  async createTask(input: {
    title: string;
    priority?: number;
    inputData?: Record<string, unknown>;
    deadline?: string;
  }): Promise<{ task: SdkTask }> {
    return this.request("POST", "/v1/public/tasks", input);
  }

  async getTask(id: string): Promise<{ task: SdkTask }> {
    return this.request("GET", `/v1/public/tasks/${id}`);
  }

  async listTasks(opts?: { status?: string; limit?: number; offset?: number }): Promise<{ tasks: SdkTask[] }> {
    return this.request("GET", "/v1/public/tasks", undefined, opts);
  }

  // ---- Runs ----

  async startRun(input: {
    agentId: string;
    taskId: string;
    agentVersion?: number;
    modelProvider?: string;
    input?: Record<string, unknown>;
  }): Promise<{ run: SdkRun }> {
    return this.request("POST", "/v1/public/runs", input);
  }

  // ---- Memory ----

  async createMemory(input: {
    agentId: string;
    type: string;
    content: string;
    importance?: number;
    tags?: string[];
    taskId?: string;
  }): Promise<{ record: SdkMemoryRecord }> {
    return this.request("POST", "/v1/public/memory", input);
  }

  // ---- Tools / Integrations ----

  async listTools(): Promise<{ tools: SdkTool[] }> {
    return this.request("GET", "/v1/public/tools");
  }

  async listIntegrations(): Promise<{ integrations: SdkIntegration[] }> {
    return this.request("GET", "/v1/public/integrations");
  }

  // ---- Approvals ----

  async submitApprovalDecision(
    id: string,
    decision: "approved" | "rejected" | "cancelled",
    note?: string,
  ): Promise<{ approval: SdkApprovalDecision }> {
    return this.request("POST", `/v1/public/approvals/${id}/decision`, { decision, note });
  }

  // ---- Usage / Limits ----

  async getUsage(opts?: { since?: string }): Promise<SdkUsageSummary> {
    return this.request("GET", "/v1/public/usage", undefined, opts);
  }

  // ---- Billing Entitlement / Quota (via billing routes) ----

  async checkEntitlement(feature: string): Promise<{ entitlement: SdkEntitlement }> {
    return this.request("GET", `/v1/billing/entitlement/${encodeURIComponent(feature)}`);
  }

  async checkQuota(resource: string, currentUsage?: number): Promise<{ quota: SdkQuotaResult }> {
    return this.request("GET", `/v1/billing/quota/${encodeURIComponent(resource)}`, undefined,
      currentUsage !== undefined ? { currentUsage } : undefined);
  }
}

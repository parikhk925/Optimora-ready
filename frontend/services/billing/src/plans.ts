import type { PlanKey, PlanLimits } from "./types.js";

/** Hardcoded plan definitions. null = unlimited. */
export const PLAN_DEFINITIONS: Record<PlanKey, PlanLimits> = {
  free: {
    maxClientWorkspaces: 1,
    maxAgents: 2,
    maxMonthlyTasks: 100,
    maxMonthlyModelUsageUsd: 5,
    maxMonthlyToolInvocations: 200,
    maxIntegrations: 1,
    maxMemoryRecords: 500,
    maxSeats: 2,
    enabledModules: ["runtime", "memory"],
    whiteLabelEnabled: false,
    customDomainEnabled: false,
  },
  starter: {
    maxClientWorkspaces: 5,
    maxAgents: 10,
    maxMonthlyTasks: 1_000,
    maxMonthlyModelUsageUsd: 50,
    maxMonthlyToolInvocations: 5_000,
    maxIntegrations: 5,
    maxMemoryRecords: 10_000,
    maxSeats: 10,
    enabledModules: ["runtime", "memory", "tools"],
    whiteLabelEnabled: false,
    customDomainEnabled: false,
  },
  growth: {
    maxClientWorkspaces: 25,
    maxAgents: 50,
    maxMonthlyTasks: 10_000,
    maxMonthlyModelUsageUsd: 300,
    maxMonthlyToolInvocations: 50_000,
    maxIntegrations: 20,
    maxMemoryRecords: 100_000,
    maxSeats: 50,
    enabledModules: ["runtime", "memory", "tools", "integrations", "financeAgent", "reporting"],
    whiteLabelEnabled: false,
    customDomainEnabled: true,
  },
  agency: {
    maxClientWorkspaces: 100,
    maxAgents: 200,
    maxMonthlyTasks: 100_000,
    maxMonthlyModelUsageUsd: 2_000,
    maxMonthlyToolInvocations: 500_000,
    maxIntegrations: 100,
    maxMemoryRecords: 1_000_000,
    maxSeats: 200,
    enabledModules: ["runtime", "memory", "tools", "integrations", "financeAgent", "salesAgent", "supportAgent", "reporting"],
    whiteLabelEnabled: true,
    customDomainEnabled: true,
  },
  enterprise: {
    maxClientWorkspaces: null,
    maxAgents: null,
    maxMonthlyTasks: null,
    maxMonthlyModelUsageUsd: null,
    maxMonthlyToolInvocations: null,
    maxIntegrations: null,
    maxMemoryRecords: null,
    maxSeats: null,
    enabledModules: ["runtime", "memory", "tools", "integrations", "financeAgent", "salesAgent", "supportAgent", "reporting"],
    whiteLabelEnabled: true,
    customDomainEnabled: true,
  },
  custom: {
    // Custom plans start with enterprise-level defaults; customLimits on subscription overrides.
    maxClientWorkspaces: null,
    maxAgents: null,
    maxMonthlyTasks: null,
    maxMonthlyModelUsageUsd: null,
    maxMonthlyToolInvocations: null,
    maxIntegrations: null,
    maxMemoryRecords: null,
    maxSeats: null,
    enabledModules: ["runtime", "memory", "tools", "integrations", "financeAgent", "salesAgent", "supportAgent", "reporting"],
    whiteLabelEnabled: true,
    customDomainEnabled: true,
  },
};

export function getPlanLimits(planKey: string, customLimits?: Partial<PlanLimits>): PlanLimits {
  const base = PLAN_DEFINITIONS[planKey as PlanKey];
  if (!base) {
    // Fallback: treat as free if unknown (fail-safe for stale data)
    return PLAN_DEFINITIONS.free;
  }
  if (!customLimits || Object.keys(customLimits).length === 0) return base;
  return { ...base, ...customLimits };
}

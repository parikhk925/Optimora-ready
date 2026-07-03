/**
 * Hard filter (T-8.2, Spec A). Boolean eligibility gate — any failure excludes
 * the candidate (fail closed). The scheduler NEVER widens permissions/capabilities
 * to make a task assignable; this only checks what the candidate already has.
 */
import type { TxClient } from "@optimora/db";
import { getAvailable, isReachable } from "@optimora/org-graph";
import type { SchedulerCandidate, TaskRequirements, HardFilterOutcome } from "./types.js";

const ASSIGNABLE_STATES = new Set(["hired", "probation", "promoted", "demoted"]);

export interface HardFilterContext {
  taskTenantId: string;
  taskOrgId: string;
  taskPriority: number;
  taskDeadline: Date | null;
  estCost: number;
  budgetNodeId: string | null;
  now: number;
}

function capabilitiesOf(candidate: SchedulerCandidate): Set<string> {
  const caps = new Set<string>();
  for (const tool of candidate.definition.tools) {
    caps.add(tool.name);
    for (const s of tool.scopes) caps.add(s);
  }
  return caps;
}

const subset = (need: string[] | undefined, have: Set<string>): boolean =>
  (need ?? []).every((x) => have.has(x));

export async function hardFilter(
  tx: TxClient,
  requirements: TaskRequirements,
  candidate: SchedulerCandidate,
  ctx: HardFilterContext,
): Promise<HardFilterOutcome> {
  const reasons: string[] = [];

  // 1. tenant/org match
  if (candidate.tenantId !== ctx.taskTenantId || candidate.orgId !== ctx.taskOrgId) {
    reasons.push("tenant_org_mismatch");
  }

  // 2. lifecycle eligibility (+ probation restriction)
  if (!ASSIGNABLE_STATES.has(candidate.lifecycle)) {
    reasons.push("lifecycle_ineligible");
  } else if (candidate.lifecycle === "probation") {
    const complexity = requirements.complexity ?? 1;
    if (complexity > 2 || ctx.taskPriority === 0) reasons.push("probation_restricted");
  }

  // 3. required skills
  if (!subset(requirements.requiredSkills, new Set(candidate.definition.skills))) {
    reasons.push("missing_skills");
  }

  // 4. required permissions (never widened)
  if (!subset(requirements.requiredPermissions, new Set(candidate.definition.permissions))) {
    reasons.push("missing_permissions");
  }

  // 5. capability/tool permissions
  if (!subset(requirements.requiredCapabilities, capabilitiesOf(candidate))) {
    reasons.push("missing_capabilities");
  }

  // 6. data clearance vs sensitivity
  if (
    requirements.dataSensitivityClass != null &&
    (candidate.dataClearanceClass ?? 0) < requirements.dataSensitivityClass
  ) {
    reasons.push("insufficient_data_clearance");
  }

  // 7. concurrency / availability
  if (candidate.currentLoad >= candidate.concurrencyCap) {
    reasons.push("no_capacity");
  }

  // 8. deadline feasibility
  if (ctx.taskDeadline) {
    const estTime = requirements.estimatedTimeMs ?? candidate.avgLatencyMs ?? 0;
    if (ctx.now + estTime > ctx.taskDeadline.getTime()) reasons.push("deadline_infeasible");
  }

  // 9. budget availability (fail closed when context missing; never overcommit)
  if (ctx.estCost > 0) {
    if (!ctx.budgetNodeId) {
      reasons.push("budget_context_missing");
    } else {
      const available = await getAvailable(tx, ctx.budgetNodeId);
      if (available == null) reasons.push("budget_context_missing");
      else if (ctx.estCost > available) reasons.push("budget_unavailable");
    }
  }

  // 10. graph/ReBAC authority (when required)
  if (requirements.requiredRelation) {
    const rel = requirements.requiredRelation;
    if (!candidate.nodeId) {
      reasons.push("missing_graph_authority");
    } else {
      let holds = false;
      try {
        holds =
          rel.relation === "reports_to"
            ? await isReachable(tx, rel.nodeId, candidate.nodeId, "reports_to")
            : await isReachable(tx, candidate.nodeId, rel.nodeId, rel.relation);
      } catch {
        holds = false; // malformed -> fail closed
      }
      if (!holds) reasons.push("missing_graph_authority");
    }
  }

  return { eligible: reasons.length === 0, reasons };
}

/**
 * Scheduler integration test (T-8.2, Spec A) — eligible selection, ineligible
 * filtering, missing-permission denial, budget overrun denial, cross-tenant
 * denial, better-scoring selection, no-eligible-candidate, budget reservation,
 * no-permission-widening, and decision-event emission. Requires Postgres.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import { createDefinition, type AgentDefinition } from "@optimora/agent-contract";
import { createNode, getAvailable, setBudget } from "@optimora/org-graph";
import { createTask, getTask, listTaskEvents, markReady } from "@optimora/execution";
import { scheduleTask, type SchedulerCandidate, type TaskRequirements } from "../index.js";

const sys = getSystemPrisma();
const prisma = getPrisma();
const tenantA = randomUUID();
const orgA = randomUUID();
let node: string;

const inA = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, fn);

function makeCandidate(
  over: Partial<SchedulerCandidate> & {
    skills?: string[];
    permissions?: string[];
    def?: AgentDefinition;
  } = {},
): SchedulerCandidate {
  const def =
    over.def ??
    createDefinition({
      identity: { agentId: randomUUID(), key: "agent", displayName: "Agent" },
      role: "Writer",
      skills: over.skills ?? ["writing"],
      permissions: over.permissions ?? ["content:write"],
      tools: [{ name: "editor", scopes: ["edit"] }],
    });
  return {
    tenantId: over.tenantId ?? tenantA,
    orgId: over.orgId ?? orgA,
    definition: def,
    lifecycle: over.lifecycle ?? "hired",
    reputation: over.reputation ?? 0.5,
    successRate: over.successRate ?? 0.5,
    avgCost: over.avgCost ?? 1,
    avgLatencyMs: over.avgLatencyMs ?? 1000,
    currentLoad: over.currentLoad ?? 0,
    concurrencyCap: over.concurrencyCap ?? 5,
    nodeId: over.nodeId,
  };
}

async function readyTask(
  requirements: TaskRequirements,
  costEstimate = 2,
  priority = 3,
): Promise<string> {
  const t = await inA((tx) =>
    createTask(tx, {
      tenantId: tenantA,
      orgId: orgA,
      title: "Task",
      priority,
      costEstimate,
      assignedNodeId: node,
      inputData: { requirements },
    }),
  );
  await inA((tx) => markReady(tx, t.id));
  return t.id;
}

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `sc-${tenantA}`, name: "SC A" } });
  await sys.organization.create({
    data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" },
  });
  node = (
    await inA((tx) =>
      createNode(tx, { tenantId: tenantA, orgId: orgA, type: "department", name: "Dept" }),
    )
  ).id;
  await inA((tx) => setBudget(tx, { tenantId: tenantA, orgId: orgA, nodeId: node, limit: 1000 }));
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: tenantA } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

const reqs: TaskRequirements = {
  requiredSkills: ["writing"],
  requiredPermissions: ["content:write"],
};

describe("Scheduler (Spec A)", () => {
  it("selects an eligible agent, reserves budget, and emits an assigned event", async () => {
    const taskId = await readyTask(reqs, 5);
    const before = await inA((tx) => getAvailable(tx, node));
    const cand = makeCandidate();
    const decision = await inA((tx) => scheduleTask(tx, taskId, [cand]));

    expect(decision.type).toBe("assigned");
    if (decision.type !== "assigned") return;
    expect(decision.assignment.agentId).toBe(cand.definition.identity.agentId);
    expect(decision.assignment.budgetReservationId).toBeTruthy();

    const task = await inA((tx) => getTask(tx, taskId));
    expect(task?.status).toBe("scheduled");
    expect(task?.assignedAgentId).toBe(cand.definition.identity.agentId);
    expect(task?.budgetReservationId).toBe(decision.assignment.budgetReservationId);

    // Budget reservation occurred.
    const after = await inA((tx) => getAvailable(tx, node));
    expect(after).toBe((before ?? 0) - 5);

    const events = await inA((tx) => listTaskEvents(tx, taskId));
    expect(events.map((e) => e.type)).toContain("scheduler.assigned");
  });

  it("returns no_eligible_candidate (and event) when a required skill is missing", async () => {
    const taskId = await readyTask({ requiredSkills: ["seo"] });
    const decision = await inA((tx) => scheduleTask(tx, taskId, [makeCandidate()]));
    expect(decision.type).toBe("no_eligible_candidate");
    if (decision.type !== "no_eligible_candidate") return;
    expect(decision.reasons).toContain("missing_skills");
    expect(decision.recommendation).toBe("hire_or_clone");
    const events = await inA((tx) => listTaskEvents(tx, taskId));
    expect(events.map((e) => e.type)).toContain("scheduler.no_candidate");
  });

  it("denies a missing permission and never widens it", async () => {
    const taskId = await readyTask({ requiredPermissions: ["content:publish"] });
    const cand = makeCandidate({ permissions: ["content:write"] }); // lacks publish
    const decision = await inA((tx) => scheduleTask(tx, taskId, [cand]));
    expect(decision.type).toBe("no_eligible_candidate");
    if (decision.type === "no_eligible_candidate") {
      expect(decision.reasons).toContain("missing_permissions");
    }
    // The candidate's permissions are unchanged (never widened).
    expect(cand.definition.permissions).toEqual(["content:write"]);
  });

  it("denies an over-budget task", async () => {
    const taskId = await readyTask(reqs, 5000); // exceeds the node's available budget
    const decision = await inA((tx) => scheduleTask(tx, taskId, [makeCandidate()]));
    expect(decision.type).toBe("no_eligible_candidate");
    if (decision.type === "no_eligible_candidate") {
      expect(decision.reasons).toContain("budget_unavailable");
    }
  });

  it("filters cross-tenant candidates", async () => {
    const taskId = await readyTask(reqs);
    const foreign = makeCandidate({ tenantId: randomUUID() });
    const decision = await inA((tx) => scheduleTask(tx, taskId, [foreign]));
    expect(decision.type).toBe("no_eligible_candidate");
    if (decision.type === "no_eligible_candidate") {
      expect(decision.reasons).toContain("tenant_org_mismatch");
    }
  });

  it("selects the better-scoring agent among eligible candidates", async () => {
    const taskId = await readyTask(reqs, 2, 0); // P0 -> quality-weighted
    const strong = makeCandidate({ reputation: 0.95, successRate: 0.95 });
    const weak = makeCandidate({ reputation: 0.2, successRate: 0.2 });
    const decision = await inA((tx) => scheduleTask(tx, taskId, [weak, strong]));
    expect(decision.type).toBe("assigned");
    if (decision.type === "assigned") {
      expect(decision.assignment.agentId).toBe(strong.definition.identity.agentId);
    }
  });
});

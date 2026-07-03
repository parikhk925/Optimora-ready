/**
 * Decision Engine integration test (T-8.3) — department/agent routing, escalation,
 * nearest-common-ancestor conflict resolution, priority handling, cross-tenant
 * denial, missing-context fail-closed, unauthorized deny, decision records +
 * events. Requires the dev Postgres + migrations.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import { createDefinition } from "@optimora/agent-contract";
import type { UserPrincipal } from "@optimora/auth-core";
import { createEdge, createNode, setBudget } from "@optimora/org-graph";
import { createTask, markReady, transitionTask } from "@optimora/execution";
import {
  decideAgentRoute,
  decideConflict,
  decideDepartmentRoute,
  decideEscalation,
  getDecision,
  listDecisionEvents,
  InvalidDecisionContextError,
  type DecisionContext,
  type SchedulerCandidate,
} from "../index.js";

const sys = getSystemPrisma();
const prisma = getPrisma();
const tenantA = randomUUID();
const orgA = randomUUID();
const tenantB = randomUUID();
const orgB = randomUUID();

const inA = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, fn);
const inB = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantB, orgId: orgB }, fn);

const ctx: DecisionContext = { tenantId: tenantA, orgId: orgA };

let exec: string;
let marketing: string;
let sales: string;
let teamA: string;
let teamB: string;
let nodeB: string; // tenant B

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `de-${tenantA}`, name: "DE A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `de-${tenantB}`, name: "DE B" } });
  await sys.organization.create({
    data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" },
  });
  await sys.organization.create({
    data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" },
  });

  await inA(async (tx) => {
    const mk = (type: "executive" | "department" | "team", name: string) =>
      createNode(tx, { tenantId: tenantA, orgId: orgA, type, name });
    exec = (await mk("executive", "CEO")).id;
    marketing = (await mk("department", "Marketing")).id;
    sales = (await mk("department", "Sales")).id;
    teamA = (await mk("team", "TeamA")).id;
    teamB = (await mk("team", "TeamB")).id;
    const edge = (from: string, to: string) =>
      createEdge(tx, {
        tenantId: tenantA,
        orgId: orgA,
        fromNodeId: from,
        toNodeId: to,
        type: "manages",
      });
    await edge(exec, marketing);
    await edge(exec, sales);
    await edge(marketing, teamA);
    await edge(marketing, teamB);
    // Budget the full ancestor chain (exec -> marketing) so the cascade resolves.
    await setBudget(tx, { tenantId: tenantA, orgId: orgA, nodeId: exec, limit: 1000 });
    await setBudget(tx, { tenantId: tenantA, orgId: orgA, nodeId: marketing, limit: 1000 });
  });

  nodeB = (
    await inB((tx) => createNode(tx, { tenantId: tenantB, orgId: orgB, type: "team", name: "B" }))
  ).id;
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Decision Engine", () => {
  it("routes to the least-loaded department and records + emits the decision", async () => {
    // Give Sales an active task so Marketing has lower workload.
    const busy = await inA((tx) =>
      createTask(tx, { tenantId: tenantA, orgId: orgA, title: "busy", assignedNodeId: sales }),
    );
    await inA((tx) => markReady(tx, busy.id));
    await inA((tx) => transitionTask(tx, busy.id, "scheduled"));

    const result = await inA((tx) =>
      decideDepartmentRoute(tx, ctx, {
        candidateNodeIds: [marketing, sales],
        preferType: "department",
      }),
    );
    expect(result.outcome).toBe("route");
    expect(result.targetNodeId).toBe(marketing);

    // Decision record stored + event emitted.
    const record = await inA((tx) => getDecision(tx, result.recordId));
    expect(record?.type).toBe("route_department");
    const events = await inA((tx) => listDecisionEvents(tx, result.recordId));
    expect(events.map((e) => e.type)).toContain("decision.route");
  });

  it("routes a ready task to an agent using the Scheduler", async () => {
    const task = await inA((tx) =>
      createTask(tx, {
        tenantId: tenantA,
        orgId: orgA,
        title: "Write",
        costEstimate: 2,
        assignedNodeId: marketing,
        inputData: { requirements: { requiredSkills: ["writing"] } },
      }),
    );
    await inA((tx) => markReady(tx, task.id));
    const candidate: SchedulerCandidate = {
      tenantId: tenantA,
      orgId: orgA,
      definition: createDefinition({
        identity: { agentId: randomUUID(), key: "writer", displayName: "Writer" },
        role: "Writer",
        skills: ["writing"],
      }),
      lifecycle: "hired",
      reputation: 0.7,
      successRate: 0.7,
      avgCost: 1,
      avgLatencyMs: 1000,
      currentLoad: 0,
      concurrencyCap: 5,
    };
    const result = await inA((tx) => decideAgentRoute(tx, ctx, task.id, [candidate]));
    expect(result.outcome).toBe("route");
    expect(result.targetAgentId).toBe(candidate.definition.identity.agentId);
  });

  it("escalates a node to its manages-parent, and denies when there is no parent", async () => {
    const up = await inA((tx) => decideEscalation(tx, ctx, teamA));
    expect(up.outcome).toBe("escalate");
    expect(up.targetNodeId).toBe(marketing);

    const root = await inA((tx) => decideEscalation(tx, ctx, exec));
    expect(root.outcome).toBe("deny");
  });

  it("resolves a conflict via the nearest common ancestor", async () => {
    const result = await inA((tx) => decideConflict(tx, ctx, { aNodeId: teamA, bNodeId: teamB }));
    expect(result.outcome).toBe("escalate");
    expect(result.targetNodeId).toBe(marketing); // NCA of teamA + teamB
  });

  it("handles priority: the higher-priority side wins the conflict", async () => {
    const result = await inA((tx) =>
      decideConflict(tx, ctx, { aNodeId: teamA, bNodeId: teamB, aPriority: 0, bPriority: 3 }),
    );
    expect(result.outcome).toBe("route");
    expect(result.targetNodeId).toBe(teamA);
  });

  it("denies cross-tenant conflict (no common ancestor under RLS)", async () => {
    const result = await inA((tx) => decideConflict(tx, ctx, { aNodeId: teamA, bNodeId: nodeB }));
    expect(result.outcome).toBe("deny");
    expect(result.rationale.reason).toBe("no_common_ancestor");
  });

  it("fails closed on missing/invalid context", async () => {
    await expect(
      inA((tx) => decideEscalation(tx, { tenantId: "bad", orgId: orgA }, teamA)),
    ).rejects.toBeInstanceOf(InvalidDecisionContextError);
  });

  it("denies an unauthorized decision request (recorded)", async () => {
    const principal: UserPrincipal = {
      type: "user",
      id: randomUUID(),
      tenantId: tenantA,
      orgId: orgA,
      roles: [],
      permissions: [], // lacks decision:escalate
    };
    const result = await inA((tx) =>
      decideEscalation(
        tx,
        { tenantId: tenantA, orgId: orgA, principal, requiredPermission: "decision:escalate" },
        teamA,
      ),
    );
    expect(result.outcome).toBe("deny");
    expect(result.basis).toBe("policy");
    const record = await inA((tx) => getDecision(tx, result.recordId));
    expect(record?.outcome).toBe("deny");
  });
});

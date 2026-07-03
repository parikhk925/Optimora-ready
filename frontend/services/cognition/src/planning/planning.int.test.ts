/**
 * Planning Engine integration test (T-8.1) — decompose a goal into a task DAG
 * persisted via the Task Engine, linked to a Plan, assigned to an org node, with
 * budget reservation, audit events, tenant isolation, and fail-closed rollback.
 * Requires the dev Postgres + migrations.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import { createNode, getAvailable, setBudget, BudgetExceededError } from "@optimora/org-graph";
import {
  DagCycleError,
  getPlan,
  listPlanEvents,
  listPlanTasks,
  planGoal,
  type GoalSpec,
  type PlannerProvider,
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

let deptNode: string;

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `pl-${tenantA}`, name: "PL A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `pl-${tenantB}`, name: "PL B" } });
  await sys.organization.create({
    data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" },
  });
  await sys.organization.create({
    data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" },
  });
  deptNode = (
    await inA((tx) =>
      createNode(tx, { tenantId: tenantA, orgId: orgA, type: "department", name: "Marketing" }),
    )
  ).id;
  await inA((tx) =>
    setBudget(tx, { tenantId: tenantA, orgId: orgA, nodeId: deptNode, limit: 100 }),
  );
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

const goal = (overrides: Partial<GoalSpec> = {}): GoalSpec => ({
  tenantId: tenantA,
  orgId: orgA,
  title: "Launch campaign",
  targetNodeId: deptNode,
  ...overrides,
});

describe("Planning Engine", () => {
  it("decomposes a goal into a task DAG linked to a plan, assigned + budgeted", async () => {
    const before = await inA((tx) => getAvailable(tx, deptNode));
    const result = await inA((tx) => planGoal(tx, goal({ budgetNodeId: deptNode })));

    expect(result.plan.status).toBe("active");
    expect(result.taskIds).toHaveLength(3);
    expect(result.plan.budgetReservationId).toBeTruthy();

    // Tasks linked to the plan + assigned to the department node.
    const tasks = await inA((tx) => listPlanTasks(tx, result.plan.id));
    expect(tasks).toHaveLength(3);
    for (const t of tasks) {
      expect(t.planId).toBe(result.plan.id);
      expect(t.assignedNodeId).toBe(deptNode);
    }

    // Dependency DAG: research -> draft -> review (creation order).
    const [research, draft, review] = result.taskIds;
    const deps = await inA((tx) =>
      tx.taskDependency.findMany({ where: { taskId: { in: result.taskIds } } }),
    );
    const has = (task: string, dep: string) =>
      deps.some((d) => d.taskId === task && d.dependsOnTaskId === dep);
    expect(has(draft!, research!)).toBe(true);
    expect(has(review!, draft!)).toBe(true);

    // Budget reserved (4 = 1 + 2 + 1).
    const after = await inA((tx) => getAvailable(tx, deptNode));
    expect(after).toBe((before ?? 0) - 4);

    // Audit events.
    const events = await inA((tx) => listPlanEvents(tx, result.plan.id));
    const types = events.map((e) => e.type);
    expect(types).toContain("plan.created");
    expect(types.filter((t) => t === "plan.task.created")).toHaveLength(3);
    expect(types).toContain("plan.activated");
  });

  it("isolates plans across tenants (RLS)", async () => {
    const result = await inA((tx) => planGoal(tx, goal()));
    expect(await inB((tx) => getPlan(tx, result.plan.id))).toBeNull();
    expect(await inB((tx) => listPlanTasks(tx, result.plan.id))).toHaveLength(0);
  });

  it("rolls back the whole plan when budget is insufficient (fail closed)", async () => {
    const poorNode = (
      await inA((tx) =>
        createNode(tx, { tenantId: tenantA, orgId: orgA, type: "team", name: "Poor" }),
      )
    ).id;
    await inA((tx) =>
      setBudget(tx, { tenantId: tenantA, orgId: orgA, nodeId: poorNode, limit: 1 }),
    );

    await expect(
      inA((tx) =>
        planGoal(tx, goal({ title: "Overbudget", targetNodeId: poorNode, budgetNodeId: poorNode })),
      ),
    ).rejects.toBeInstanceOf(BudgetExceededError);

    // Nothing persisted (transaction rolled back).
    const plans = await inA((tx) => tx.plan.findMany({ where: { title: "Overbudget" } }));
    expect(plans).toHaveLength(0);
  });

  it("rolls back when the planner produces a cyclic blueprint (fail closed)", async () => {
    const cyclicPlanner: PlannerProvider = {
      name: "cyclic",
      decompose: () => ({
        tasks: [
          { key: "a", title: "a", dependsOn: ["b"] },
          { key: "b", title: "b", dependsOn: ["a"] },
        ],
      }),
    };
    await expect(
      inA((tx) => planGoal(tx, goal({ title: "Cyclic" }), cyclicPlanner)),
    ).rejects.toBeInstanceOf(DagCycleError);
    const plans = await inA((tx) => tx.plan.findMany({ where: { title: "Cyclic" } }));
    expect(plans).toHaveLength(0);
  });
});

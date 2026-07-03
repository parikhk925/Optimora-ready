/**
 * Task Engine DB integration test (T-7.2) — creation, lifecycle transitions
 * (valid + invalid), dependency blocking, ready queue, agent ABI validation,
 * budget-reservation linkage, cross-tenant denial, and event emission. Requires
 * the dev Postgres + migrations.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import { createDefinition } from "@optimora/agent-contract";
import { createNode, reserve, setBudget } from "@optimora/org-graph";
import {
  addDependency,
  assignAgent,
  attachBudgetReservation,
  BudgetReservationMissingError,
  createTask,
  DependencyBlockedError,
  getTask,
  InvalidAgentDefinitionError,
  InvalidTaskTransitionError,
  listReadyQueue,
  listTaskEvents,
  markReady,
  TaskNotFoundError,
  transitionTask,
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

const newTask = (title: string, priority = 3) =>
  inA((tx) => createTask(tx, { tenantId: tenantA, orgId: orgA, title, priority }));

async function driveToDone(taskId: string): Promise<void> {
  await inA((tx) => markReady(tx, taskId));
  for (const to of ["scheduled", "in_progress", "in_review", "done"]) {
    await inA((tx) => transitionTask(tx, taskId, to));
  }
}

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `tk-${tenantA}`, name: "TK A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `tk-${tenantB}`, name: "TK B" } });
  await sys.organization.create({
    data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" },
  });
  await sys.organization.create({
    data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" },
  });
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Task Engine", () => {
  it("creates a task in draft and emits a task.created event", async () => {
    const t = await newTask("Write article");
    expect(t.status).toBe("draft");
    const events = await inA((tx) => listTaskEvents(tx, t.id));
    expect(events.map((e) => e.type)).toContain("task.created");
  });

  it("performs valid lifecycle transitions and emits events", async () => {
    const t = await newTask("Lifecycle");
    await inA((tx) => markReady(tx, t.id)); // draft -> ready
    const sched = await inA((tx) => transitionTask(tx, t.id, "scheduled"));
    expect(sched.status).toBe("scheduled");
    const events = await inA((tx) => listTaskEvents(tx, t.id));
    expect(events.filter((e) => e.type === "task.transitioned").length).toBeGreaterThanOrEqual(2);
  });

  it("rejects invalid lifecycle transitions (fail closed)", async () => {
    const t = await newTask("Bad transition");
    await expect(inA((tx) => transitionTask(tx, t.id, "done"))).rejects.toBeInstanceOf(
      InvalidTaskTransitionError,
    );
  });

  it("blocks a task until its dependencies are done", async () => {
    const dep = await newTask("Dependency");
    const t = await newTask("Dependent");
    await inA((tx) => addDependency(tx, tenantA, t.id, dep.id));
    await expect(inA((tx) => markReady(tx, t.id))).rejects.toBeInstanceOf(DependencyBlockedError);

    await driveToDone(dep.id);
    const ready = await inA((tx) => markReady(tx, t.id)); // now unblocked
    expect(ready.status).toBe("ready");
  });

  it("orders the ready queue by priority then deadline", async () => {
    const low = await newTask("Low priority", 5);
    const high = await newTask("High priority", 0);
    await inA((tx) => markReady(tx, low.id));
    await inA((tx) => markReady(tx, high.id));
    const queue = await inA((tx) => listReadyQueue(tx, orgA));
    const idx = (id: string) => queue.findIndex((q) => q.id === id);
    expect(idx(high.id)).toBeLessThan(idx(low.id));
  });

  it("validates the assigned agent definition against the ABI", async () => {
    const t = await newTask("Assign agent");
    const def = createDefinition({
      identity: { agentId: randomUUID(), key: "writer", displayName: "Writer" },
      role: "Writer",
    });
    const assigned = await inA((tx) => assignAgent(tx, t.id, def));
    expect(assigned.assignedAgentId).toBe(def.identity.agentId);
    expect(assigned.assignedAgentVersion).toBe(1);

    // A non-conforming or tampered definition fails closed.
    await expect(inA((tx) => assignAgent(tx, t.id, { role: "x" }))).rejects.toBeInstanceOf(
      InvalidAgentDefinitionError,
    );
    const tampered = { ...def, role: "tampered" };
    await expect(inA((tx) => assignAgent(tx, t.id, tampered))).rejects.toBeInstanceOf(
      InvalidAgentDefinitionError,
    );
  });

  it("links a budget reservation and fails closed on a missing one", async () => {
    const t = await newTask("Budgeted");
    const reservationId = await inA(async (tx) => {
      const node = await createNode(tx, {
        tenantId: tenantA,
        orgId: orgA,
        type: "team",
        name: "BNode",
      });
      await setBudget(tx, { tenantId: tenantA, orgId: orgA, nodeId: node.id, limit: 100 });
      const r = await reserve(tx, { tenantId: tenantA, orgId: orgA, nodeId: node.id, amount: 10 });
      return r.id;
    });
    const linked = await inA((tx) => attachBudgetReservation(tx, t.id, reservationId));
    expect(linked.budgetReservationId).toBe(reservationId);

    await expect(
      inA((tx) => attachBudgetReservation(tx, t.id, randomUUID())),
    ).rejects.toBeInstanceOf(BudgetReservationMissingError);
  });

  it("denies cross-tenant task access (RLS)", async () => {
    const t = await newTask("Tenant A only");
    expect(await inB((tx) => getTask(tx, t.id))).toBeNull();
    await expect(inB((tx) => transitionTask(tx, t.id, "ready"))).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
  });
});

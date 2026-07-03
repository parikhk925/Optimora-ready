/**
 * Budget cascade integration test (T-3.2) — parent/child budgets, ancestor cap,
 * over-budget denial, cross-tenant denial, missing-budget fail-closed, plus
 * reservation / release / spend recording. Requires the dev Postgres + migrations.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import {
  BudgetContextMissingError,
  BudgetExceededError,
  createEdge,
  createNode,
  getAvailable,
  getEffectiveLimit,
  recordSpend,
  release,
  reserve,
  setBudget,
} from "./index.js";

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

let parent: string;
let child: string;
let orphan: string; // child with no budget
let noAncestorBudgetChild: string; // child with budget but parent without
let nodeB: string;

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `bg-${tenantA}`, name: "BG A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `bg-${tenantB}`, name: "BG B" } });
  await sys.organization.create({
    data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" },
  });
  await sys.organization.create({
    data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" },
  });

  await inA(async (tx) => {
    const p = await createNode(tx, {
      tenantId: tenantA,
      orgId: orgA,
      type: "department",
      name: "Parent",
    });
    const c = await createNode(tx, { tenantId: tenantA, orgId: orgA, type: "team", name: "Child" });
    const o = await createNode(tx, {
      tenantId: tenantA,
      orgId: orgA,
      type: "team",
      name: "Orphan",
    });
    const noAnc = await createNode(tx, {
      tenantId: tenantA,
      orgId: orgA,
      type: "team",
      name: "NoAncBudget",
    });
    const noAncParent = await createNode(tx, {
      tenantId: tenantA,
      orgId: orgA,
      type: "department",
      name: "NoBudgetParent",
    });
    parent = p.id;
    child = c.id;
    orphan = o.id;
    noAncestorBudgetChild = noAnc.id;
    await createEdge(tx, {
      tenantId: tenantA,
      orgId: orgA,
      fromNodeId: p.id,
      toNodeId: c.id,
      type: "manages",
    });
    await createEdge(tx, {
      tenantId: tenantA,
      orgId: orgA,
      fromNodeId: noAncParent.id,
      toNodeId: noAnc.id,
      type: "manages",
    });

    // Parent limit 100, child's own limit 1000 (capped to 100 by the parent).
    await setBudget(tx, { tenantId: tenantA, orgId: orgA, nodeId: p.id, limit: 100 });
    await setBudget(tx, { tenantId: tenantA, orgId: orgA, nodeId: c.id, limit: 1000 });
    // noAncestorBudgetChild has a budget but its parent does NOT.
    await setBudget(tx, { tenantId: tenantA, orgId: orgA, nodeId: noAnc.id, limit: 500 });
  });

  const b = await inB((tx) =>
    createNode(tx, { tenantId: tenantB, orgId: orgB, type: "team", name: "B" }),
  );
  await inB((tx) => setBudget(tx, { tenantId: tenantB, orgId: orgB, nodeId: b.id, limit: 50 }));
  nodeB = b.id;
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Budget cascade", () => {
  it("reports the parent's own effective limit", async () => {
    const eff = await inA((tx) => getEffectiveLimit(tx, parent));
    expect(eff?.effectiveLimit).toBe(100);
  });

  it("caps a child's effective limit at the ancestor limit", async () => {
    const eff = await inA((tx) => getEffectiveLimit(tx, child));
    // child's own limit is 1000 but the parent caps it at 100
    expect(eff?.effectiveLimit).toBe(100);
    expect(eff?.chain).toContain(parent);
  });

  it("denies an over-budget reservation", async () => {
    await expect(
      inA((tx) => reserve(tx, { tenantId: tenantA, orgId: orgA, nodeId: child, amount: 150 })),
    ).rejects.toBeInstanceOf(BudgetExceededError);
  });

  it("fails closed when the node has no budget", async () => {
    expect(await inA((tx) => getEffectiveLimit(tx, orphan))).toBeNull();
    await expect(
      inA((tx) => reserve(tx, { tenantId: tenantA, orgId: orgA, nodeId: orphan, amount: 1 })),
    ).rejects.toBeInstanceOf(BudgetContextMissingError);
  });

  it("fails closed when an ancestor budget is missing", async () => {
    expect(await inA((tx) => getEffectiveLimit(tx, noAncestorBudgetChild))).toBeNull();
    await expect(
      inA((tx) =>
        reserve(tx, { tenantId: tenantA, orgId: orgA, nodeId: noAncestorBudgetChild, amount: 1 }),
      ),
    ).rejects.toBeInstanceOf(BudgetContextMissingError);
  });

  it("denies cross-tenant budget access (RLS)", async () => {
    // Tenant A cannot see tenant B's node/budget.
    expect(await inA((tx) => getEffectiveLimit(tx, nodeB))).toBeNull();
    await expect(
      inA((tx) => reserve(tx, { tenantId: tenantA, orgId: orgA, nodeId: nodeB, amount: 1 })),
    ).rejects.toBeInstanceOf(BudgetContextMissingError);
  });

  it("reserves, then releases, restoring availability", async () => {
    const before = await inA((tx) => getAvailable(tx, child));
    const r = await inA((tx) =>
      reserve(tx, { tenantId: tenantA, orgId: orgA, nodeId: child, amount: 40 }),
    );
    const afterReserve = await inA((tx) => getAvailable(tx, child));
    expect(afterReserve).toBe((before ?? 0) - 40);

    const freed = await inA((tx) => release(tx, r.id));
    expect(freed).toBe(true);
    const afterRelease = await inA((tx) => getAvailable(tx, child));
    expect(afterRelease).toBe(before);
  });

  it("records spend (direct and via a committed reservation)", async () => {
    const start = await inA((tx) => getAvailable(tx, child));
    await inA((tx) =>
      recordSpend(tx, {
        tenantId: tenantA,
        orgId: orgA,
        nodeId: child,
        amount: 30,
        description: "direct",
      }),
    );
    const afterDirect = await inA((tx) => getAvailable(tx, child));
    expect(afterDirect).toBe((start ?? 0) - 30);

    // Reserve 20, then record spend committing that reservation -> net -20 more.
    const r = await inA((tx) =>
      reserve(tx, { tenantId: tenantA, orgId: orgA, nodeId: child, amount: 20 }),
    );
    await inA((tx) =>
      recordSpend(tx, {
        tenantId: tenantA,
        orgId: orgA,
        nodeId: child,
        amount: 20,
        reservationId: r.id,
      }),
    );
    const afterCommit = await inA((tx) => getAvailable(tx, child));
    expect(afterCommit).toBe((afterDirect ?? 0) - 20);
  });
});

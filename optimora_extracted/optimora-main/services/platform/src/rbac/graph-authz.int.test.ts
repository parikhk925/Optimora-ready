/**
 * ReBAC-over-Org-Graph integration test (T-2.7). Builds a real org graph and
 * proves relationship-derived authorization flows through the existing
 * authorize() pipeline, with RBAC/ABAC preserved and fail-closed isolation.
 * Requires the dev Postgres + migrations.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import { createEdge, createNode } from "@optimora/org-graph";
import type { UserPrincipal } from "@optimora/auth-core";
import { authorizeWithOrgGraph } from "./graph-authz.js";

const sys = getSystemPrisma();
const prisma = getPrisma();
const tenantA = randomUUID();
const orgA = randomUUID();
const tenantB = randomUUID();
const orgB = randomUUID();

// Org graph node ids (tenant A).
let exec: string;
let deptA: string;
let teamA: string;
let deptB: string;
let delegTarget: string;
let reportNode: string;
let nodeB: string; // tenant B

const ACTION = "org_node:manage";
const principal = (): UserPrincipal => ({
  type: "user",
  id: randomUUID(),
  tenantId: tenantA,
  orgId: orgA,
  roles: [],
  permissions: [],
});

const inA = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, fn);

async function graphAuth(input: {
  principal?: UserPrincipal;
  principalNodeId?: string;
  resourceNodeId?: string;
  relation: "manages" | "reports_to" | "delegates_to" | "subtree";
}): Promise<boolean> {
  const res = await inA((tx) =>
    authorizeWithOrgGraph(tx, {
      principal: input.principal ?? principal(),
      principalNodeId: input.principalNodeId,
      resourceNodeId: input.resourceNodeId,
      relation: input.relation,
      action: ACTION,
      requiredPermission: ACTION,
    }),
  );
  return res.decision.allowed;
}

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `gx-${tenantA}`, name: "GX A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `gx-${tenantB}`, name: "GX B" } });
  await sys.organization.create({
    data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" },
  });
  await sys.organization.create({
    data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" },
  });

  await inA(async (tx) => {
    const mk = (type: "executive" | "department" | "team" | "manager" | "agent", name: string) =>
      createNode(tx, { tenantId: tenantA, orgId: orgA, type, name });
    const e = await mk("executive", "CEO");
    const dA = await mk("department", "DeptA");
    const tA = await mk("team", "TeamA");
    const dB = await mk("department", "DeptB");
    const dg = await mk("department", "Delegated");
    const rn = await mk("agent", "Reporter");
    exec = e.id;
    deptA = dA.id;
    teamA = tA.id;
    deptB = dB.id;
    delegTarget = dg.id;
    reportNode = rn.id;
    const edge = (from: string, to: string, type: "manages" | "delegates_to" | "reports_to") =>
      createEdge(tx, { tenantId: tenantA, orgId: orgA, fromNodeId: from, toNodeId: to, type });
    await edge(exec, deptA, "manages"); // exec -> deptA -> teamA (managed subtree)
    await edge(deptA, teamA, "manages");
    await edge(exec, delegTarget, "delegates_to"); // delegated authority
    await edge(reportNode, exec, "reports_to"); // reporter reports up to exec
  });

  const b = await withTenantContext(prisma, { tenantId: tenantB, orgId: orgB }, (tx) =>
    createNode(tx, { tenantId: tenantB, orgId: orgB, type: "team", name: "B-team" }),
  );
  nodeB = b.id;
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("ReBAC over Org Graph", () => {
  it("allows a manager to act on a node in their managed subtree", async () => {
    expect(
      await graphAuth({ principalNodeId: exec, resourceNodeId: teamA, relation: "subtree" }),
    ).toBe(true);
    expect(
      await graphAuth({ principalNodeId: exec, resourceNodeId: deptA, relation: "manages" }),
    ).toBe(true);
  });

  it("denies a manager acting outside their subtree", async () => {
    expect(
      await graphAuth({ principalNodeId: exec, resourceNodeId: deptB, relation: "subtree" }),
    ).toBe(false);
  });

  it("honors delegated authority only along valid delegates_to edges", async () => {
    expect(
      await graphAuth({
        principalNodeId: exec,
        resourceNodeId: delegTarget,
        relation: "delegates_to",
      }),
    ).toBe(true);
    expect(
      await graphAuth({ principalNodeId: exec, resourceNodeId: teamA, relation: "delegates_to" }),
    ).toBe(false);
  });

  it("honors reports_to relationships", async () => {
    expect(
      await graphAuth({
        principalNodeId: exec,
        resourceNodeId: reportNode,
        relation: "reports_to",
      }),
    ).toBe(true);
    expect(
      await graphAuth({ principalNodeId: exec, resourceNodeId: deptB, relation: "reports_to" }),
    ).toBe(false);
  });

  it("denies cross-tenant graph relationships", async () => {
    // Tenant A principal trying to reach a tenant B node: RLS hides it -> deny.
    expect(
      await graphAuth({ principalNodeId: exec, resourceNodeId: nodeB, relation: "subtree" }),
    ).toBe(false);
  });

  it("denies when graph context is missing or malformed", async () => {
    expect(
      await graphAuth({ principalNodeId: exec, resourceNodeId: undefined, relation: "subtree" }),
    ).toBe(false);
    expect(
      await graphAuth({ principalNodeId: undefined, resourceNodeId: teamA, relation: "subtree" }),
    ).toBe(false);
    expect(
      await graphAuth({
        principalNodeId: "not-a-uuid",
        resourceNodeId: teamA,
        relation: "subtree",
      }),
    ).toBe(false);
  });

  it("preserves base RBAC: a principal with the permission is allowed regardless of graph", async () => {
    const withPerm: UserPrincipal = { ...principal(), permissions: [ACTION] };
    // Outside the subtree, but base RBAC grants the permission -> allowed.
    expect(
      await graphAuth({
        principal: withPerm,
        principalNodeId: exec,
        resourceNodeId: deptB,
        relation: "subtree",
      }),
    ).toBe(true);
  });
});

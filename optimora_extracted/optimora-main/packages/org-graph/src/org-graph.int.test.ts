/**
 * Org Graph integration test (T-3.1) — node/edge creation, recursive-CTE
 * traversal, cycle rejection, cross-tenant denial (RLS), versioning, and
 * reconciliation event generation. Requires the dev Postgres + migrations.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import {
  ancestors,
  createEdge,
  createNode,
  CycleError,
  descendants,
  getNode,
  listNodeVersions,
  listNodes,
  listOrgEvents,
  NodeNotFoundError,
  reconcileOrg,
  updateNode,
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

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `og-${tenantA}`, name: "OG A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `og-${tenantB}`, name: "OG B" } });
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

describe("Org Graph store", () => {
  it("creates typed nodes (version 1) and reads them back", async () => {
    const ceo = await inA((tx) =>
      createNode(tx, { tenantId: tenantA, orgId: orgA, type: "executive", name: "CEO" }),
    );
    expect(ceo.type).toBe("executive");
    expect(ceo.version).toBe(1);
    const fetched = await inA((tx) => getNode(tx, ceo.id));
    expect(fetched?.name).toBe("CEO");
  });

  it("creates edges and traverses the hierarchy via recursive CTEs", async () => {
    const { ceo, dept, team } = await inA(async (tx) => {
      const ceo = await createNode(tx, {
        tenantId: tenantA,
        orgId: orgA,
        type: "executive",
        name: "CEO2",
      });
      const dept = await createNode(tx, {
        tenantId: tenantA,
        orgId: orgA,
        type: "department",
        name: "Marketing",
      });
      const team = await createNode(tx, {
        tenantId: tenantA,
        orgId: orgA,
        type: "team",
        name: "Content",
      });
      await createEdge(tx, {
        tenantId: tenantA,
        orgId: orgA,
        fromNodeId: ceo.id,
        toNodeId: dept.id,
        type: "manages",
      });
      await createEdge(tx, {
        tenantId: tenantA,
        orgId: orgA,
        fromNodeId: dept.id,
        toNodeId: team.id,
        type: "manages",
      });
      return { ceo, dept, team };
    });

    const desc = await inA((tx) => descendants(tx, ceo.id, "manages"));
    const descIds = desc.map((d) => d.id);
    expect(descIds).toContain(dept.id);
    expect(descIds).toContain(team.id);

    const anc = await inA((tx) => ancestors(tx, team.id, "manages"));
    const ancIds = anc.map((a) => a.id);
    expect(ancIds).toContain(dept.id);
    expect(ancIds).toContain(ceo.id);
  });

  it("rejects edges that would create a cycle (hierarchical)", async () => {
    const { a, c } = await inA(async (tx) => {
      const a = await createNode(tx, {
        tenantId: tenantA,
        orgId: orgA,
        type: "manager",
        name: "A",
      });
      const b = await createNode(tx, {
        tenantId: tenantA,
        orgId: orgA,
        type: "manager",
        name: "B",
      });
      const c = await createNode(tx, {
        tenantId: tenantA,
        orgId: orgA,
        type: "manager",
        name: "C",
      });
      await createEdge(tx, {
        tenantId: tenantA,
        orgId: orgA,
        fromNodeId: a.id,
        toNodeId: b.id,
        type: "manages",
      });
      await createEdge(tx, {
        tenantId: tenantA,
        orgId: orgA,
        fromNodeId: b.id,
        toNodeId: c.id,
        type: "manages",
      });
      return { a, c };
    });
    // c -> a would close the cycle a->b->c->a
    await expect(
      inA((tx) =>
        createEdge(tx, {
          tenantId: tenantA,
          orgId: orgA,
          fromNodeId: c.id,
          toNodeId: a.id,
          type: "manages",
        }),
      ),
    ).rejects.toBeInstanceOf(CycleError);
    // self-loop
    await expect(
      inA((tx) =>
        createEdge(tx, {
          tenantId: tenantA,
          orgId: orgA,
          fromNodeId: a.id,
          toNodeId: a.id,
          type: "manages",
        }),
      ),
    ).rejects.toBeInstanceOf(CycleError);
  });

  it("isolates tenants (RLS): tenant B cannot see or link tenant A nodes", async () => {
    const node = await inA((tx) =>
      createNode(tx, { tenantId: tenantA, orgId: orgA, type: "agent", name: "Secret" }),
    );
    const seen = await inB((tx) => getNode(tx, node.id));
    expect(seen).toBeNull();
    const listB = await inB((tx) => listNodes(tx));
    expect(listB.map((n) => n.id)).not.toContain(node.id);
    // Creating an edge in B referencing A's node fails (node not visible).
    const bNode = await inB((tx) =>
      createNode(tx, { tenantId: tenantB, orgId: orgB, type: "agent", name: "B-agent" }),
    );
    await expect(
      inB((tx) =>
        createEdge(tx, {
          tenantId: tenantB,
          orgId: orgB,
          fromNodeId: bNode.id,
          toNodeId: node.id,
          type: "manages",
        }),
      ),
    ).rejects.toBeInstanceOf(NodeNotFoundError);
  });

  it("versions nodes and snapshots each change", async () => {
    const n = await inA((tx) =>
      createNode(tx, { tenantId: tenantA, orgId: orgA, type: "team", name: "v1" }),
    );
    const u = await inA((tx) => updateNode(tx, n.id, { name: "v2", data: { goal: "x" } }));
    expect(u.version).toBe(2);
    const versions = await inA((tx) => listNodeVersions(tx, n.id));
    expect(versions.map((v) => v.version)).toEqual([1, 2]);
    expect(versions[0]!.name).toBe("v1");
    expect(versions[1]!.name).toBe("v2");
  });

  it("generates reconciliation events for structural gaps", async () => {
    const recOrg = randomUUID();
    await sys.organization.create({
      data: { id: recOrg, tenantId: tenantA, slug: "rec", name: "Rec Org" },
    });
    const orphan = await withTenantContext(prisma, { tenantId: tenantA, orgId: recOrg }, (tx) =>
      createNode(tx, { tenantId: tenantA, orgId: recOrg, type: "department", name: "Unmanaged" }),
    );

    const result = await withTenantContext(prisma, { tenantId: tenantA, orgId: recOrg }, (tx) =>
      reconcileOrg(tx, tenantA, recOrg),
    );
    expect(
      result.actions.some((a) => a.action === "unmanaged_node" && a.nodeId === orphan.id),
    ).toBe(true);

    const events = await withTenantContext(prisma, { tenantId: tenantA, orgId: recOrg }, (tx) =>
      listOrgEvents(tx, recOrg),
    );
    const types = events.map((e) => e.type);
    expect(types).toContain("reconcile.tick");
    expect(types).toContain("reconcile.action");
  });
});

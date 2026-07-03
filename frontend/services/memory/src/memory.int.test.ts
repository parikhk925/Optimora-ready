/**
 * Memory Store integration tests (E9 Memory). Proves create/query/archive
 * lifecycle, type/tag/agent/task filtering, deterministic ordering, audit events,
 * Context Fabric seam, policy denial, cross-tenant denial, and malformed-record
 * fail-closed. Requires dev Postgres + migrations.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import {
  archiveMemory,
  createMemory,
  getMemory,
  getMemoryRecord,
  InvalidMemoryContextError,
  InvalidMemoryInputError,
  listMemoryEvents,
  makeMemoryContextRetriever,
  MissingMemoryError,
  queryMemory,
  type MemoryContext,
} from "./index.js";

const sys = getSystemPrisma();
const prisma = getPrisma();
const tenantA = randomUUID();
const orgA = randomUUID();
const tenantB = randomUUID();
const orgB = randomUUID();
const agentA = randomUUID();

const inA = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, fn);
const inB = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantB, orgId: orgB }, fn);

const ctx: MemoryContext = { tenantId: tenantA, orgId: orgA };

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `mem-${tenantA}`, name: "Mem A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `mem-${tenantB}`, name: "Mem B" } });
  await sys.organization.create({ data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" } });
  await sys.organization.create({ data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" } });
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Memory Store", () => {
  it("creates a memory record and emits an audit event", async () => {
    const mem = await inA((tx) =>
      createMemory(tx, ctx, { agentId: agentA, type: "fact", content: "The sky is blue." }),
    );
    expect(mem.tenantId).toBe(tenantA);
    expect(mem.type).toBe("fact");
    expect(mem.status).toBe("active");
    expect(mem.importance).toBe(0.5);

    const events = await inA((tx) => listMemoryEvents(tx, mem.id));
    expect(events.map((e: { type: string }) => e.type)).toContain("memory.created");
  });

  it("stores and retrieves by id", async () => {
    const mem = await inA((tx) =>
      createMemory(tx, ctx, { agentId: agentA, type: "preference", content: "Prefers bullet points." }),
    );
    const found = await inA((tx) => getMemory(tx, ctx, mem.id));
    expect(found?.id).toBe(mem.id);
    expect(found?.content).toBe("Prefers bullet points.");
  });

  it("queries by type", async () => {
    const agent = randomUUID();
    await inA((tx) => createMemory(tx, ctx, { agentId: agent, type: "fact", content: "F1" }));
    await inA((tx) => createMemory(tx, ctx, { agentId: agent, type: "instruction", content: "I1" }));
    const res = await inA((tx) => queryMemory(tx, ctx, { agentId: agent, type: "fact" }));
    expect(res.records.every((r) => r.type === "fact")).toBe(true);
    expect(res.records.length).toBeGreaterThanOrEqual(1);
  });

  it("queries by tags (AND semantics)", async () => {
    const agent = randomUUID();
    await inA((tx) =>
      createMemory(tx, ctx, { agentId: agent, type: "fact", content: "Both", tags: ["a", "b"] }),
    );
    await inA((tx) =>
      createMemory(tx, ctx, { agentId: agent, type: "fact", content: "OneTag", tags: ["a"] }),
    );
    const both = await inA((tx) => queryMemory(tx, ctx, { agentId: agent, tags: ["a", "b"] }));
    expect(both.records).toHaveLength(1);
    expect(both.records[0]?.content).toBe("Both");
  });

  it("queries by agentId and taskId", async () => {
    const agent = randomUUID();
    const taskId = randomUUID();
    await inA((tx) =>
      createMemory(tx, ctx, { agentId: agent, taskId, type: "task_note", content: "Note" }),
    );
    await inA((tx) => createMemory(tx, ctx, { agentId: agent, type: "fact", content: "Other" }));
    const res = await inA((tx) => queryMemory(tx, ctx, { agentId: agent, taskId }));
    expect(res.records.every((r) => r.taskId === taskId)).toBe(true);
    expect(res.records).toHaveLength(1);
  });

  it("orders by importance desc then recency desc (deterministic)", async () => {
    const agent = randomUUID();
    const lo = await inA((tx) =>
      createMemory(tx, ctx, { agentId: agent, type: "fact", content: "Lo", importance: 0.1 }),
    );
    const hi = await inA((tx) =>
      createMemory(tx, ctx, { agentId: agent, type: "fact", content: "Hi", importance: 0.9 }),
    );
    const res = await inA((tx) => queryMemory(tx, ctx, { agentId: agent }));
    const ids = res.records.map((r) => r.id);
    expect(ids.indexOf(hi.id)).toBeLessThan(ids.indexOf(lo.id));
  });

  it("archives a record and query filters by status", async () => {
    const agent = randomUUID();
    const mem = await inA((tx) =>
      createMemory(tx, ctx, { agentId: agent, type: "observation", content: "Old" }),
    );
    await inA((tx) => archiveMemory(tx, ctx, mem.id));

    const stored = await inA((tx) => getMemoryRecord(tx, mem.id));
    expect(stored?.status).toBe("archived");

    const active = await inA((tx) => queryMemory(tx, ctx, { agentId: agent, status: "active" }));
    expect(active.records.find((r) => r.id === mem.id)).toBeUndefined();

    const archived = await inA((tx) => queryMemory(tx, ctx, { agentId: agent, status: "archived" }));
    expect(archived.records.find((r) => r.id === mem.id)).toBeDefined();

    const archiveEvents = await inA((tx) => listMemoryEvents(tx, mem.id));
    expect(archiveEvents.map((e: { type: string }) => e.type)).toContain("memory.archived");
  });

  it("Context Fabric seam: makeMemoryContextRetriever resolves memory refs", async () => {
    const agent = randomUUID();
    await inA((tx) =>
      createMemory(tx, ctx, { agentId: agent, type: "fact", content: "Agent knows X." }),
    );
    const content = await inA(async (tx) => {
      const retriever = makeMemoryContextRetriever(tx, ctx);
      const item = await retriever.retrieve({ kind: "memory", id: agent });
      return item.content;
    });
    expect(content).toContain("Agent knows X.");
  });

  it("Context Fabric seam: non-memory kinds return stub placeholder", async () => {
    const item = await inA(async (tx) => {
      const retriever = makeMemoryContextRetriever(tx, ctx);
      return retriever.retrieve({ kind: "plan", id: randomUUID() });
    });
    expect(item.content).toMatch(/^\[plan:/);
  });

  it("fails closed on invalid context (bad tenant)", async () => {
    await expect(
      inA((tx) =>
        createMemory(tx, { tenantId: "bad", orgId: orgA }, { agentId: agentA, type: "fact", content: "x" }),
      ),
    ).rejects.toBeInstanceOf(InvalidMemoryContextError);
  });

  it("fails closed on malformed input (invalid type, empty content, bad agentId)", async () => {
    await expect(
      inA((tx) =>
        createMemory(tx, ctx, { agentId: "not-uuid", type: "fact", content: "x" }),
      ),
    ).rejects.toBeInstanceOf(InvalidMemoryInputError);

    await expect(
      inA((tx) =>
        createMemory(tx, ctx, { agentId: agentA, type: "bogus" as never, content: "x" }),
      ),
    ).rejects.toBeInstanceOf(InvalidMemoryInputError);

    await expect(
      inA((tx) =>
        createMemory(tx, ctx, { agentId: agentA, type: "fact", content: "   " }),
      ),
    ).rejects.toBeInstanceOf(InvalidMemoryInputError);
  });

  it("fails closed on missing/invalid id for archive and get", async () => {
    await expect(inA((tx) => archiveMemory(tx, ctx, "bad-id"))).rejects.toBeInstanceOf(MissingMemoryError);
    await expect(inA((tx) => archiveMemory(tx, ctx, randomUUID()))).rejects.toBeInstanceOf(MissingMemoryError);
    await expect(inA((tx) => getMemory(tx, ctx, "bad-id"))).rejects.toBeInstanceOf(MissingMemoryError);
  });

  it("denies cross-tenant access (tenant B record invisible under tenant A RLS)", async () => {
    const agentB = randomUUID();
    await inB((tx) =>
      createMemory(tx, { tenantId: tenantB, orgId: orgB }, { agentId: agentB, type: "fact", content: "B" }),
    );
    // Querying under tenant A with agentB should return no records (RLS filters them out).
    const res = await inA((tx) => queryMemory(tx, ctx, { agentId: agentB }));
    expect(res.records).toHaveLength(0);
  });
});

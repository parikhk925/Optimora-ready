/**
 * Context Fabric integration test (T-9.x). Proves deterministic assembly from
 * task/agent/input/org-node/cognition-refs, deterministic budget truncation,
 * assembly-record storage + audit events, retriever seam wiring, and fail-closed
 * behavior on bad context, invalid task/agent, malformed refs, bad budget, and
 * cross-tenant access. Requires the dev Postgres + migrations.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import { createDefinition, type AgentDefinition } from "@optimora/agent-contract";
import { createTask } from "@optimora/execution";
import {
  assembleContext,
  getAssembly,
  listContextEvents,
  InvalidContextBudgetError,
  InvalidContextContextError,
  InvalidContextRefError,
  MissingContextError,
  type ContextFabricContext,
  type ContextRetriever,
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

const ctx: ContextFabricContext = { tenantId: tenantA, orgId: orgA };

function def(over: Partial<Parameters<typeof createDefinition>[0]> = {}): AgentDefinition {
  return createDefinition({
    identity: { agentId: randomUUID(), key: "writer", displayName: "Writer" },
    role: "Writer",
    outputSchema: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"] },
    ...over,
  });
}

async function task(title = "Brief"): Promise<string> {
  return inA(async (tx) => {
    const t = await createTask(tx, { tenantId: tenantA, orgId: orgA, title });
    return t.id;
  });
}

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `cx-${tenantA}`, name: "CX A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `cx-${tenantB}`, name: "CX B" } });
  await sys.organization.create({ data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" } });
  await sys.organization.create({ data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" } });
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Context Fabric", () => {
  it("assembles context, stores the assembly, emits an event", async () => {
    const taskId = await task();
    const res = await inA((tx) =>
      assembleContext(tx, ctx, { taskId, definition: def(), input: { topic: "x" } }),
    );

    expect(res.assembly.status).toBe("assembled");
    expect(res.truncated).toBe(false);
    expect(res.usedTokens).toBeGreaterThan(0);
    expect(res.sections.map((s) => s.kind)).toEqual(["agent", "task", "input"]);

    const stored = await inA((tx) => getAssembly(tx, res.assembly.id));
    expect(stored?.status).toBe("assembled");
    expect(stored?.retriever).toBe("stub");

    const events = await inA((tx) => listContextEvents(tx, res.assembly.id));
    expect(events.map((e: { type: string }) => e.type)).toContain("context.assembled");
  });

  it("is deterministic for the same inputs", async () => {
    const taskId = await task("Same");
    const d = def();
    const a = await inA((tx) => assembleContext(tx, ctx, { taskId, definition: d, input: { a: 1 } }));
    const b = await inA((tx) => assembleContext(tx, ctx, { taskId, definition: d, input: { a: 1 } }));
    expect(a.sections.map((s) => s.content)).toEqual(b.sections.map((s) => s.content));
    expect(a.usedTokens).toBe(b.usedTokens);
  });

  it("folds cognition refs in via the retriever seam", async () => {
    const taskId = await task();
    const planId = randomUUID();
    const res = await inA((tx) =>
      assembleContext(tx, ctx, { taskId, definition: def(), refs: { planId } }),
    );
    const plan = res.sections.find((s) => s.kind === "plan");
    expect(plan?.id).toBe(planId);
    expect(plan?.content).toBe(`[plan:${planId}]`);
  });

  it("supports a custom retriever (no real retrieval/paid calls)", async () => {
    const taskId = await task();
    const planId = randomUUID();
    const retriever: ContextRetriever = {
      name: "custom",
      retrieve: (ref) => ({ ref, content: `custom-${ref.id}` }),
    };
    const res = await inA((tx) =>
      assembleContext(tx, ctx, { taskId, definition: def(), refs: { planId } }, { retriever }),
    );
    expect(res.assembly.retriever).toBe("custom");
    expect(res.sections.find((s) => s.kind === "plan")?.content).toBe(`custom-${planId}`);
  });

  it("applies deterministic budget truncation", async () => {
    const taskId = await task();
    const res = await inA((tx) =>
      assembleContext(tx, ctx, { taskId, definition: def(), input: { topic: "x" }, budget: { maxTokens: 1 } }),
    );
    expect(res.truncated).toBe(true);
    expect(res.usedTokens).toBeLessThanOrEqual(1);
  });

  it("fails closed on invalid tenant/org context", async () => {
    const taskId = await task();
    await expect(
      inA((tx) => assembleContext(tx, { tenantId: "bad", orgId: orgA }, { taskId, definition: def() })),
    ).rejects.toBeInstanceOf(InvalidContextContextError);
  });

  it("fails closed on invalid agent and missing task", async () => {
    const taskId = await task();
    await expect(
      inA((tx) =>
        assembleContext(tx, ctx, { taskId, definition: { bogus: true } as unknown as AgentDefinition }),
      ),
    ).rejects.toBeInstanceOf(MissingContextError);
    await expect(
      inA((tx) => assembleContext(tx, ctx, { taskId: randomUUID(), definition: def() })),
    ).rejects.toBeInstanceOf(MissingContextError);
  });

  it("fails closed on malformed refs and a non-positive budget", async () => {
    const taskId = await task();
    await expect(
      inA((tx) => assembleContext(tx, ctx, { taskId, definition: def(), refs: { planId: "not-a-uuid" } })),
    ).rejects.toBeInstanceOf(InvalidContextRefError);
    await expect(
      inA((tx) => assembleContext(tx, ctx, { taskId, definition: def(), budget: { maxTokens: 0 } })),
    ).rejects.toBeInstanceOf(InvalidContextBudgetError);
  });

  it("denies cross-tenant access (task in tenant B invisible under tenant A RLS)", async () => {
    const tB = await inB((tx) => createTask(tx, { tenantId: tenantB, orgId: orgB, title: "B" }));
    await expect(
      inA((tx) => assembleContext(tx, ctx, { taskId: tB.id, definition: def() })),
    ).rejects.toBeInstanceOf(MissingContextError);
  });
});

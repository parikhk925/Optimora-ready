/**
 * Agent Runtime Core integration test (T-9.1). Proves deterministic end-to-end
 * execution, ABI I/O validation, tool authorization, run-state + missing-context
 * fail-closed, cross-tenant denial, run-record storage/immutability, task
 * transitions through the existing Task Engine, and runtime events. Requires the
 * dev Postgres + migrations.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import { createDefinition, type AgentDefinition } from "@optimora/agent-contract";
import { createTask, getTask, markReady, transitionTask } from "@optimora/execution";
import {
  executeRun,
  getRun,
  listRuntimeEvents,
  InvalidRuntimeContextError,
  InvalidRunStateError,
  InvalidRuntimeInputError,
  MissingRuntimeContextError,
  type ModelProvider,
  type RuntimeContext,
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

const ctx: RuntimeContext = { tenantId: tenantA, orgId: orgA };

function def(over: Partial<Parameters<typeof createDefinition>[0]> = {}): AgentDefinition {
  return createDefinition({
    identity: { agentId: randomUUID(), key: "writer", displayName: "Writer" },
    role: "Writer",
    outputSchema: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"] },
    ...over,
  });
}

/** Create a task and advance it to `scheduled` (the runtime's required entry state). */
async function scheduledTask(title = "Brief"): Promise<string> {
  return inA(async (tx) => {
    const t = await createTask(tx, { tenantId: tenantA, orgId: orgA, title });
    await markReady(tx, t.id);
    await transitionTask(tx, t.id, "scheduled");
    return t.id;
  });
}

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `rt-${tenantA}`, name: "RT A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `rt-${tenantB}`, name: "RT B" } });
  await sys.organization.create({ data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" } });
  await sys.organization.create({ data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" } });
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Agent Runtime Core", () => {
  it("runs a scheduled task end-to-end, stores the run, emits events, advances the task", async () => {
    const taskId = await scheduledTask();
    const d = def();
    const res = await inA((tx) => executeRun(tx, ctx, { taskId, definition: d, input: { topic: "x" } }));

    expect(res.run.status).toBe("succeeded");
    expect(typeof res.output.summary).toBe("string");
    expect(res.taskStatus).toBe("in_review");
    expect(res.run.tokensIn).toBeGreaterThan(0);

    const stored = await inA((tx) => getRun(tx, res.run.id));
    expect(stored?.status).toBe("succeeded");
    expect(stored?.agentVersion).toBe(d.version);

    const task = await inA((tx) => getTask(tx, taskId));
    expect(task?.status).toBe("in_review");

    const events = await inA((tx) => listRuntimeEvents(tx, res.run.id));
    expect(events.map((e) => e.type)).toEqual(
      expect.arrayContaining(["runtime.started", "runtime.succeeded"]),
    );
  });

  it("keeps the run input immutable across execution", async () => {
    const taskId = await scheduledTask();
    const res = await inA((tx) =>
      executeRun(tx, ctx, { taskId, definition: def(), input: { topic: "keep" } }),
    );
    const stored = await inA((tx) => getRun(tx, res.run.id));
    expect(stored?.input).toEqual({ topic: "keep" });
  });

  it("runs an authorized tool requested by the model", async () => {
    const taskId = await scheduledTask();
    const provider: ModelProvider = {
      name: "tool-asking",
      complete: () => ({
        output: { summary: "done" },
        toolCalls: [{ name: "echo", args: { a: 1 } }],
        tokensIn: 1,
        tokensOut: 1,
      }),
    };
    const d = def({ tools: [{ name: "echo", scopes: [] }] });
    const res = await inA((tx) =>
      executeRun(tx, ctx, { taskId, definition: d, input: {} }, { model: provider }),
    );
    expect(res.run.status).toBe("succeeded");
    expect(res.run.toolCalls).toHaveLength(1);
    expect(res.run.toolCalls[0]?.name).toBe("echo");
  });

  it("denies an unauthorized tool (run + task fail closed)", async () => {
    const taskId = await scheduledTask();
    const provider: ModelProvider = {
      name: "rogue",
      complete: () => ({
        output: { summary: "x" },
        toolCalls: [{ name: "ghost", args: {} }],
        tokensIn: 1,
        tokensOut: 1,
      }),
    };
    const res = await inA((tx) =>
      executeRun(tx, ctx, { taskId, definition: def(), input: {} }, { model: provider }),
    );
    expect(res.run.status).toBe("failed");
    expect(res.run.failureReason).toContain("ghost");
    expect(res.taskStatus).toBe("failed");
    const task = await inA((tx) => getTask(tx, taskId));
    expect(task?.status).toBe("failed");
  });

  it("fails closed on output that violates the ABI output schema", async () => {
    const taskId = await scheduledTask();
    const provider: ModelProvider = {
      name: "bad-output",
      complete: () => ({ output: {}, tokensIn: 1, tokensOut: 1 }), // missing required `summary`
    };
    const res = await inA((tx) =>
      executeRun(tx, ctx, { taskId, definition: def(), input: {} }, { model: provider }),
    );
    expect(res.run.status).toBe("failed");
    expect(res.taskStatus).toBe("failed");
  });

  it("fails closed on input that violates the ABI input schema", async () => {
    const taskId = await scheduledTask();
    const d = def({
      inputSchema: { type: "object", properties: { topic: { type: "string" } }, required: ["topic"] },
    });
    await expect(
      inA((tx) => executeRun(tx, ctx, { taskId, definition: d, input: {} })),
    ).rejects.toBeInstanceOf(InvalidRuntimeInputError);
  });

  it("rejects a task that is not scheduled", async () => {
    const t = await inA((tx) => createTask(tx, { tenantId: tenantA, orgId: orgA, title: "draft" }));
    await expect(
      inA((tx) => executeRun(tx, ctx, { taskId: t.id, definition: def(), input: {} })),
    ).rejects.toBeInstanceOf(InvalidRunStateError);
  });

  it("fails closed on missing/invalid context (tenant, task, agent)", async () => {
    const taskId = await scheduledTask();
    await expect(
      inA((tx) => executeRun(tx, { tenantId: "bad", orgId: orgA }, { taskId, definition: def(), input: {} })),
    ).rejects.toBeInstanceOf(InvalidRuntimeContextError);
    await expect(
      inA((tx) => executeRun(tx, ctx, { taskId: randomUUID(), definition: def(), input: {} })),
    ).rejects.toBeInstanceOf(MissingRuntimeContextError);
    await expect(
      inA((tx) => executeRun(tx, ctx, { taskId, definition: { bogus: true } as unknown as AgentDefinition, input: {} })),
    ).rejects.toBeInstanceOf(MissingRuntimeContextError);
  });

  it("denies cross-tenant access (task in tenant B invisible under tenant A RLS)", async () => {
    const tB = await inB(async (tx) => {
      const t = await createTask(tx, { tenantId: tenantB, orgId: orgB, title: "B" });
      await markReady(tx, t.id);
      await transitionTask(tx, t.id, "scheduled");
      return t.id;
    });
    await expect(
      inA((tx) => executeRun(tx, ctx, { taskId: tB, definition: def(), input: {} })),
    ).rejects.toBeInstanceOf(MissingRuntimeContextError);
  });
});

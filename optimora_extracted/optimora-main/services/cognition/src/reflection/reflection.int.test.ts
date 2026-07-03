/**
 * Reflection Engine integration test (T-8.4) — valid output accepted, invalid
 * output rejected, quality score, violated rules, suggested fixes, retry +
 * escalation recommendations, cross-tenant denial, missing-context fail-closed,
 * critique records + reflection events. Requires the dev Postgres + migrations.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import { createDefinition, type AgentDefinition } from "@optimora/agent-contract";
import { createTask } from "@optimora/execution";
import {
  reflectOnTask,
  getCritique,
  listReflectionEvents,
  InvalidOutputError,
  MissingReflectionContextError,
  InvalidReflectionContextError,
  type ReflectionContext,
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

const ctx: ReflectionContext = { tenantId: tenantA, orgId: orgA };

function def(overrides: Partial<Parameters<typeof createDefinition>[0]> = {}): AgentDefinition {
  return createDefinition({
    identity: { agentId: randomUUID(), key: "writer", displayName: "Writer" },
    role: "Writer",
    qualityRules: { minScore: 0.7, checks: ["non_empty_output", "has_summary", "no_error_field"] },
    outputSchema: { type: "object", required: ["summary"] },
    retryRules: { maxAttempts: 3, backoff: "exponential", retryOn: [] },
    escalationRules: { onRetriesExhausted: "escalate", escalateToNodeId: null, humanApprovalRequired: false },
    ...overrides,
  });
}

let taskA: string;
let taskB: string; // tenant B task

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `re-${tenantA}`, name: "RE A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `re-${tenantB}`, name: "RE B" } });
  await sys.organization.create({ data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" } });
  await sys.organization.create({ data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" } });

  taskA = (
    await inA((tx) => createTask(tx, { tenantId: tenantA, orgId: orgA, title: "Write a brief" }))
  ).id;
  taskB = (
    await inB((tx) => createTask(tx, { tenantId: tenantB, orgId: orgB, title: "B task" }))
  ).id;
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Reflection Engine", () => {
  it("accepts valid output and records + emits the critique", async () => {
    const c = await inA((tx) =>
      reflectOnTask(tx, ctx, {
        taskId: taskA,
        definition: def(),
        output: { summary: "Clear and complete", content: "body" },
      }),
    );
    expect(c.passed).toBe(true);
    expect(c.result).toBe("pass");
    expect(c.recommendation).toBe("accept");
    expect(c.qualityScore).toBe(1);

    const record = await inA((tx) => getCritique(tx, c.recordId));
    expect(record?.result).toBe("pass");
    const events = await inA((tx) => listReflectionEvents(tx, c.recordId));
    expect(events.map((e) => e.type)).toContain("reflection.accept");
  });

  it("rejects invalid output, captures violated rules + fixes, recommends revise (retry)", async () => {
    const c = await inA((tx) =>
      reflectOnTask(tx, ctx, {
        taskId: taskA,
        definition: def(),
        output: { error: "boom" },
        attempt: 0,
      }),
    );
    expect(c.passed).toBe(false);
    expect(c.qualityScore).toBeLessThan(0.7);
    expect(c.violatedRules).toContain("has_summary");
    expect(c.missingRequirements).toContain("summary");
    expect(c.suggestedFixes.length).toBeGreaterThan(0);
    expect(c.retryRecommended).toBe(true);
    expect(c.recommendation).toBe("revise");
  });

  it("recommends escalation once retries are exhausted", async () => {
    const c = await inA((tx) =>
      reflectOnTask(tx, ctx, {
        taskId: taskA,
        definition: def(),
        output: { error: "still broken" },
        attempt: 2, // maxAttempts 3 → no retries remain (next attempt would be 3)
      }),
    );
    expect(c.passed).toBe(false);
    expect(c.retryRecommended).toBe(false);
    expect(c.escalationRecommended).toBe(true);
    expect(c.recommendation).toBe("escalate");
  });

  it("fails closed when retries exhausted and onRetriesExhausted=fail", async () => {
    const c = await inA((tx) =>
      reflectOnTask(tx, ctx, {
        taskId: taskA,
        definition: def({
          escalationRules: { onRetriesExhausted: "fail", escalateToNodeId: null, humanApprovalRequired: false },
        }),
        output: { error: "x" },
        attempt: 2,
      }),
    );
    expect(c.recommendation).toBe("fail");
    expect(c.escalationRecommended).toBe(false);
  });

  it("denies cross-tenant access (task in tenant B not visible under tenant A RLS)", async () => {
    await expect(
      inA((tx) => reflectOnTask(tx, ctx, { taskId: taskB, definition: def(), output: { summary: "x" } })),
    ).rejects.toBeInstanceOf(MissingReflectionContextError);
  });

  it("fails closed on missing/invalid tenant context", async () => {
    await expect(
      inA((tx) =>
        reflectOnTask(tx, { tenantId: "bad", orgId: orgA }, {
          taskId: taskA,
          definition: def(),
          output: { summary: "x" },
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidReflectionContextError);
  });

  it("fails closed on a missing task", async () => {
    await expect(
      inA((tx) =>
        reflectOnTask(tx, ctx, { taskId: randomUUID(), definition: def(), output: { summary: "x" } }),
      ),
    ).rejects.toBeInstanceOf(MissingReflectionContextError);
  });

  it("fails closed on invalid output (not a JSON object)", async () => {
    await expect(
      inA((tx) => reflectOnTask(tx, ctx, { taskId: taskA, definition: def(), output: "nope" })),
    ).rejects.toBeInstanceOf(InvalidOutputError);
  });
});

/**
 * Learning Engine integration test (T-8.5) — consumes real Critique records from
 * the Reflection Engine, aggregates per-agent metrics, generates eval-gated
 * recommendations, proves proposals never mutate the live definition, eval gate
 * blocks unsafe proposals, cross-tenant denial, missing-context fail-closed, and
 * learning records + events are persisted. Requires the dev Postgres + migrations.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import { createDefinition, type AgentDefinition } from "@optimora/agent-contract";
import { createTask } from "@optimora/execution";
import {
  reflectOnTask,
  runLearning,
  getAgentPerformance,
  getLearningRecord,
  listLearningEvents,
  InvalidLearningContextError,
  MissingLearningContextError,
  type ReflectionContext,
  type LearningContext,
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

const ctxA: ReflectionContext & LearningContext = { tenantId: tenantA, orgId: orgA };
const ctxB: LearningContext = { tenantId: tenantB, orgId: orgB };

const agentId = randomUUID();
function makeDef(): AgentDefinition {
  return createDefinition({
    identity: { agentId, key: "writer", displayName: "Writer" },
    role: "Writer",
    qualityRules: { minScore: 0.7, checks: ["non_empty_output", "has_summary", "no_error_field"] },
    outputSchema: { type: "object", required: ["summary"] },
    retryRules: { maxAttempts: 3, backoff: "exponential", retryOn: [] },
    escalationRules: { onRetriesExhausted: "escalate", escalateToNodeId: null, humanApprovalRequired: false },
  });
}
const definition = makeDef();
const originalSnapshot = JSON.stringify(definition);

let taskA: string;

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `le-${tenantA}`, name: "LE A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `le-${tenantB}`, name: "LE B" } });
  await sys.organization.create({ data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" } });
  await sys.organization.create({ data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" } });

  taskA = (
    await inA((tx) => createTask(tx, { tenantId: tenantA, orgId: orgA, title: "Write a brief" }))
  ).id;

  // Produce 6 failing critiques: 3 revise (attempt 0) + 3 escalate (attempt 2).
  await inA(async (tx) => {
    for (let i = 0; i < 3; i++) {
      await reflectOnTask(tx, ctxA, { taskId: taskA, definition, output: { error: "boom" }, attempt: 0 });
    }
    for (let i = 0; i < 3; i++) {
      await reflectOnTask(tx, ctxA, { taskId: taskA, definition, output: { error: "boom" }, attempt: 2 });
    }
  });
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Learning Engine", () => {
  it("consumes critiques, aggregates metrics, and generates eval-gated recommendations", async () => {
    const result = await inA((tx) => runLearning(tx, ctxA, { definition }));

    // Aggregated signals + rate calculations.
    expect(result.signals.runs).toBe(6);
    expect(result.signals.failureRate).toBeCloseTo(1, 5);
    expect(result.signals.revisionRate).toBeCloseTo(0.5, 5);
    expect(result.signals.escalationRate).toBeCloseTo(0.5, 5);

    // Recommendations generated, all stored as `proposed` and eval-gate passed.
    const types = result.recommendations.map((r) => r.type);
    expect(types).toContain("prompt_improvement");
    expect(types).toContain("escalation_rule_adjustment");
    expect(types).toContain("quality_rule_adjustment");
    expect(result.recommendations.every((r) => r.status === "proposed")).toBe(true);
    expect(result.recommendations.every((r) => r.evalGatePassed)).toBe(true);

    // Performance snapshot updated (own store; definition NOT touched).
    const perf = await inA((tx) => getAgentPerformance(tx, agentId));
    expect(perf?.runs).toBe(6);
    expect(perf?.failureRate).toBeCloseTo(1, 5);

    // Learning record stored + learning event emitted.
    const first = result.recommendations[0]!;
    const record = await inA((tx) => getLearningRecord(tx, first.recordId));
    expect(record?.agentId).toBe(agentId);
    expect(record?.agentVersion).toBe(definition.version);
    const events = await inA((tx) => listLearningEvents(tx, first.recordId));
    expect(events.map((e) => e.type)).toContain("learning.proposed");
  });

  it("does not mutate the live agent definition (immutability preserved)", () => {
    expect(JSON.stringify(definition)).toBe(originalSnapshot);
  });

  it("eval gate blocks unsafe proposals (insufficient sample size)", async () => {
    const result = await inA((tx) => runLearning(tx, ctxA, { definition, minSamples: 20 }));
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.every((r) => !r.evalGatePassed)).toBe(true);
    const blocked = result.recommendations[0]!;
    const events = await inA((tx) => listLearningEvents(tx, blocked.recordId));
    expect(events.map((e) => e.type)).toContain("learning.blocked");
  });

  it("denies cross-tenant access (no critiques visible under tenant B RLS)", async () => {
    await expect(inB((tx) => runLearning(tx, ctxB, { definition }))).rejects.toBeInstanceOf(
      MissingLearningContextError,
    );
  });

  it("fails closed on missing/invalid tenant context", async () => {
    await expect(
      inA((tx) => runLearning(tx, { tenantId: "bad", orgId: orgA }, { definition })),
    ).rejects.toBeInstanceOf(InvalidLearningContextError);
  });

  it("fails closed on an agent with no critiques (missing context)", async () => {
    const other = createDefinition({
      identity: { agentId: randomUUID(), key: "other", displayName: "Other" },
      role: "Other",
    });
    await expect(
      inA((tx) => runLearning(tx, ctxA, { definition: other })),
    ).rejects.toBeInstanceOf(MissingLearningContextError);
  });
});

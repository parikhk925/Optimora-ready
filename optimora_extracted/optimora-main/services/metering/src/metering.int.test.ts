/**
 * Metering integration tests (E9 Metering). Requires dev Postgres.
 * Proves: record model/tool/connector usage, aggregate by tenant/org/agent/task,
 * cost guard within/over budget, cross-tenant denial (RLS), malformed fail-closed,
 * audit event emission, no Stripe/billing dependency.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import {
  checkCostAllowed,
  getAggregatedUsage,
  getUsageRecord,
  InvalidMeteringContextError,
  listMeteringEvents,
  MalformedUsageInputError,
  recordUsage,
  type MeteringContext,
} from "./index.js";

const sys = getSystemPrisma();
const prisma = getPrisma();

const tenantA = randomUUID();
const orgA = randomUUID();
const tenantB = randomUUID();
const orgB = randomUUID();
const actorA = "agent:" + randomUUID();
const agentId = randomUUID();
const taskId = randomUUID();

const ctxA: MeteringContext = { tenantId: tenantA, orgId: orgA, actorId: actorA };
const ctxB: MeteringContext = { tenantId: tenantB, orgId: orgB, actorId: "agent:b" };

const inA = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, fn);

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `mt-${tenantA}`, name: "Meter A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `mt-${tenantB}`, name: "Meter B" } });
  await sys.organization.create({ data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" } });
  await sys.organization.create({ data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" } });
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Usage Metering / Cost Guard", () => {
  it("records model usage and returns a UsageRecordView", async () => {
    const rec = await recordUsage(prisma, ctxA, {
      service: "model_router",
      operation: "model_invocation",
      units: 1000,
      estimatedCostUsd: 0.002,
      agentId,
      taskId,
      sourceRef: randomUUID(),
    });
    expect(rec.service).toBe("model_router");
    expect(rec.operation).toBe("model_invocation");
    expect(rec.units).toBe(1000);
    expect(rec.estimatedCostUsd).toBe(0.002);
    expect(rec.currency).toBe("USD");
    expect(rec.tenantId).toBe(tenantA);

    const stored = await inA((tx) => getUsageRecord(tx, rec.id));
    expect(stored?.id).toBe(rec.id);
  });

  it("records tool usage", async () => {
    const rec = await recordUsage(prisma, ctxA, {
      service: "tools",
      operation: "tool_execution",
      units: 1,
      estimatedCostUsd: 0,
      agentId,
    });
    expect(rec.service).toBe("tools");
    expect(rec.operation).toBe("tool_execution");
  });

  it("records connector usage", async () => {
    const rec = await recordUsage(prisma, ctxA, {
      service: "integrations",
      operation: "connector_invocation",
      units: 1,
      estimatedCostUsd: 0.001,
    });
    expect(rec.service).toBe("integrations");
  });

  it("emits metering.recorded event for each usage record", async () => {
    const rec = await recordUsage(prisma, ctxA, {
      service: "runtime",
      operation: "agent_run",
      units: 1,
      estimatedCostUsd: 0.005,
    });
    const events = await inA((tx) => listMeteringEvents(tx, rec.id));
    expect(events.map((e: { type: string }) => e.type)).toContain("metering.recorded");
  });

  it("aggregates usage by tenant/org", async () => {
    // Record 3 events, then check aggregate includes them.
    for (let i = 0; i < 3; i++) {
      await recordUsage(prisma, ctxA, {
        service: "model_router",
        operation: "model_invocation",
        units: 100,
        estimatedCostUsd: 0.0001,
      });
    }
    const agg = await inA((tx) =>
      getAggregatedUsage(tx, ctxA, { orgId: orgA }),
    );
    expect(agg.count).toBeGreaterThanOrEqual(3);
    expect(agg.totalUnits).toBeGreaterThan(0);
    expect(agg.totalEstimatedCostUsd).toBeGreaterThan(0);
  });

  it("aggregates usage filtered by agentId", async () => {
    const localAgent = randomUUID();
    await recordUsage(prisma, ctxA, {
      service: "tools",
      operation: "tool_execution",
      units: 5,
      estimatedCostUsd: 0,
      agentId: localAgent,
    });
    const agg = await inA((tx) =>
      getAggregatedUsage(tx, ctxA, { agentId: localAgent }),
    );
    expect(agg.count).toBe(1);
    expect(agg.totalUnits).toBe(5);
  });

  it("aggregates usage filtered by taskId", async () => {
    const localTask = randomUUID();
    await recordUsage(prisma, ctxA, {
      service: "runtime",
      operation: "agent_run",
      units: 1,
      estimatedCostUsd: 0.01,
      taskId: localTask,
    });
    const agg = await inA((tx) =>
      getAggregatedUsage(tx, ctxA, { taskId: localTask }),
    );
    expect(agg.count).toBe(1);
  });

  it("cost guard allows when spend is within budget", async () => {
    const result = await inA((tx) =>
      checkCostAllowed(tx, ctxA, {
        orgId: orgA,
        additionalCostUsd: 0.001,
        budgetCeilingUsd: 999,
      }),
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("within_budget");
  });

  it("cost guard denies when projected spend exceeds budget ceiling", async () => {
    // Record a large usage to push aggregate over threshold.
    await recordUsage(prisma, ctxA, {
      service: "model_router",
      operation: "model_invocation",
      units: 1_000_000,
      estimatedCostUsd: 90,
    });
    const result = await inA((tx) =>
      checkCostAllowed(tx, ctxA, {
        orgId: orgA,
        additionalCostUsd: 20,
        budgetCeilingUsd: 100,
      }),
    );
    expect(result.allowed).toBe(false);
    expect(result.projectedSpendUsd).toBeGreaterThan(100);
    expect(result.reason).toContain("exceeds ceiling");
  });

  it("fails closed on cross-tenant cost guard check", async () => {
    // ctxA.orgId !== orgB — cross-tenant.
    await expect(
      inA((tx) =>
        checkCostAllowed(tx, ctxA, {
          orgId: orgB,
          additionalCostUsd: 1,
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidMeteringContextError);
  });

  it("fails closed on malformed usage input (unknown service, negative units)", async () => {
    await expect(
      recordUsage(prisma, ctxA, {
        service: "bogus" as never,
        operation: "model_invocation",
        units: 1,
        estimatedCostUsd: 0,
      }),
    ).rejects.toBeInstanceOf(MalformedUsageInputError);

    await expect(
      recordUsage(prisma, ctxA, {
        service: "model_router",
        operation: "model_invocation",
        units: -1,
        estimatedCostUsd: 0,
      }),
    ).rejects.toBeInstanceOf(MalformedUsageInputError);
  });

  it("fails closed on invalid tenant/org context", async () => {
    await expect(
      recordUsage(
        prisma,
        { tenantId: "bad", orgId: orgA, actorId: actorA },
        { service: "tools", operation: "tool_execution", units: 1, estimatedCostUsd: 0 },
      ),
    ).rejects.toBeInstanceOf(InvalidMeteringContextError);
  });

  it("cross-tenant denial: tenant B records are invisible under tenant A (RLS)", async () => {
    const recB = await recordUsage(prisma, ctxB, {
      service: "tools",
      operation: "tool_execution",
      units: 1,
      estimatedCostUsd: 0,
    });
    const notVisible = await inA((tx) => getUsageRecord(tx, recB.id));
    expect(notVisible).toBeNull();
  });

  it("no Stripe or billing package imported (no external billing dependency)", () => {
    // Structural test: verify the package.json has no stripe/billing deps.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require("../package.json") as { dependencies?: Record<string, string> };
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps.some((d) => d.includes("stripe"))).toBe(false);
    expect(deps.some((d) => d.includes("billing"))).toBe(false);
  });
});

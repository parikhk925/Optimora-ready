import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import type { TxClient } from "@optimora/db";
import { createDefinition } from "@optimora/agent-contract";
import { hardFilter, type HardFilterContext } from "./hard-filter.js";
import { softScore, weightsForPriority, type ScoreContext } from "./soft-score.js";
import type { SchedulerCandidate, TaskRequirements } from "./types.js";

const tenantA = randomUUID();
const orgA = randomUUID();

function candidate(
  over: Partial<SchedulerCandidate> & { skills?: string[]; permissions?: string[] } = {},
): SchedulerCandidate {
  const def = createDefinition({
    identity: { agentId: randomUUID(), key: "agent", displayName: "Agent" },
    role: "Writer",
    skills: over.skills ?? ["writing"],
    permissions: over.permissions ?? ["content:write"],
    tools: [{ name: "editor", scopes: ["edit"] }],
  });
  return {
    tenantId: tenantA,
    orgId: orgA,
    definition: def,
    lifecycle: over.lifecycle ?? "hired",
    reputation: over.reputation ?? 0.5,
    successRate: over.successRate ?? 0.5,
    avgCost: over.avgCost ?? 1,
    avgLatencyMs: over.avgLatencyMs ?? 1000,
    currentLoad: over.currentLoad ?? 0,
    concurrencyCap: over.concurrencyCap ?? 5,
    dataClearanceClass: over.dataClearanceClass,
    nodeId: over.nodeId,
  };
}

// estCost=0 and no requiredRelation -> hard filter never touches the DB.
const dummyTx = {} as TxClient;
const ctx = (over: Partial<HardFilterContext> = {}): HardFilterContext => ({
  taskTenantId: tenantA,
  taskOrgId: orgA,
  taskPriority: 3,
  taskDeadline: null,
  estCost: 0,
  budgetNodeId: null,
  now: Date.now(),
  ...over,
});

describe("scheduler hard filter (unit)", () => {
  it("passes a fully-qualified candidate", async () => {
    const r = await hardFilter(
      dummyTx,
      { requiredSkills: ["writing"], requiredPermissions: ["content:write"] },
      candidate(),
      ctx(),
    );
    expect(r.eligible).toBe(true);
  });

  it("filters on missing skills / permissions / capabilities (fail closed)", async () => {
    const req: TaskRequirements = {
      requiredSkills: ["writing", "seo"],
      requiredPermissions: ["content:publish"],
      requiredCapabilities: ["deploy"],
    };
    const r = await hardFilter(dummyTx, req, candidate(), ctx());
    expect(r.eligible).toBe(false);
    expect(r.reasons).toEqual(
      expect.arrayContaining(["missing_skills", "missing_permissions", "missing_capabilities"]),
    );
  });

  it("filters on lifecycle, capacity, and tenant mismatch", async () => {
    expect(
      (await hardFilter(dummyTx, {}, candidate({ lifecycle: "suspended" }), ctx())).reasons,
    ).toContain("lifecycle_ineligible");
    expect(
      (await hardFilter(dummyTx, {}, candidate({ currentLoad: 5, concurrencyCap: 5 }), ctx()))
        .reasons,
    ).toContain("no_capacity");
    const foreign = candidate();
    foreign.tenantId = randomUUID();
    expect((await hardFilter(dummyTx, {}, foreign, ctx())).reasons).toContain(
      "tenant_org_mismatch",
    );
  });

  it("restricts probation candidates to low-complexity, non-P0 tasks", async () => {
    expect(
      (await hardFilter(dummyTx, { complexity: 4 }, candidate({ lifecycle: "probation" }), ctx()))
        .reasons,
    ).toContain("probation_restricted");
    expect(
      (
        await hardFilter(
          dummyTx,
          { complexity: 1 },
          candidate({ lifecycle: "probation" }),
          ctx({ taskPriority: 0 }),
        )
      ).reasons,
    ).toContain("probation_restricted");
    expect(
      (await hardFilter(dummyTx, { complexity: 1 }, candidate({ lifecycle: "probation" }), ctx()))
        .eligible,
    ).toBe(true);
  });

  it("filters on infeasible deadline", async () => {
    const r = await hardFilter(
      dummyTx,
      { estimatedTimeMs: 10_000 },
      candidate(),
      ctx({ taskDeadline: new Date(Date.now() + 1000) }),
    );
    expect(r.reasons).toContain("deadline_infeasible");
  });
});

describe("scheduler soft score (unit)", () => {
  it("is deterministic and ranks higher reputation/success above lower", () => {
    const high = candidate({ reputation: 0.9, successRate: 0.9 });
    const low = candidate({ reputation: 0.2, successRate: 0.2 });
    const sctx: ScoreContext = {
      costMin: 1,
      costMax: 1,
      latencyMin: 1000,
      latencyMax: 1000,
      preferredAgentIds: [],
    };
    const w = weightsForPriority(0);
    const sHigh = softScore(high, {}, sctx, w);
    const sLow = softScore(low, {}, sctx, w);
    expect(sHigh.total).toBeGreaterThan(sLow.total);
    expect(softScore(high, {}, sctx, w)).toEqual(sHigh); // deterministic
  });
});

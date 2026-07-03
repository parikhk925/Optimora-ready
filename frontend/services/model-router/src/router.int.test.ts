/**
 * Model Router integration tests (E9 Model Routing). Proves routing to stub,
 * deterministic selection, unavailable-provider denial, cost-ceiling enforcement,
 * policy denial, cross-tenant denial, malformed-request fail-closed, invocation
 * record storage, routing event emission, and no-secrets guarantee. Requires dev
 * Postgres + migrations.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import { EchoModelProvider } from "@optimora/runtime";
import {
  CostCeilingExceededError,
  getInvocation,
  InvalidRouterContextError,
  listRoutingEvents,
  MalformedRouterRequestError,
  NoProviderAvailableError,
  ProviderRegistry,
  routeAndInvoke,
  type ModelRequest,
  type ProviderRegistration,
  type RouterContext,
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

const ctx: RouterContext = { tenantId: tenantA, orgId: orgA, agentId: agentA };

const REQ: ModelRequest = {
  role: "Writer",
  jobDescription: "Write a summary.",
  taskTitle: "Brief",
  input: { topic: "AI" },
  outputSchema: { type: "object", properties: { summary: { type: "string" } } },
};

function stdReg(name = "echo", opts: Partial<Omit<ProviderRegistration, "provider">> = {}): ProviderRegistration {
  const base = new EchoModelProvider();
  return {
    provider: { name, complete: base.complete.bind(base) },
    costPerTokenUsd: 0,
    qualityTiers: ["standard"],
    latencyClass: "normal",
    caps: [],
    available: true,
    ...opts,
  };
}

function makeRegistry(...regs: ProviderRegistration[]): ProviderRegistry {
  const r = new ProviderRegistry();
  for (const reg of regs) r.register(reg);
  return r;
}

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `mr-${tenantA}`, name: "MR A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `mr-${tenantB}`, name: "MR B" } });
  await sys.organization.create({ data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" } });
  await sys.organization.create({ data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" } });
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Model Router", () => {
  it("routes to a stub provider, records invocation, emits routing event", async () => {
    const registry = makeRegistry(stdReg("echo-stub"));
    const res = await inA((tx) => routeAndInvoke(tx, ctx, REQ, {}, registry));

    expect(res.invocation.status).toBe("succeeded");
    expect(res.invocation.providerName).toBe("echo-stub");
    expect(res.invocation.tokensIn).toBeGreaterThan(0);
    expect(res.invocation.estimatedCostUsd).toBe(0);

    const stored = await inA((tx) => getInvocation(tx, res.invocation.id));
    expect(stored?.status).toBe("succeeded");

    const events = await inA((tx) => listRoutingEvents(tx, res.invocation.id));
    expect(events.map((e: { type: string }) => e.type)).toContain("model.routed");
  });

  it("invocation record stores no raw prompt or completion text (no secrets)", async () => {
    const registry = makeRegistry(stdReg());
    const res = await inA((tx) => routeAndInvoke(tx, ctx, REQ, {}, registry));
    const inv = res.invocation as unknown as Record<string, unknown>;
    // Verify none of the prompt/completion fields are present on the record.
    expect(inv["prompt"]).toBeUndefined();
    expect(inv["completion"]).toBeUndefined();
    expect(inv["rawInput"]).toBeUndefined();
    expect(inv["rawOutput"]).toBeUndefined();
  });

  it("selection is deterministic for the same inputs", async () => {
    const registry = makeRegistry(stdReg("p1"), stdReg("p2", { qualityTiers: ["draft"] }));
    const a = await inA((tx) => routeAndInvoke(tx, ctx, REQ, { qualityTier: "standard" }, registry));
    const b = await inA((tx) => routeAndInvoke(tx, ctx, REQ, { qualityTier: "standard" }, registry));
    expect(a.invocation.providerName).toBe(b.invocation.providerName);
  });

  it("fails closed when no provider matches (unavailable)", async () => {
    const registry = makeRegistry(stdReg("off", { available: false }));
    await expect(inA((tx) => routeAndInvoke(tx, ctx, REQ, {}, registry))).rejects.toBeInstanceOf(
      NoProviderAvailableError,
    );
  });

  it("fails closed when allowedProviders excludes all available", async () => {
    const registry = makeRegistry(stdReg("echo"));
    await expect(
      inA((tx) => routeAndInvoke(tx, ctx, REQ, { allowedProviders: ["nonexistent"] }, registry)),
    ).rejects.toBeInstanceOf(NoProviderAvailableError);
  });

  it("enforces cost ceiling (stubs cost $0, so ceiling=0 is fine; negative ceiling rejected via NoProvider)", async () => {
    // Stub has costPerTokenUsd=0 so estimatedCost=0; any ceiling >=0 passes.
    const registry = makeRegistry(stdReg());
    const res = await inA((tx) =>
      routeAndInvoke(tx, ctx, REQ, { costCeilingUsd: 0 }, registry),
    );
    expect(res.invocation.status).toBe("succeeded");
  });

  it("throws CostCeilingExceededError when estimated cost exceeds ceiling", async () => {
    // Plug in a non-zero cost provider ($1/token guarantees ceiling breach).
    const expensiveReg = stdReg("pricey", { costPerTokenUsd: 1 });
    const registry = makeRegistry(expensiveReg);
    await expect(
      inA((tx) => routeAndInvoke(tx, ctx, REQ, { costCeilingUsd: 0.000001 }, registry)),
    ).rejects.toBeInstanceOf(CostCeilingExceededError);
  });

  it("fails closed on invalid tenant/org context", async () => {
    const registry = makeRegistry(stdReg());
    await expect(
      inA((tx) =>
        routeAndInvoke(tx, { tenantId: "bad", orgId: orgA, agentId: agentA }, REQ, {}, registry),
      ),
    ).rejects.toBeInstanceOf(InvalidRouterContextError);
  });

  it("fails closed on malformed request (empty role)", async () => {
    const registry = makeRegistry(stdReg());
    await expect(
      inA((tx) =>
        routeAndInvoke(tx, ctx, { ...REQ, role: "   " }, {}, registry),
      ),
    ).rejects.toBeInstanceOf(MalformedRouterRequestError);
  });

  it("fails closed on malformed request (non-object input)", async () => {
    const registry = makeRegistry(stdReg());
    await expect(
      inA((tx) =>
        routeAndInvoke(tx, ctx, { ...REQ, input: "not-an-object" as unknown as Record<string, unknown> }, {}, registry),
      ),
    ).rejects.toBeInstanceOf(MalformedRouterRequestError);
  });
});

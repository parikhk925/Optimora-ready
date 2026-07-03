/**
 * Jurisdiction integration tests (E9 Jurisdiction). Requires dev Postgres.
 * Proves: create IN/US/CA/GB/GLOBAL configs, generic fallback, agent binding,
 * task jurisdiction ref, invalid country/region denied, cross-tenant denial (RLS),
 * event emitted, versioning, no default country assumption.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import {
  bindAgentToJurisdiction,
  createConfig,
  declareTaskJurisdiction,
  getActiveJurisdiction,
  getConfig,
  getTaskJurisdictionRef,
  InvalidBusinessDomainError,
  InvalidCountryCodeError,
  InvalidJurisdictionContextError,
  JurisdictionConfigNotFoundError,
  listAgentBindings,
  listJurisdictionEvents,
  MalformedJurisdictionConfigError,
  type JurisdictionContext,
} from "./index.js";

const sys = getSystemPrisma();
const prisma = getPrisma();

const tenantA = randomUUID();
const orgA = randomUUID();
const tenantB = randomUUID();
const orgB = randomUUID();
const actorA = "service:jurisdiction-test";

const ctxA: JurisdictionContext = { tenantId: tenantA, orgId: orgA, actorId: actorA };

const inA = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, fn);

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `jur-${tenantA}`, name: "Jur A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `jur-${tenantB}`, name: "Jur B" } });
  await sys.organization.create({ data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" } });
  await sys.organization.create({ data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" } });
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Jurisdiction / Compliance Config", () => {
  it("creates India (IN) jurisdiction profile", async () => {
    const config = await inA((tx) =>
      createConfig(tx, ctxA, { countryCode: "IN", businessDomain: "accounting" }),
    );
    expect(config.countryCode).toBe("IN");
    expect(config.businessDomain).toBe("accounting");
    expect(config.version).toBe(1);
    expect(config.active).toBe(true);
    expect(config.profile.taxIdentifierLabels.primary).toBe("PAN");
    expect(config.profile.fiscalYearStart).toBe("04-01");
    expect(config.profile.complianceDisclaimer).toContain("AI assistant");
  });

  it("creates United States (US) jurisdiction profile", async () => {
    const config = await inA((tx) =>
      createConfig(tx, ctxA, { countryCode: "US", businessDomain: "tax_prep" }),
    );
    expect(config.countryCode).toBe("US");
    expect(config.profile.currencyCode).toBe("USD");
    expect(config.profile.taxIdentifierLabels.primary).toBe("EIN");
  });

  it("creates Canada (CA) jurisdiction profile", async () => {
    const config = await inA((tx) =>
      createConfig(tx, ctxA, { countryCode: "CA", businessDomain: "payroll" }),
    );
    expect(config.countryCode).toBe("CA");
    expect(config.profile.currencyCode).toBe("CAD");
    expect(config.profile.taxIdentifierLabels.gst_hst).toBe("GST/HST Number");
  });

  it("creates United Kingdom (GB) jurisdiction profile", async () => {
    const config = await inA((tx) =>
      createConfig(tx, ctxA, { countryCode: "GB", businessDomain: "financial_reporting" }),
    );
    expect(config.countryCode).toBe("GB");
    expect(config.profile.currencyCode).toBe("GBP");
    expect(config.profile.fiscalYearStart).toBe("04-06");
  });

  it("creates GLOBAL fallback jurisdiction profile", async () => {
    const config = await inA((tx) =>
      createConfig(tx, ctxA, { countryCode: "GLOBAL", businessDomain: "compliance" }),
    );
    expect(config.countryCode).toBe("GLOBAL");
    expect(config.profile.complianceDisclaimer).toContain("No specific jurisdiction");
  });

  it("getActiveJurisdiction returns GLOBAL fallback (not null) when no config exists", async () => {
    // invoicing domain — not yet created for orgA.
    const fallback = await inA((tx) => getActiveJurisdiction(tx, ctxA, "IN", "invoicing"));
    expect(fallback.countryCode).toBe("GLOBAL");
    expect(fallback.active).toBe(false);
    expect(fallback.profile.complianceDisclaimer).toContain("No specific jurisdiction");
    // Callers must detect countryCode === "GLOBAL" and surface the disclaimer.
  });

  it("versioning: second createConfig for same org+country+domain increments version and deactivates old", async () => {
    const v1 = await inA((tx) =>
      createConfig(tx, ctxA, { countryCode: "US", businessDomain: "bookkeeping" }),
    );
    expect(v1.version).toBe(1);
    expect(v1.active).toBe(true);

    const v2 = await inA((tx) =>
      createConfig(tx, ctxA, { countryCode: "US", businessDomain: "bookkeeping" }),
    );
    expect(v2.version).toBe(2);
    expect(v2.active).toBe(true);

    // v1 should now be inactive.
    const old = await inA((tx) => getConfig(tx, ctxA, v1.id));
    expect(old.active).toBe(false);
  });

  it("bind finance agent to jurisdiction", async () => {
    const config = await inA((tx) =>
      createConfig(tx, ctxA, { countryCode: "IN", businessDomain: "payroll" }),
    );
    const agentId = randomUUID();
    const binding = await inA((tx) => bindAgentToJurisdiction(tx, ctxA, agentId, config.id));
    expect(binding.agentId).toBe(agentId);
    expect(binding.jurisdictionConfigId).toBe(config.id);

    const bindings = await inA((tx) => listAgentBindings(tx, agentId));
    expect(bindings.map((b) => b.id)).toContain(binding.id);
  });

  it("task can declare required jurisdiction", async () => {
    const config = await inA((tx) =>
      createConfig(tx, ctxA, { countryCode: "CA", businessDomain: "invoicing" }),
    );
    const taskId = randomUUID();
    const ref = await inA((tx) => declareTaskJurisdiction(tx, ctxA, taskId, config.id));
    expect(ref.taskId).toBe(taskId);
    expect(ref.jurisdictionConfigId).toBe(config.id);

    const fetched = await inA((tx) => getTaskJurisdictionRef(tx, taskId));
    expect(fetched?.taskId).toBe(taskId);
  });

  it("emits jurisdiction.config.created event on createConfig", async () => {
    const config = await inA((tx) =>
      createConfig(tx, ctxA, { countryCode: "GB", businessDomain: "tax_prep" }),
    );
    const events = await inA((tx) => listJurisdictionEvents(tx, config.id));
    expect(events.map((e: { type: string }) => e.type)).toContain("jurisdiction.config.created");
  });

  it("emits jurisdiction.agent.bound event on bindAgentToJurisdiction", async () => {
    const config = await inA((tx) =>
      createConfig(tx, ctxA, { countryCode: "US", businessDomain: "compliance" }),
    );
    const agentId = randomUUID();
    await inA((tx) => bindAgentToJurisdiction(tx, ctxA, agentId, config.id));
    const events = await inA((tx) => listJurisdictionEvents(tx, config.id));
    expect(events.map((e: { type: string }) => e.type)).toContain("jurisdiction.agent.bound");
  });

  it("region code is stored and validated (ISO 3166-2 format)", async () => {
    const config = await inA((tx) =>
      createConfig(tx, ctxA, { countryCode: "IN", businessDomain: "compliance", region: "IN-MH" }),
    );
    expect(config.region).toBe("IN-MH");
  });

  it("fails closed on invalid country code", async () => {
    await expect(
      inA((tx) => createConfig(tx, ctxA, { countryCode: "XX" as never, businessDomain: "accounting" })),
    ).rejects.toBeInstanceOf(InvalidCountryCodeError);
  });

  it("fails closed on invalid business domain", async () => {
    await expect(
      inA((tx) => createConfig(tx, ctxA, { countryCode: "IN", businessDomain: "bogus" as never })),
    ).rejects.toBeInstanceOf(InvalidBusinessDomainError);
  });

  it("fails closed on malformed region code (wrong country prefix)", async () => {
    await expect(
      inA((tx) =>
        createConfig(tx, ctxA, { countryCode: "IN", businessDomain: "accounting", region: "US-CA" }),
      ),
    ).rejects.toBeInstanceOf(MalformedJurisdictionConfigError);
  });

  it("fails closed on malformed region code (bad format)", async () => {
    await expect(
      inA((tx) =>
        createConfig(tx, ctxA, { countryCode: "IN", businessDomain: "accounting", region: "maharashtra" }),
      ),
    ).rejects.toBeInstanceOf(MalformedJurisdictionConfigError);
  });

  it("fails closed on invalid tenant/org context", async () => {
    await expect(
      inA((tx) =>
        createConfig(
          tx,
          { tenantId: "bad", orgId: orgA, actorId: actorA },
          { countryCode: "IN", businessDomain: "accounting" },
        ),
      ),
    ).rejects.toBeInstanceOf(InvalidJurisdictionContextError);
  });

  it("cross-tenant denial: tenant B configs invisible under tenant A (RLS)", async () => {
    const ctxB: JurisdictionContext = { tenantId: tenantB, orgId: orgB, actorId: "svc:b" };
    const configB = await withTenantContext(prisma, { tenantId: tenantB, orgId: orgB }, (tx) =>
      createConfig(tx, ctxB, { countryCode: "US", businessDomain: "accounting" }),
    );
    await expect(
      inA((tx) => getConfig(tx, ctxA, configB.id)),
    ).rejects.toBeInstanceOf(JurisdictionConfigNotFoundError);
  });

  it("fails closed on missing jurisdictionConfigId for agent bind", async () => {
    await expect(
      inA((tx) => bindAgentToJurisdiction(tx, ctxA, randomUUID(), randomUUID())),
    ).rejects.toBeInstanceOf(JurisdictionConfigNotFoundError);
  });
});

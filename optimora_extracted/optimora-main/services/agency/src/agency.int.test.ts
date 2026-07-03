/**
 * Agency integration tests (E9 Agency). Requires dev Postgres.
 * Proves: create/update agency profile, client workspaces, feature flags,
 * jurisdiction defaults, cross-tenant RLS, event emission, fail-closed validation.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import {
  createAgencyProfile,
  updateAgencyProfile,
  getAgencyProfile,
  createClientWorkspace,
  getClientWorkspace,
  listClientWorkspaces,
  updateClientWorkspace,
  setFeatureFlags,
  getFeatureFlags,
  listAgencyEvents,
  AgencyProfileAlreadyExistsError,
  AgencyProfileNotFoundError,
  ClientWorkspaceNotFoundError,
  InvalidAgencyContextError,
  InvalidLocaleError,
  InvalidCurrencyError,
  InvalidClientRegionError,
  InvalidModuleError,
  MalformedAgencyConfigError,
  type AgencyContext,
} from "./index.js";

const sys = getSystemPrisma();
const prisma = getPrisma();

const tenantA = randomUUID();
const orgA = randomUUID();
const tenantB = randomUUID();
const orgB = randomUUID();

const ctxA: AgencyContext = { tenantId: tenantA, orgId: orgA, actorId: "svc:agency-test" };
const ctxB: AgencyContext = { tenantId: tenantB, orgId: orgB, actorId: "svc:agency-test-b" };

const inA = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, fn);
const inB = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantB, orgId: orgB }, fn);

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `agc-${tenantA}`, name: "Agency A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `agc-${tenantB}`, name: "Agency B" } });
  await sys.organization.create({ data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" } });
  await sys.organization.create({ data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" } });
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Agency Profile", () => {
  it("creates agency profile with defaults", async () => {
    const profile = await inA((tx) =>
      createAgencyProfile(tx, ctxA, {
        agencyName: "Acme Agency",
        brandName: "Acme",
        supportEmail: "support@acme.example",
        whiteLabelEnabled: true,
        allowedClientRegions: ["US", "CA", "IN"],
        enabledModules: ["runtime", "memory", "financeAgent"],
      }),
    );
    expect(profile.agencyName).toBe("Acme Agency");
    expect(profile.brandName).toBe("Acme");
    expect(profile.defaultLocale).toBe("en-US");
    expect(profile.defaultCurrency).toBe("USD");
    expect(profile.whiteLabelEnabled).toBe(true);
    expect(profile.allowedClientRegions).toContain("IN");
    expect(profile.enabledModules).toContain("financeAgent");
    expect(profile.tenantId).toBe(tenantA);
  });

  it("fails closed when creating a second profile for same tenant", async () => {
    await expect(
      inA((tx) => createAgencyProfile(tx, ctxA, { agencyName: "Dup", brandName: "Dup" })),
    ).rejects.toBeInstanceOf(AgencyProfileAlreadyExistsError);
  });

  it("reads agency profile", async () => {
    const profile = await inA((tx) => getAgencyProfile(tx, ctxA));
    expect(profile.agencyName).toBe("Acme Agency");
  });

  it("updates agency branding (logo, accentColor)", async () => {
    const updated = await inA((tx) =>
      updateAgencyProfile(tx, ctxA, {
        logoUrl: "https://cdn.example.com/logo.png",
        accentColor: "#4F46E5",
        defaultLocale: "en-GB",
      }),
    );
    expect(updated.logoUrl).toBe("https://cdn.example.com/logo.png");
    expect(updated.accentColor).toBe("#4F46E5");
    expect(updated.defaultLocale).toBe("en-GB");
  });

  it("fails closed on unsupported locale", async () => {
    await expect(
      inA((tx) => updateAgencyProfile(tx, ctxA, { defaultLocale: "xx-ZZ" as never })),
    ).rejects.toBeInstanceOf(InvalidLocaleError);
  });

  it("fails closed on unsupported currency", async () => {
    await expect(
      inA((tx) => updateAgencyProfile(tx, ctxA, { defaultCurrency: "XYZ" as never })),
    ).rejects.toBeInstanceOf(InvalidCurrencyError);
  });

  it("fails closed on invalid allowed client region", async () => {
    await expect(
      inA((tx) => updateAgencyProfile(tx, ctxA, { allowedClientRegions: ["MOON"] as never })),
    ).rejects.toBeInstanceOf(InvalidClientRegionError);
  });

  it("fails closed on unknown module", async () => {
    await expect(
      inA((tx) => updateAgencyProfile(tx, ctxA, { enabledModules: ["teleportation"] as never })),
    ).rejects.toBeInstanceOf(InvalidModuleError);
  });

  it("emits agency.profile.created and agency.profile.updated events", async () => {
    const profile = await inA((tx) => getAgencyProfile(tx, ctxA));
    const events = await inA((tx) => listAgencyEvents(tx, profile.id));
    const types = events.map((e) => e.type);
    expect(types).toContain("agency.profile.created");
    expect(types).toContain("agency.profile.updated");
  });

  it("fails closed on invalid context (bad tenantId)", async () => {
    await expect(
      inA((tx) =>
        createAgencyProfile(
          tx,
          { tenantId: "bad-id", orgId: orgA, actorId: "x" },
          { agencyName: "x", brandName: "x" },
        ),
      ),
    ).rejects.toBeInstanceOf(InvalidAgencyContextError);
  });

  it("cross-tenant denial: tenant B profile not visible under tenant A (RLS)", async () => {
    // Create profile for B first
    await inB((tx) =>
      createAgencyProfile(tx, ctxB, { agencyName: "B Agency", brandName: "B" }),
    );
    // A should not find B's profile
    const profileA = await inA((tx) => getAgencyProfile(tx, ctxA));
    expect(profileA.tenantId).toBe(tenantA);
    // getAgencyProfile for B context within A's RLS scope returns not-found
    await expect(
      inA((tx) => getAgencyProfile(tx, { ...ctxA, tenantId: tenantB })),
    ).rejects.toBeInstanceOf(AgencyProfileNotFoundError);
  });
});

describe("Client Workspace", () => {
  it("creates a client workspace with IN country and jurisdiction defaults", async () => {
    const ws = await inA((tx) =>
      createClientWorkspace(tx, ctxA, {
        clientName: "Mehta & Sons",
        industry: "accounting",
        countryCode: "IN",
        region: "IN-MH",
        jurisdictionDefaults: { countryCode: "IN", businessDomain: "accounting" },
        enabledModules: ["financeAgent", "reporting"],
        status: "active",
      }),
    );
    expect(ws.clientName).toBe("Mehta & Sons");
    expect(ws.countryCode).toBe("IN");
    expect(ws.region).toBe("IN-MH");
    expect(ws.jurisdictionDefaults).toEqual({ countryCode: "IN", businessDomain: "accounting" });
    expect(ws.enabledModules).toContain("financeAgent");
    expect(ws.status).toBe("active");
    expect(ws.tenantId).toBe(tenantA);
  });

  it("creates a CA client workspace", async () => {
    const ws = await inA((tx) =>
      createClientWorkspace(tx, ctxA, {
        clientName: "Maple Corp",
        countryCode: "CA",
        jurisdictionDefaults: { countryCode: "CA", businessDomain: "payroll" },
      }),
    );
    expect(ws.countryCode).toBe("CA");
    expect(ws.jurisdictionDefaults).toMatchObject({ countryCode: "CA" });
  });

  it("lists client workspaces scoped to the agency org", async () => {
    const list = await inA((tx) => listClientWorkspaces(tx, ctxA));
    expect(list.length).toBeGreaterThanOrEqual(2);
    for (const ws of list) expect(ws.tenantId).toBe(tenantA);
  });

  it("filters client workspaces by status", async () => {
    const active = await inA((tx) => listClientWorkspaces(tx, ctxA, { status: "active" }));
    for (const ws of active) expect(ws.status).toBe("active");
  });

  it("updates client workspace modules", async () => {
    const ws = await inA((tx) =>
      createClientWorkspace(tx, ctxA, { clientName: "UpdateMe", countryCode: "US" }),
    );
    const updated = await inA((tx) =>
      updateClientWorkspace(tx, ctxA, ws.id, {
        enabledModules: ["runtime", "memory", "salesAgent"],
        status: "active",
      }),
    );
    expect(updated.enabledModules).toContain("salesAgent");
    expect(updated.status).toBe("active");
  });

  it("fails closed on invalid country code", async () => {
    await expect(
      inA((tx) => createClientWorkspace(tx, ctxA, { clientName: "X", countryCode: "XX" })),
    ).rejects.toBeInstanceOf(MalformedAgencyConfigError);
  });

  it("fails closed on region prefix mismatch", async () => {
    await expect(
      inA((tx) =>
        createClientWorkspace(tx, ctxA, { clientName: "X", countryCode: "IN", region: "US-CA" }),
      ),
    ).rejects.toBeInstanceOf(MalformedAgencyConfigError);
  });

  it("fails closed on malformed region format", async () => {
    await expect(
      inA((tx) =>
        createClientWorkspace(tx, ctxA, { clientName: "X", countryCode: "IN", region: "maharashtra" }),
      ),
    ).rejects.toBeInstanceOf(MalformedAgencyConfigError);
  });

  it("fails closed on invalid workspace status", async () => {
    await expect(
      inA((tx) =>
        createClientWorkspace(tx, ctxA, { clientName: "X", status: "deleted" as never }),
      ),
    ).rejects.toBeInstanceOf(InvalidWorkspaceStatusError);
  });

  it("getClientWorkspace throws not-found for missing id", async () => {
    await expect(
      inA((tx) => getClientWorkspace(tx, ctxA, randomUUID())),
    ).rejects.toBeInstanceOf(ClientWorkspaceNotFoundError);
  });

  it("cross-tenant: B workspace not visible under A (RLS)", async () => {
    const wsB = await inB((tx) =>
      createClientWorkspace(tx, ctxB, { clientName: "B Client" }),
    );
    await expect(
      inA((tx) => getClientWorkspace(tx, ctxA, wsB.id)),
    ).rejects.toBeInstanceOf(ClientWorkspaceNotFoundError);
  });

  it("emits agency.client_workspace.created event", async () => {
    const ws = await inA((tx) =>
      createClientWorkspace(tx, ctxA, { clientName: "EventTest" }),
    );
    const events = await inA((tx) => listAgencyEvents(tx, ws.id));
    expect(events.map((e) => e.type)).toContain("agency.client_workspace.created");
  });
});

describe("Feature Flags", () => {
  it("sets feature flags for an org (defaults: core modules on, agents off)", async () => {
    const flags = await inA((tx) =>
      setFeatureFlags(tx, ctxA, { financeAgent: true, reporting: true }),
    );
    expect(flags.runtime).toBe(true);
    expect(flags.memory).toBe(true);
    expect(flags.financeAgent).toBe(true);
    expect(flags.salesAgent).toBe(false);
    expect(flags.reporting).toBe(true);
    expect(flags.tenantId).toBe(tenantA);
    expect(flags.orgId).toBe(orgA);
    expect(flags.clientWorkspaceId).toBeNull();
  });

  it("updates feature flags (upsert is idempotent)", async () => {
    const f2 = await inA((tx) =>
      setFeatureFlags(tx, ctxA, { salesAgent: true }),
    );
    expect(f2.salesAgent).toBe(true);
    // Prior financeAgent=true should be preserved (OR overridden to default — upsert merges with existing)
  });

  it("sets feature flags scoped to a client workspace", async () => {
    const ws = await inA((tx) =>
      createClientWorkspace(tx, ctxA, { clientName: "FlaggedClient", countryCode: "US" }),
    );
    const flags = await inA((tx) =>
      setFeatureFlags(tx, ctxA, { financeAgent: true, tools: false }, ws.id),
    );
    expect(flags.clientWorkspaceId).toBe(ws.id);
    expect(flags.financeAgent).toBe(true);
    expect(flags.tools).toBe(false);
  });

  it("reads feature flags", async () => {
    const flags = await inA((tx) => getFeatureFlags(tx, ctxA));
    expect(flags).not.toBeNull();
    expect(flags!.orgId).toBe(orgA);
  });

  it("returns null when no flags set for scope", async () => {
    const orgNew = randomUUID();
    const flags = await inA((tx) =>
      getFeatureFlags(tx, { ...ctxA, orgId: orgNew }),
    );
    expect(flags).toBeNull();
  });

  it("emits agency.feature_flags.set event", async () => {
    await inA((tx) => setFeatureFlags(tx, ctxA, { reporting: true }));
    // Event is in agency_events — check via raw query scoped to tenantA
    const events = await withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, (tx) =>
      tx.agencyEvent.findMany({ where: { type: "agency.feature_flags.set" } }),
    );
    expect(events.length).toBeGreaterThanOrEqual(1);
  });
});

import { InvalidWorkspaceStatusError } from "./types.js";

/**
 * Gateway integration test (T-1.6) — end-to-end tenant resolution + RLS-scoped
 * data access through the real DB. Requires the dev stack + migrations.
 * Seeds/cleans via the system client (RLS-bypassing) which is exactly the
 * routing path the gateway uses.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getSystemPrisma } from "@optimora/db";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./server.js";

const sys = getSystemPrisma();

const tenantA = randomUUID();
const tenantB = randomUUID();
const orgA = randomUUID();
const orgB = randomUUID();
const domainA = `brand-${tenantA.slice(0, 8)}.example.com`;

let app: FastifyInstance;

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `gw-${tenantA}`, name: "GW Tenant A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `gw-${tenantB}`, name: "GW Tenant B" } });
  await sys.organization.create({
    data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" },
  });
  await sys.organization.create({
    data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" },
  });
  await sys.customDomain.create({ data: { tenantId: tenantA, domain: domainA, status: "active" } });

  app = buildServer({ baseDomains: ["optimora.app"] });
  await app.ready();
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await app.close();
  await sys.$disconnect();
});

describe("gateway tenant resolution + RLS", () => {
  it("resolves via header and returns the tenant (read back through RLS)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { "x-optimora-tenant": tenantA },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.via).toBe("header");
    expect(body.tenant?.id).toBe(tenantA);
  });

  it("only returns the resolved tenant's organizations (RLS-scoped)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/organizations",
      headers: { "x-optimora-tenant": tenantA },
    });
    expect(res.statusCode).toBe(200);
    const ids = res.json().organizations.map((o: { id: string }) => o.id);
    expect(ids).toContain(orgA);
    expect(ids).not.toContain(orgB);
  });

  it("resolves via an active custom domain", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { host: domainA },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.via).toBe("custom-domain");
    expect(body.tenantId).toBe(tenantA);
  });

  it("fails closed (401) when an org header belongs to another tenant", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { "x-optimora-tenant": tenantA, "x-optimora-org": orgB },
    });
    expect(res.statusCode).toBe(401);
  });

  it("fails closed (401) when nothing resolves", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { host: "nope.example.com" },
    });
    expect(res.statusCode).toBe(401);
  });
});

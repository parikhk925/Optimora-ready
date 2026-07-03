/**
 * Custom-domain provisioning integration test (T-1.7).
 * Drives the full PENDING -> ACTIVE lifecycle through the gateway against the
 * real DB, proves RLS isolation between tenants, and shows that once a domain
 * is ACTIVE it resolves the tenant (login served on the brand domain).
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getSystemPrisma } from "@optimora/db";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../server.js";
import { StubDomainProvider } from "./stub-provider.js";

const sys = getSystemPrisma();
const tenantA = randomUUID();
const tenantB = randomUUID();
const domain = `shop-${tenantA.slice(0, 8)}.example.com`;

const provider = new StubDomainProvider();
let app: FastifyInstance;

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `dom-${tenantA}`, name: "Dom A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `dom-${tenantB}`, name: "Dom B" } });
  app = buildServer({ baseDomains: ["optimora.app"], domainProvider: provider });
  await app.ready();
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await app.close();
  await sys.$disconnect();
});

const asTenant = (id: string) => ({ "x-optimora-tenant": id });

describe("custom-domain provisioning", () => {
  it("registers a domain as pending with a DNS challenge", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/domains",
      headers: asTenant(tenantA),
      payload: { domain },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.status).toBe("pending");
    expect(body.verification.recordName).toBe(`_optimora-challenge.${domain}`);
  });

  it("rejects an invalid domain (400)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/domains",
      headers: asTenant(tenantA),
      payload: { domain: "nodot" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("lists the domain only for its owning tenant (RLS)", async () => {
    const a = await app.inject({ method: "GET", url: "/v1/domains", headers: asTenant(tenantA) });
    expect(a.json().domains.map((d: { domain: string }) => d.domain)).toContain(domain);

    const b = await app.inject({ method: "GET", url: "/v1/domains", headers: asTenant(tenantB) });
    expect(b.json().domains.map((d: { domain: string }) => d.domain)).not.toContain(domain);
  });

  it("stays pending until the challenge is satisfied, then goes active", async () => {
    const pending = await app.inject({
      method: "POST",
      url: `/v1/domains/${domain}/verify`,
      headers: asTenant(tenantA),
    });
    expect(pending.json().status).toBe("pending");

    provider.markActive(domain);

    const active = await app.inject({
      method: "POST",
      url: `/v1/domains/${domain}/verify`,
      headers: asTenant(tenantA),
    });
    expect(active.json().status).toBe("active");
  });

  it("once active, the domain resolves the tenant (brand-domain login)", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/me", headers: { host: domain } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.via).toBe("custom-domain");
    expect(body.tenantId).toBe(tenantA);
  });

  it("returns 404 verifying an unknown domain", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/domains/unknown.example.com/verify",
      headers: asTenant(tenantA),
    });
    expect(res.statusCode).toBe(404);
  });
});

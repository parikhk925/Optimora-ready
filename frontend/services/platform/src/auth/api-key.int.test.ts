/**
 * API key integration test (T-2.4) — issue, authenticate-with, list, and revoke
 * org-scoped keys through the gateway; verify fail-closed behavior. Requires the
 * dev stack + migrations.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getSystemPrisma } from "@optimora/db";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../server.js";

const sys = getSystemPrisma();
const tenantA = randomUUID();
const orgA = randomUUID();
let app: FastifyInstance;

const orgCtx = { "x-optimora-tenant": tenantA, "x-optimora-org": orgA };

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `ak-${tenantA}`, name: "AK A" } });
  await sys.organization.create({
    data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" },
  });
  app = buildServer({});
  await app.ready();
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: tenantA } });
  await app.close();
  await sys.$disconnect();
});

async function createKey(
  name = "ci-key",
  scopes: string[] = ["read"],
): Promise<{ id: string; plaintext: string }> {
  const res = await app.inject({
    method: "POST",
    url: "/v1/api-keys",
    headers: orgCtx,
    payload: { name, scopes },
  });
  expect(res.statusCode).toBe(201);
  const body = res.json();
  return { id: body.id, plaintext: body.plaintext };
}

describe("API key lifecycle", () => {
  it("creates a key and authenticates a request with it (via header and Bearer)", async () => {
    const key = await createKey();
    expect(key.plaintext.startsWith("opt_")).toBe(true);

    const viaHeader = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { "x-optimora-api-key": key.plaintext },
    });
    expect(viaHeader.statusCode).toBe(200);
    expect(viaHeader.json()).toMatchObject({ tenantId: tenantA, orgId: orgA, via: "credentials" });

    const viaBearer = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { authorization: `Bearer ${key.plaintext}` },
    });
    expect(viaBearer.statusCode).toBe(200);
    expect(viaBearer.json().orgId).toBe(orgA);
  });

  it("lists keys for the org (never exposing the secret)", async () => {
    const key = await createKey("listed");
    const res = await app.inject({ method: "GET", url: "/v1/api-keys", headers: orgCtx });
    expect(res.statusCode).toBe(200);
    const found = res.json().apiKeys.find((k: { id: string }) => k.id === key.id);
    expect(found).toBeTruthy();
    expect(found).not.toHaveProperty("hashedKey");
    expect(found).not.toHaveProperty("plaintext");
  });

  it("revokes a key so it no longer authenticates (fail-closed)", async () => {
    const key = await createKey("to-revoke");
    const del = await app.inject({
      method: "DELETE",
      url: `/v1/api-keys/${key.id}`,
      headers: orgCtx,
    });
    expect(del.statusCode).toBe(200);

    const after = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { "x-optimora-api-key": key.plaintext },
    });
    expect(after.statusCode).toBe(401);
  });

  it("rejects an invalid/garbage key", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { "x-optimora-api-key": "opt_deadbeefdead.invalidsecretvalue123456" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("requires an org context to manage keys", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/api-keys",
      headers: { "x-optimora-tenant": tenantA },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 revoking an unknown key", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/v1/api-keys/${randomUUID()}`,
      headers: orgCtx,
    });
    expect(res.statusCode).toBe(404);
  });
});

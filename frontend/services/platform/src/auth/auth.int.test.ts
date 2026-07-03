/**
 * Auth integration test (T-2.1) — full magic-link + JWT/refresh lifecycle
 * through the gateway against the real DB, plus tenant isolation and
 * fail-closed behavior. Requires the dev stack + migrations.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getSystemPrisma } from "@optimora/db";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../server.js";
import { StubEmailSender } from "./providers.js";

const sys = getSystemPrisma();
const tenantA = randomUUID();
const tenantB = randomUUID();
const SECRET = "integration-secret-at-least-32-characters!!";
const email = `user-${tenantA.slice(0, 8)}@example.com`;

const sender = new StubEmailSender();
let app: FastifyInstance;

const asTenant = (id: string) => ({ "x-optimora-tenant": id });

function refreshCookie(res: {
  cookies: Array<{ name: string; value: string }>;
}): string | undefined {
  return res.cookies.find((c) => c.name === "optimora_refresh")?.value;
}

async function startLogin(tenantId: string, addr: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/v1/auth/magic-link",
    headers: asTenant(tenantId),
    payload: { email: addr },
  });
  expect(res.statusCode).toBe(200);
  const msg = sender.lastFor(addr);
  expect(msg).toBeTruthy();
  return msg!.token;
}

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `au-${tenantA}`, name: "Auth A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `au-${tenantB}`, name: "Auth B" } });
  app = buildServer({ authSecret: SECRET, emailSender: sender });
  await app.ready();
});

afterAll(async () => {
  await sys.user.deleteMany({ where: { email } });
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await app.close();
  await sys.$disconnect();
});

describe("magic-link login", () => {
  it("issues an access token + refresh cookie and a valid session", async () => {
    const token = await startLogin(tenantA, email);

    const verify = await app.inject({
      method: "POST",
      url: "/v1/auth/magic-link/verify",
      headers: asTenant(tenantA),
      payload: { token },
    });
    expect(verify.statusCode).toBe(200);
    const access = verify.json().accessToken as string;
    expect(access).toBeTruthy();
    expect(refreshCookie(verify)).toBeTruthy();

    const session = await app.inject({
      method: "GET",
      url: "/v1/auth/session",
      headers: { ...asTenant(tenantA), authorization: `Bearer ${access}` },
    });
    expect(session.statusCode).toBe(200);
    expect(session.json().user.email).toBe(email);
  });

  it("rejects an already-consumed magic token (fail-closed)", async () => {
    const token = await startLogin(tenantA, email);
    const first = await app.inject({
      method: "POST",
      url: "/v1/auth/magic-link/verify",
      headers: asTenant(tenantA),
      payload: { token },
    });
    expect(first.statusCode).toBe(200);
    const replay = await app.inject({
      method: "POST",
      url: "/v1/auth/magic-link/verify",
      headers: asTenant(tenantA),
      payload: { token },
    });
    expect(replay.statusCode).toBe(401);
  });
});

describe("session refresh + rotation", () => {
  it("rotates the refresh token and invalidates the old one (reuse detection)", async () => {
    const token = await startLogin(tenantA, email);
    const verify = await app.inject({
      method: "POST",
      url: "/v1/auth/magic-link/verify",
      headers: asTenant(tenantA),
      payload: { token },
    });
    const oldRefresh = refreshCookie(verify)!;

    const refreshed = await app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      headers: asTenant(tenantA),
      cookies: { optimora_refresh: oldRefresh },
    });
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json().accessToken).toBeTruthy();
    const newRefresh = refreshCookie(refreshed)!;
    expect(newRefresh).not.toBe(oldRefresh);

    // Reusing the rotated-away token must fail.
    const reuse = await app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      headers: asTenant(tenantA),
      cookies: { optimora_refresh: oldRefresh },
    });
    expect(reuse.statusCode).toBe(401);
  });
});

describe("logout / revocation", () => {
  it("revokes the session so refresh no longer works", async () => {
    const token = await startLogin(tenantA, email);
    const verify = await app.inject({
      method: "POST",
      url: "/v1/auth/magic-link/verify",
      headers: asTenant(tenantA),
      payload: { token },
    });
    const refresh = refreshCookie(verify)!;

    const out = await app.inject({
      method: "POST",
      url: "/v1/auth/logout",
      headers: asTenant(tenantA),
      cookies: { optimora_refresh: refresh },
    });
    expect(out.statusCode).toBe(200);

    const after = await app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      headers: asTenant(tenantA),
      cookies: { optimora_refresh: refresh },
    });
    expect(after.statusCode).toBe(401);
  });
});

describe("tenant isolation + fail-closed", () => {
  it("a magic token from tenant A cannot be verified under tenant B", async () => {
    const token = await startLogin(tenantA, email);
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/magic-link/verify",
      headers: asTenant(tenantB),
      payload: { token },
    });
    expect(res.statusCode).toBe(401);
  });

  it("an access token for tenant A is rejected under tenant B", async () => {
    const token = await startLogin(tenantA, email);
    const verify = await app.inject({
      method: "POST",
      url: "/v1/auth/magic-link/verify",
      headers: asTenant(tenantA),
      payload: { token },
    });
    const access = verify.json().accessToken as string;

    const session = await app.inject({
      method: "GET",
      url: "/v1/auth/session",
      headers: { ...asTenant(tenantB), authorization: `Bearer ${access}` },
    });
    expect(session.statusCode).toBe(401);
  });

  it("fails closed without credentials", async () => {
    expect(
      (await app.inject({ method: "GET", url: "/v1/auth/session", headers: asTenant(tenantA) }))
        .statusCode,
    ).toBe(401);
    expect(
      (await app.inject({ method: "POST", url: "/v1/auth/refresh", headers: asTenant(tenantA) }))
        .statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/v1/auth/magic-link/verify",
          headers: asTenant(tenantA),
          payload: { token: "bogus" },
        })
      ).statusCode,
    ).toBe(401);
  });
});

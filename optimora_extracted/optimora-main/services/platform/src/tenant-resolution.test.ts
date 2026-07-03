import { describe, it, expect } from "vitest";
import {
  resolveTenantContext,
  type ResolvableRequest,
  type TenantLookup,
} from "./tenant-resolution.js";

const TENANT_DOMAIN = "11111111-1111-1111-1111-111111111111";
const TENANT_SLUG = "22222222-2222-2222-2222-222222222222";
const TENANT_HEADER = "33333333-3333-3333-3333-333333333333";
const ORG_OK = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function lookup(overrides: Partial<TenantLookup> = {}): TenantLookup {
  return {
    tenantIdByDomain: async (d) => (d === "brand.example.com" ? TENANT_DOMAIN : null),
    tenantIdBySlug: async (s) => (s === "acme" ? TENANT_SLUG : null),
    orgBelongsToTenant: async (orgId, tenantId) => orgId === ORG_OK && tenantId === TENANT_HEADER,
    verifyApiKey: async () => null,
    ...overrides,
  };
}

function req(
  host: string | undefined,
  headers: Record<string, string | undefined> = {},
): ResolvableRequest {
  return { host, headers };
}

describe("resolveTenantContext", () => {
  it("resolves via custom domain (highest precedence)", async () => {
    const ctx = await resolveTenantContext(
      req("brand.example.com", { "x-optimora-tenant": TENANT_HEADER }),
      lookup(),
      { baseDomains: ["optimora.app"] },
    );
    expect(ctx).toEqual({ tenantId: TENANT_DOMAIN, orgId: null, via: "custom-domain" });
  });

  it("resolves via subdomain when no custom domain matches", async () => {
    const ctx = await resolveTenantContext(req("acme.optimora.app"), lookup(), {
      baseDomains: ["optimora.app"],
    });
    expect(ctx).toEqual({ tenantId: TENANT_SLUG, orgId: null, via: "subdomain" });
  });

  it("ignores www and nested subdomains", async () => {
    expect(
      await resolveTenantContext(req("www.optimora.app"), lookup(), {
        baseDomains: ["optimora.app"],
      }),
    ).toBeNull();
    expect(
      await resolveTenantContext(req("a.b.optimora.app"), lookup(), {
        baseDomains: ["optimora.app"],
      }),
    ).toBeNull();
  });

  it("resolves via header when no host strategy matches", async () => {
    const ctx = await resolveTenantContext(
      req("unknown.example.com", { "x-optimora-tenant": TENANT_HEADER }),
      lookup(),
    );
    expect(ctx).toEqual({ tenantId: TENANT_HEADER, orgId: null, via: "header" });
  });

  it("attaches org from header only when it belongs to the tenant", async () => {
    const ctx = await resolveTenantContext(
      req(undefined, { "x-optimora-tenant": TENANT_HEADER, "x-optimora-org": ORG_OK }),
      lookup(),
    );
    expect(ctx).toEqual({ tenantId: TENANT_HEADER, orgId: ORG_OK, via: "header" });
  });

  it("fails closed when the header org belongs to another tenant", async () => {
    const ctx = await resolveTenantContext(
      req(undefined, {
        "x-optimora-tenant": TENANT_HEADER,
        "x-optimora-org": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      }),
      lookup(),
    );
    expect(ctx).toBeNull();
  });

  it("resolves via API key (tenant + org) and fails closed on an invalid key", async () => {
    const withKey = lookup({
      verifyApiKey: async (raw) =>
        raw === "opt_good" ? { tenantId: TENANT_HEADER, orgId: ORG_OK } : null,
    });
    const ok = await resolveTenantContext(
      req(undefined, { "x-optimora-api-key": "opt_good" }),
      withKey,
    );
    expect(ok).toEqual({ tenantId: TENANT_HEADER, orgId: ORG_OK, via: "credentials" });

    const bad = await resolveTenantContext(
      req(undefined, { authorization: "Bearer opt_bad" }),
      withKey,
    );
    expect(bad).toBeNull();
  });

  it("prefers an explicit tenant header over an API key (precedence)", async () => {
    const withKey = lookup({
      verifyApiKey: async () => ({ tenantId: ORG_OK, orgId: ORG_OK }),
    });
    const ctx = await resolveTenantContext(
      req(undefined, { "x-optimora-tenant": TENANT_HEADER, "x-optimora-api-key": "opt_x" }),
      withKey,
    );
    expect(ctx).toEqual({ tenantId: TENANT_HEADER, orgId: null, via: "header" });
  });

  it("fails closed on no resolvable strategy", async () => {
    expect(await resolveTenantContext(req("nope.example.com"), lookup())).toBeNull();
    expect(await resolveTenantContext(req(undefined), lookup())).toBeNull();
  });

  it("fails closed on malformed header ids", async () => {
    expect(
      await resolveTenantContext(req(undefined, { "x-optimora-tenant": "not-a-uuid" }), lookup()),
    ).toBeNull();
    expect(
      await resolveTenantContext(
        req(undefined, { "x-optimora-tenant": TENANT_HEADER, "x-optimora-org": "bad" }),
        lookup(),
      ),
    ).toBeNull();
  });
});

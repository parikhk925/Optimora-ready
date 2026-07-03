/**
 * Tenant resolution (T-1.6, EMS.2.1).
 *
 * Resolves an inbound request to exactly one tenant (+ optional organization),
 * or returns null so the caller can fail closed. Strategy order:
 *   1. custom domain   (Host header -> custom_domains)
 *   2. subdomain       (<slug>.<base> -> tenants.slug)
 *   3. explicit header (X-Optimora-Tenant / X-Optimora-Org)
 *   4. API key / JWT   (added in T-2.x; plug into `fromCredentials`)
 *
 * DB lookups are injected via `TenantLookup` so this module is unit-testable
 * without a database and so the privileged (RLS-bypassing) routing reads stay
 * isolated behind a small interface.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ResolvedTenantContext {
  tenantId: string;
  orgId?: string | null;
  /** Which strategy resolved the tenant (for logging/observability). */
  via: "custom-domain" | "subdomain" | "header" | "credentials";
}

/** The minimal request shape the resolver needs. */
export interface ResolvableRequest {
  host: string | undefined;
  headers: Record<string, string | undefined>;
}

/** Privileged routing lookups (implemented over getSystemPrisma in the gateway). */
export interface TenantLookup {
  tenantIdByDomain(domain: string): Promise<string | null>;
  tenantIdBySlug(slug: string): Promise<string | null>;
  /** True if the org exists AND belongs to the given tenant. */
  orgBelongsToTenant(orgId: string, tenantId: string): Promise<boolean>;
  /** Verify a raw API key, returning the org/tenant it authenticates as. */
  verifyApiKey(rawKey: string): Promise<{ tenantId: string; orgId: string } | null>;
}

/** Extract a presented API key from headers (dedicated header or `Bearer opt_`). */
function apiKeyFromHeaders(headers: Record<string, string | undefined>): string | undefined {
  const direct = headers["x-optimora-api-key"];
  if (direct) return direct;
  const auth = headers["authorization"];
  if (auth?.startsWith("Bearer opt_")) return auth.slice("Bearer ".length);
  return undefined;
}

export interface ResolverOptions {
  /** Base domains under which subdomains map to tenant slugs (e.g. "optimora.app"). */
  baseDomains?: string[];
}

function normalizeHost(host: string | undefined): string | null {
  if (!host) return null;
  // Strip port and lowercase.
  return host.split(":")[0]!.toLowerCase().trim() || null;
}

function subdomainSlug(host: string, baseDomains: string[]): string | null {
  for (const base of baseDomains) {
    const suffix = `.${base.toLowerCase()}`;
    if (host.endsWith(suffix)) {
      const slug = host.slice(0, host.length - suffix.length);
      // Only a single, non-empty label (no nested subdomains, no "www").
      if (slug && !slug.includes(".") && slug !== "www") return slug;
    }
  }
  return null;
}

/**
 * Resolve the tenant context for a request, or null if it cannot be resolved.
 * Org resolution (optional) comes from the X-Optimora-Org header and is only
 * accepted if the org belongs to the resolved tenant (else the whole resolution
 * fails closed — a header must not let a caller cross tenants).
 */
export async function resolveTenantContext(
  req: ResolvableRequest,
  lookup: TenantLookup,
  options: ResolverOptions = {},
): Promise<ResolvedTenantContext | null> {
  const baseDomains = options.baseDomains ?? [];
  const host = normalizeHost(req.host);

  let tenantId: string | null = null;
  let via: ResolvedTenantContext["via"] | null = null;

  // 1. custom domain
  if (host) {
    tenantId = await lookup.tenantIdByDomain(host);
    if (tenantId) via = "custom-domain";
  }

  // 2. subdomain
  if (!tenantId && host) {
    const slug = subdomainSlug(host, baseDomains);
    if (slug) {
      tenantId = await lookup.tenantIdBySlug(slug);
      if (tenantId) via = "subdomain";
    }
  }

  // 3. explicit header (dev/testing/service-to-service)
  if (!tenantId) {
    const headerTenant = req.headers["x-optimora-tenant"];
    if (headerTenant && UUID_RE.test(headerTenant)) {
      tenantId = headerTenant;
      via = "header";
    }
  }

  // 4. API key (machine-to-machine): resolves both tenant AND org.
  if (!tenantId) {
    const rawKey = apiKeyFromHeaders(req.headers);
    if (rawKey) {
      const identity = await lookup.verifyApiKey(rawKey);
      // Key present but invalid -> fail closed (do not fall through).
      if (!identity) return null;
      return { tenantId: identity.tenantId, orgId: identity.orgId, via: "credentials" };
    }
  }

  if (!tenantId || !via) return null; // fail closed

  // Optional org from header, validated to belong to the tenant.
  const headerOrg = req.headers["x-optimora-org"];
  let orgId: string | null = null;
  if (headerOrg) {
    if (!UUID_RE.test(headerOrg)) return null; // malformed -> fail closed
    const belongs = await lookup.orgBelongsToTenant(headerOrg, tenantId);
    if (!belongs) return null; // cross-tenant org -> fail closed
    orgId = headerOrg;
  }

  return { tenantId, orgId, via };
}

/**
 * @optimora/db — database client and tenant-context primitives (T-1.4).
 *
 * The runtime client connects as the non-superuser app role and is therefore
 * subject to Row-Level Security. All tenant/org-scoped data access MUST go
 * through `withTenantContext`, which sets the `app.current_tenant` /
 * `app.current_org` GUCs for the duration of a transaction so RLS policies
 * filter rows to the active tenant/organization.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { assertUuid } from "./namespacing.js";

export { Prisma } from "@prisma/client";
export type { PrismaClient } from "@prisma/client";

// Non-relational stores + per-org namespacing helpers.
export * from "./namespacing.js";
export * from "./qdrant.js";
export * from "./clickhouse.js";

export const PACKAGE_NAME = "@optimora/db" as const;

/** A Prisma transaction client (what callbacks receive inside a tenant context). */
export type TxClient = Prisma.TransactionClient;

/** The scoping identifiers injected into the database session for RLS. */
export interface TenantContext {
  /** Resolved tenant id (uuid). Required — there is no "global" data path. */
  tenantId: string;
  /** Resolved organization id (uuid). Optional for tenant-only operations. */
  orgId?: string | null;
}

let singleton: PrismaClient | undefined;

/** Lazily-created process-wide Prisma client (app role; subject to RLS). */
export function getPrisma(): PrismaClient {
  singleton ??= new PrismaClient();
  return singleton;
}

let systemSingleton: PrismaClient | undefined;

/**
 * Privileged client that connects via DIRECT_DATABASE_URL (owner/superuser) and
 * therefore BYPASSES RLS.
 *
 * SYSTEM USE ONLY — exclusively for pre-auth routing/resolution reads that must
 * happen before a tenant context exists (e.g. mapping a custom domain or
 * subdomain to its tenant). It MUST NOT be used to read or write tenant
 * business data; all tenant data access goes through getPrisma() +
 * withTenantContext() so RLS applies.
 */
export function getSystemPrisma(): PrismaClient {
  const url = process.env.DIRECT_DATABASE_URL;
  if (!url) {
    throw new Error("getSystemPrisma requires DIRECT_DATABASE_URL to be set.");
  }
  systemSingleton ??= new PrismaClient({ datasourceUrl: url });
  return systemSingleton;
}

/**
 * Run `fn` inside a transaction whose session is scoped to the given tenant
 * (and optionally organization). RLS policies use these GUCs to filter rows.
 *
 * `set_config(name, value, true)` makes the setting transaction-local, so the
 * scope cannot leak to other queries on the pooled connection.
 */
export async function withTenantContext<T>(
  prisma: PrismaClient,
  ctx: TenantContext,
  fn: (tx: TxClient) => PromiseLike<T>,
): Promise<T> {
  assertUuid(ctx.tenantId, "tenantId");
  if (ctx.orgId != null) assertUuid(ctx.orgId, "orgId");

  return prisma.$transaction(async (tx: TxClient) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${ctx.tenantId}, true)`;
    if (ctx.orgId != null) {
      await tx.$executeRaw`SELECT set_config('app.current_org', ${ctx.orgId}, true)`;
    }
    return fn(tx);
  });
}

/**
 * RLS integration test (T-1.4) — proves tenant/organization isolation is
 * enforced by the database, not just by app code.
 *
 * Requires the dev Postgres (pnpm infra:up) and applied migrations
 * (prisma migrate deploy). The client connects as the non-superuser app role,
 * so RLS policies apply. Run via: pnpm --filter @optimora/db test:integration
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, withTenantContext, type PrismaClient } from "./index.js";

const tenantA = randomUUID();
const tenantB = randomUUID();
const orgA = randomUUID();
const orgB = randomUUID();

let prisma: PrismaClient;

beforeAll(async () => {
  prisma = getPrisma();

  // Seed tenant A + org A under tenant-A context (WITH CHECK requires the
  // inserted rows to belong to the active tenant).
  await withTenantContext(prisma, { tenantId: tenantA }, async (tx) => {
    await tx.tenant.create({ data: { id: tenantA, slug: `t-${tenantA}`, name: "Tenant A" } });
    await tx.organization.create({
      data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" },
    });
  });

  // Seed tenant B + org B under tenant-B context.
  await withTenantContext(prisma, { tenantId: tenantB }, async (tx) => {
    await tx.tenant.create({ data: { id: tenantB, slug: `t-${tenantB}`, name: "Tenant B" } });
    await tx.organization.create({
      data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" },
    });
  });
});

afterAll(async () => {
  // Cleanup: delete each tenant under its own context (cascades its org).
  await withTenantContext(prisma, { tenantId: tenantA }, (tx) =>
    tx.tenant.deleteMany({ where: { id: tenantA } }),
  );
  await withTenantContext(prisma, { tenantId: tenantB }, (tx) =>
    tx.tenant.deleteMany({ where: { id: tenantB } }),
  );
  await prisma.$disconnect();
});

describe("Row-Level Security", () => {
  it("a tenant sees only its own organizations", async () => {
    const rows = await withTenantContext(prisma, { tenantId: tenantA }, (tx) =>
      tx.organization.findMany(),
    );
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(orgA);
    expect(ids).not.toContain(orgB);
  });

  it("cross-tenant lookup by id returns nothing (read isolation)", async () => {
    const leaked = await withTenantContext(prisma, { tenantId: tenantA }, (tx) =>
      tx.organization.findUnique({ where: { id: orgB } }),
    );
    expect(leaked).toBeNull();

    const reverse = await withTenantContext(prisma, { tenantId: tenantB }, (tx) =>
      tx.organization.findUnique({ where: { id: orgA } }),
    );
    expect(reverse).toBeNull();
  });

  it("a tenant cannot see another tenant's tenant row", async () => {
    const other = await withTenantContext(prisma, { tenantId: tenantA }, (tx) =>
      tx.tenant.findUnique({ where: { id: tenantB } }),
    );
    expect(other).toBeNull();
  });

  it("an unscoped connection sees no tenant-scoped rows (fail-closed)", async () => {
    // No withTenantContext -> GUCs unset -> current_setting(...) is NULL -> 0 rows.
    const orgs = await prisma.organization.findMany();
    const ids = orgs.map((r) => r.id);
    expect(ids).not.toContain(orgA);
    expect(ids).not.toContain(orgB);
    expect(orgs).toHaveLength(0);
  });

  it("WITH CHECK blocks inserting an org into a different tenant", async () => {
    await expect(
      withTenantContext(prisma, { tenantId: tenantA }, (tx) =>
        // Try to create an org belonging to tenant B while scoped to tenant A.
        tx.organization.create({
          data: { id: randomUUID(), tenantId: tenantB, slug: "evil", name: "cross-tenant" },
        }),
      ),
    ).rejects.toThrow();
  });
});

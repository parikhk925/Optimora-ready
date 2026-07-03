/**
 * TenantLookup implementation backed by the privileged system client.
 * These are pre-auth ROUTING reads only (no tenant business data); they use
 * getSystemPrisma (RLS-bypassing) because the tenant is not yet known.
 */
import { getSystemPrisma } from "@optimora/db";
import type { TenantLookup } from "./tenant-resolution.js";
import { verifyApiKeyRaw } from "./auth/api-key.js";

const ACTIVE_DOMAIN_STATUSES = new Set(["active", "verified"]);

export function createSystemLookup(): TenantLookup {
  const sys = getSystemPrisma();
  return {
    async tenantIdByDomain(domain: string): Promise<string | null> {
      const row = await sys.customDomain.findUnique({
        where: { domain },
        select: { tenantId: true, status: true },
      });
      if (!row || !ACTIVE_DOMAIN_STATUSES.has(row.status)) return null;
      return row.tenantId;
    },

    async tenantIdBySlug(slug: string): Promise<string | null> {
      const row = await sys.tenant.findUnique({
        where: { slug },
        select: { id: true, status: true },
      });
      if (!row || row.status !== "active") return null;
      return row.id;
    },

    async orgBelongsToTenant(orgId: string, tenantId: string): Promise<boolean> {
      const row = await sys.organization.findFirst({
        where: { id: orgId, tenantId },
        select: { id: true },
      });
      return row != null;
    },

    async verifyApiKey(rawKey: string): Promise<{ tenantId: string; orgId: string } | null> {
      const identity = await verifyApiKeyRaw(sys, rawKey);
      return identity ? { tenantId: identity.tenantId, orgId: identity.orgId } : null;
    },
  };
}

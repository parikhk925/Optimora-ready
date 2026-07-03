/**
 * Custom-domain provisioning service + state machine (T-1.7).
 *
 * Status lifecycle (persisted on custom_domains.status):
 *   pending --verify(active)--> active
 *   pending --verify(failed)--> failed
 *   (failed/pending can be re-verified)
 *
 * DB work runs on a TxClient supplied by the gateway's tenant-scoped runner, so
 * RLS guarantees a tenant can only manage its own domains. The poll loop
 * (poll.ts) is the durable retry piece that a Temporal workflow will host in
 * Phase 2 (T-7.1); the per-iteration logic lives here.
 */
import type { TxClient } from "@optimora/db";
import type { DnsVerification, DomainProvider, DomainStatus } from "./provider.js";

// RFC-1123-ish hostname check (labels of letters/digits/hyphens, 2+ labels).
const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9](-?[a-z0-9])*\.)+[a-z]{2,}$/i;

export class DomainValidationError extends Error {}
export class DomainNotFoundError extends Error {}

export function assertDomain(domain: string): void {
  if (!DOMAIN_RE.test(domain)) {
    throw new DomainValidationError(`Invalid domain: "${domain}"`);
  }
}

export interface RequestDomainResult {
  domain: string;
  status: DomainStatus;
  verification: DnsVerification;
}

/** Register a custom domain for the current tenant; returns the DNS challenge. */
export async function requestDomain(
  tx: TxClient,
  provider: DomainProvider,
  tenantId: string,
  domainRaw: string,
): Promise<RequestDomainResult> {
  const domain = domainRaw.trim().toLowerCase();
  assertDomain(domain);

  const { token, verification } = await provider.createHostname(domain, tenantId);

  // Upsert-by-domain within the tenant (RLS WITH CHECK enforces tenant ownership).
  await tx.customDomain.create({
    data: {
      tenantId,
      domain,
      status: "pending",
      verificationMethod: "dns-txt",
      verificationToken: token,
    },
  });

  return { domain, status: "pending", verification };
}

export interface DomainRecord {
  domain: string;
  status: string;
  verifiedAt: Date | null;
}

/** List the current tenant's domains (RLS-scoped via the supplied tx). */
export async function listDomains(tx: TxClient): Promise<DomainRecord[]> {
  const rows = await tx.customDomain.findMany({
    orderBy: { createdAt: "asc" },
    select: { domain: true, status: true, verifiedAt: true },
  });
  return rows;
}

/** Run one verification check and persist the resulting status transition. */
export async function verifyDomain(
  tx: TxClient,
  provider: DomainProvider,
  domainRaw: string,
): Promise<DomainStatus> {
  const domain = domainRaw.trim().toLowerCase();
  const row = await tx.customDomain.findUnique({
    where: { domain },
    select: { domain: true, verificationToken: true, status: true },
  });
  if (!row) throw new DomainNotFoundError(domain);

  const result = await provider.checkVerification(domain, row.verificationToken ?? "");

  if (result === "active") {
    await tx.customDomain.update({
      where: { domain },
      data: { status: "active", verifiedAt: new Date() },
    });
  } else if (result === "failed") {
    await tx.customDomain.update({ where: { domain }, data: { status: "failed" } });
  }
  return result;
}

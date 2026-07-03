/**
 * Custom-domain provider abstraction (T-1.7).
 *
 * The real implementation (Cloudflare for SaaS custom hostnames) plugs in behind
 * this interface when credentials are supplied; a StubDomainProvider implements
 * it for local dev/tests. The provisioning service depends only on this
 * interface, so no part of the platform is coupled to a specific DNS provider.
 */

export type DomainStatus = "pending" | "active" | "failed";

/** The DNS record the tenant must publish to prove domain ownership. */
export interface DnsVerification {
  method: "dns-txt";
  recordName: string;
  recordValue: string;
}

export interface CreateHostnameResult {
  token: string;
  verification: DnsVerification;
}

export interface DomainProvider {
  /** Register a custom hostname and return the ownership-verification challenge. */
  createHostname(domain: string, tenantId: string): Promise<CreateHostnameResult>;
  /** Check whether the domain's ownership challenge is satisfied yet. */
  checkVerification(domain: string, token: string): Promise<DomainStatus>;
  /** Remove a previously-registered hostname (best effort). */
  deleteHostname(domain: string): Promise<void>;
}

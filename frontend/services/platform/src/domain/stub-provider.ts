/**
 * In-memory DomainProvider for local dev and tests (T-1.7).
 * Models the real provider's lifecycle without external calls. Tests drive
 * verification outcomes via markActive/markFailed; `autoActivate` makes a
 * created hostname verify immediately (convenient for local end-to-end flows).
 */
import { randomUUID } from "node:crypto";
import type { CreateHostnameResult, DomainProvider, DomainStatus } from "./provider.js";

interface Entry {
  token: string;
  status: DomainStatus;
}

export interface StubProviderOptions {
  autoActivate?: boolean;
}

export class StubDomainProvider implements DomainProvider {
  private readonly entries = new Map<string, Entry>();
  private readonly autoActivate: boolean;

  constructor(options: StubProviderOptions = {}) {
    this.autoActivate = options.autoActivate ?? false;
  }

  async createHostname(domain: string, _tenantId?: string): Promise<CreateHostnameResult> {
    const token = randomUUID();
    this.entries.set(domain, { token, status: this.autoActivate ? "active" : "pending" });
    return {
      token,
      verification: {
        method: "dns-txt",
        recordName: `_optimora-challenge.${domain}`,
        recordValue: token,
      },
    };
  }

  async checkVerification(domain: string, token: string): Promise<DomainStatus> {
    const entry = this.entries.get(domain);
    if (!entry || entry.token !== token) return "failed";
    return entry.status;
  }

  async deleteHostname(domain: string): Promise<void> {
    this.entries.delete(domain);
  }

  // ---- test/dev controls ----
  markActive(domain: string): void {
    const e = this.entries.get(domain);
    if (e) e.status = "active";
  }

  markFailed(domain: string): void {
    const e = this.entries.get(domain);
    if (e) e.status = "failed";
  }
}

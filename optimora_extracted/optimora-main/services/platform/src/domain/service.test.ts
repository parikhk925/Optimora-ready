import { describe, it, expect } from "vitest";
import { assertDomain, DomainValidationError } from "./service.js";
import { StubDomainProvider } from "./stub-provider.js";

describe("assertDomain", () => {
  it("accepts valid FQDNs", () => {
    for (const d of ["brand.example.com", "shop.acme.io", "a.b.example.co"]) {
      expect(() => assertDomain(d)).not.toThrow();
    }
  });

  it("rejects invalid hostnames", () => {
    for (const d of ["nodot", "http://x.com", "-bad.example.com", "x..com", ""]) {
      expect(() => assertDomain(d)).toThrow(DomainValidationError);
    }
  });
});

describe("StubDomainProvider", () => {
  it("issues a pending challenge and verifies on activation", async () => {
    const p = new StubDomainProvider();
    const { token, verification } = await p.createHostname("shop.acme.com", "t1");
    expect(verification.method).toBe("dns-txt");
    expect(verification.recordName).toBe("_optimora-challenge.shop.acme.com");
    expect(verification.recordValue).toBe(token);

    expect(await p.checkVerification("shop.acme.com", token)).toBe("pending");
    p.markActive("shop.acme.com");
    expect(await p.checkVerification("shop.acme.com", token)).toBe("active");
  });

  it("fails verification on a token mismatch", async () => {
    const p = new StubDomainProvider();
    await p.createHostname("shop.acme.com", "t1");
    expect(await p.checkVerification("shop.acme.com", "wrong")).toBe("failed");
  });

  it("autoActivate verifies immediately", async () => {
    const p = new StubDomainProvider({ autoActivate: true });
    const { token } = await p.createHostname("shop.acme.com", "t1");
    expect(await p.checkVerification("shop.acme.com", token)).toBe("active");
  });
});

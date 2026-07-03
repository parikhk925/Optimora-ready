/**
 * Jurisdiction unit tests (E9 Jurisdiction). No DB, no AI, no external APIs.
 */
import { describe, expect, it } from "vitest";
import { JURISDICTION_PROFILES, resolveProfile } from "./profiles.js";
import {
  BUSINESS_DOMAINS,
  COUNTRY_CODES,
  InvalidCountryCodeError,
  InvalidJurisdictionContextError,
  JurisdictionError,
  MalformedJurisdictionConfigError,
} from "./types.js";

describe("Country/domain constants", () => {
  it("COUNTRY_CODES contains IN, US, CA, GB, GLOBAL", () => {
    for (const c of ["IN", "US", "CA", "GB", "GLOBAL"]) expect(COUNTRY_CODES).toContain(c);
  });

  it("BUSINESS_DOMAINS contains all required domains", () => {
    for (const d of ["accounting", "bookkeeping", "tax_prep", "payroll", "invoicing", "compliance", "financial_reporting"]) {
      expect(BUSINESS_DOMAINS).toContain(d);
    }
  });
});

describe("Jurisdiction profiles", () => {
  it("each country profile has required fields", () => {
    for (const [code, profile] of Object.entries(JURISDICTION_PROFILES)) {
      expect(profile.countryCode).toBe(code);
      expect(typeof profile.complianceDisclaimer).toBe("string");
      expect(profile.complianceDisclaimer.length).toBeGreaterThan(50);
      expect(typeof profile.currency).toBe("string");
      expect(typeof profile.fiscalYearStart).toBe("string");
      expect(Array.isArray(profile.documentTypes)).toBe(true);
      expect(Array.isArray(profile.restrictedActions)).toBe(true);
    }
  });

  it("GLOBAL profile has an enhanced disclaimer mentioning no jurisdiction", () => {
    expect(JURISDICTION_PROFILES.GLOBAL.complianceDisclaimer).toContain("No specific jurisdiction");
  });

  it("IN profile has PAN and GSTIN identifiers", () => {
    expect(JURISDICTION_PROFILES.IN.taxIdentifierLabels.primary).toBe("PAN");
    expect(JURISDICTION_PROFILES.IN.taxIdentifierLabels.gst).toBe("GSTIN");
    expect(JURISDICTION_PROFILES.IN.fiscalYearStart).toBe("04-01");
  });

  it("US profile has EIN identifier and Jan fiscal year", () => {
    expect(JURISDICTION_PROFILES.US.taxIdentifierLabels.primary).toBe("EIN");
    expect(JURISDICTION_PROFILES.US.fiscalYearStart).toBe("01-01");
  });

  it("GB profile has Apr fiscal year (UK tax year)", () => {
    expect(JURISDICTION_PROFILES.GB.fiscalYearStart).toBe("04-06");
  });

  it("resolveProfile merges overrides onto base", () => {
    const profile = resolveProfile("IN", { currencyCode: "CUSTOM" });
    expect(profile.currencyCode).toBe("CUSTOM");
    expect(profile.countryCode).toBe("IN");
  });

  it("all country profiles restrict government filing actions", () => {
    for (const profile of Object.values(JURISDICTION_PROFILES)) {
      expect(profile.restrictedActions.some((a) => a.includes("file") || a.includes("transfer") || a.includes("sign"))).toBe(true);
    }
  });
});

describe("Error hierarchy", () => {
  it("all jurisdiction errors extend JurisdictionError", () => {
    for (const Cls of [InvalidJurisdictionContextError, InvalidCountryCodeError, MalformedJurisdictionConfigError]) {
      expect(new Cls("x")).toBeInstanceOf(JurisdictionError);
    }
  });
});

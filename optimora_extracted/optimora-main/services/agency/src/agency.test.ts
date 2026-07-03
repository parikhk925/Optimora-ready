import { describe, expect, it } from "vitest";
import {
  AGENCY_MODULES,
  ALLOWED_CLIENT_REGIONS,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  isValidRegion,
  AgencyError,
  InvalidAgencyContextError,
  InvalidLocaleError,
  InvalidCurrencyError,
  InvalidClientRegionError,
  InvalidModuleError,
  MalformedAgencyConfigError,
  AgencyProfileAlreadyExistsError,
  ClientWorkspaceNotFoundError,
} from "./index.js";

describe("Constants", () => {
  it("AGENCY_MODULES contains all required modules", () => {
    for (const m of ["runtime", "memory", "tools", "integrations", "financeAgent", "salesAgent", "supportAgent", "reporting"]) {
      expect(AGENCY_MODULES).toContain(m);
    }
  });

  it("SUPPORTED_LOCALES contains required locales", () => {
    for (const l of ["en-US", "en-GB", "en-CA", "en-IN", "fr-CA"]) {
      expect(SUPPORTED_LOCALES).toContain(l);
    }
  });

  it("SUPPORTED_CURRENCIES contains required currencies", () => {
    for (const c of ["USD", "CAD", "GBP", "INR", "EUR"]) {
      expect(SUPPORTED_CURRENCIES).toContain(c);
    }
  });

  it("ALLOWED_CLIENT_REGIONS includes major markets", () => {
    for (const r of ["IN", "US", "CA", "GB", "GLOBAL"]) {
      expect(ALLOWED_CLIENT_REGIONS).toContain(r);
    }
  });
});

describe("isValidRegion", () => {
  it("accepts valid ISO 3166-2 codes", () => {
    expect(isValidRegion("IN-MH")).toBe(true);
    expect(isValidRegion("US-CA")).toBe(true);
    expect(isValidRegion("GB-ENG")).toBe(true);
    expect(isValidRegion("CA-ON")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidRegion("maharashtra")).toBe(false);
    expect(isValidRegion("IN")).toBe(false);
    expect(isValidRegion("in-mh")).toBe(false);
    expect(isValidRegion("")).toBe(false);
  });
});

describe("Error hierarchy", () => {
  it("all agency errors extend AgencyError", () => {
    for (const Cls of [
      InvalidAgencyContextError, InvalidLocaleError, InvalidCurrencyError,
      InvalidClientRegionError, InvalidModuleError, MalformedAgencyConfigError,
      AgencyProfileAlreadyExistsError, ClientWorkspaceNotFoundError,
    ]) {
      expect(new Cls("x")).toBeInstanceOf(AgencyError);
    }
  });
});

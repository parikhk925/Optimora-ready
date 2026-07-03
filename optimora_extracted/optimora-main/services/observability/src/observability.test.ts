/**
 * Observability unit tests (E9 Observability). No DB, no external vendors.
 */
import { describe, expect, it } from "vitest";
import {
  AUDIT_SERVICES,
  AUDIT_SEVERITIES,
  InvalidObservabilityContextError,
  MalformedEventQueryError,
  ObservabilityError,
  UnauthorizedAuditAccessError,
} from "./types.js";

describe("Constants", () => {
  it("AUDIT_SERVICES contains all expected services", () => {
    for (const s of ["runtime", "model_router", "tools", "integrations", "approval", "metering"]) {
      expect(AUDIT_SERVICES).toContain(s);
    }
  });

  it("AUDIT_SEVERITIES contains debug/info/warn/error", () => {
    expect(AUDIT_SEVERITIES).toEqual(["debug", "info", "warn", "error"]);
  });
});

describe("Error hierarchy", () => {
  it("all observability errors extend ObservabilityError", () => {
    for (const Cls of [InvalidObservabilityContextError, MalformedEventQueryError, UnauthorizedAuditAccessError]) {
      expect(new Cls("x")).toBeInstanceOf(ObservabilityError);
    }
  });
});

import { describe, it, expect } from "vitest";
import { PACKAGE_NAME, assertUuid } from "./index.js";

describe("@optimora/db unit", () => {
  it("exposes its package name", () => {
    expect(PACKAGE_NAME).toBe("@optimora/db");
  });

  it("assertUuid accepts a valid uuid", () => {
    expect(() => assertUuid("3f2504e0-4f89-41d3-9a0c-0305e82c3301", "tenantId")).not.toThrow();
  });

  it("assertUuid rejects malformed ids (fail-closed)", () => {
    expect(() => assertUuid("not-a-uuid", "tenantId")).toThrow(/Invalid tenantId/);
    expect(() => assertUuid("", "orgId")).toThrow(/Invalid orgId/);
    expect(() => assertUuid("123; DROP TABLE tenants;--", "tenantId")).toThrow();
  });
});

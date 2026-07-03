import { describe, it, expect } from "vitest";
import { PACKAGE_NAME, packageInfo } from "./index.js";

describe("@optimora/admin scaffold", () => {
  it("exposes its package name", () => {
    expect(PACKAGE_NAME).toBe("@optimora/admin");
  });

  it("returns package info", () => {
    expect(packageInfo()).toEqual({ name: "@optimora/admin" });
  });
});

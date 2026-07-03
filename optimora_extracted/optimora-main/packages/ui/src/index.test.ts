import { describe, it, expect } from "vitest";
import { PACKAGE_NAME, packageInfo } from "./index.js";

describe("@optimora/ui scaffold", () => {
  it("exposes its package name", () => {
    expect(PACKAGE_NAME).toBe("@optimora/ui");
  });

  it("returns package info", () => {
    expect(packageInfo()).toEqual({ name: "@optimora/ui" });
  });
});

import { describe, it, expect } from "vitest";
import { PACKAGE_NAME, packageInfo } from "./index.js";

describe("@optimora/plugin-sdk scaffold", () => {
  it("exposes its package name", () => {
    expect(PACKAGE_NAME).toBe("@optimora/plugin-sdk");
  });

  it("returns package info", () => {
    expect(packageInfo()).toEqual({ name: "@optimora/plugin-sdk" });
  });
});

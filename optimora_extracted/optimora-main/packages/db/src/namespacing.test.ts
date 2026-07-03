import { describe, it, expect } from "vitest";
import {
  assertSuffix,
  assertUuid,
  clickhouseOrgScope,
  qdrantOrgCollection,
} from "./namespacing.js";

const ORG_A = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const ORG_B = "11111111-2222-3333-4444-555555555555";

describe("per-org namespacing", () => {
  it("derives a deterministic, dash-free Qdrant collection name", () => {
    expect(qdrantOrgCollection(ORG_A, "memory")).toBe(
      "org_3f2504e04f8941d39a0c0305e82c3301_memory",
    );
    // Stable for the same inputs.
    expect(qdrantOrgCollection(ORG_A, "memory")).toBe(qdrantOrgCollection(ORG_A, "memory"));
  });

  it("isolates orgs: different orgs never collide", () => {
    expect(qdrantOrgCollection(ORG_A, "memory")).not.toBe(qdrantOrgCollection(ORG_B, "memory"));
  });

  it("separates named spaces within an org", () => {
    expect(qdrantOrgCollection(ORG_A, "memory")).not.toBe(qdrantOrgCollection(ORG_A, "knowledge"));
  });

  it("rejects malformed org ids and suffixes (fail-closed)", () => {
    expect(() => qdrantOrgCollection("not-a-uuid", "memory")).toThrow(/Invalid orgId/);
    expect(() => qdrantOrgCollection(ORG_A, "Bad-Name")).toThrow(/collection name/);
    expect(() => qdrantOrgCollection(ORG_A, "1leading_digit")).toThrow();
    expect(() => qdrantOrgCollection(ORG_A, "")).toThrow();
  });

  it("clickhouseOrgScope validates and echoes the org id", () => {
    expect(clickhouseOrgScope(ORG_A)).toBe(ORG_A);
    expect(() => clickhouseOrgScope("oops")).toThrow(/Invalid orgId/);
  });

  it("assertUuid / assertSuffix guards", () => {
    expect(() => assertUuid(ORG_A, "orgId")).not.toThrow();
    expect(() => assertSuffix("memory", "name")).not.toThrow();
    expect(() => assertSuffix("UPPER", "name")).toThrow();
  });
});

import { describe, it, expect } from "vitest";
import {
  PACKAGE_NAME,
  isNodeType,
  isEdgeType,
  isHierarchical,
  NODE_TYPES,
  EDGE_TYPES,
} from "./index.js";

describe("@optimora/org-graph types (unit)", () => {
  it("exposes its package name", () => {
    expect(PACKAGE_NAME).toBe("@optimora/org-graph");
  });

  it("recognizes the five node types and four edge types", () => {
    expect(NODE_TYPES).toEqual(["executive", "department", "team", "manager", "agent"]);
    expect(EDGE_TYPES).toEqual(["manages", "reports_to", "delegates_to", "collaborates_with"]);
    expect(isNodeType("agent")).toBe(true);
    expect(isNodeType("robot")).toBe(false);
    expect(isEdgeType("manages")).toBe(true);
    expect(isEdgeType("loves")).toBe(false);
  });

  it("classifies hierarchical (acyclic) edge types", () => {
    expect(isHierarchical("manages")).toBe(true);
    expect(isHierarchical("reports_to")).toBe(true);
    expect(isHierarchical("delegates_to")).toBe(true);
    expect(isHierarchical("collaborates_with")).toBe(false);
  });
});

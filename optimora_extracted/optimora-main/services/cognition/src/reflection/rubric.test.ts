/**
 * Reflection rubric unit tests (T-8.4) — deterministic check evaluation, quality
 * score, violated rules, missing requirements, suggested fixes, and fail-closed
 * on invalid quality rules. No DB, no AI.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createDefinition, type AgentDefinition } from "@optimora/agent-contract";
import { RubricReviewer } from "./rubric.js";
import { InvalidQualityRulesError } from "./types.js";

function def(overrides: Partial<Parameters<typeof createDefinition>[0]> = {}): AgentDefinition {
  return createDefinition({
    identity: { agentId: randomUUID(), key: "writer", displayName: "Writer" },
    role: "Writer",
    qualityRules: { minScore: 0.7, checks: ["non_empty_output", "has_summary", "no_error_field"] },
    outputSchema: { type: "object", required: ["summary"] },
    ...overrides,
  });
}

const reviewer = new RubricReviewer();

describe("RubricReviewer", () => {
  it("passes valid output (all checks + required fields satisfied)", () => {
    const v = reviewer.review({
      taskId: randomUUID(),
      definition: def(),
      output: { summary: "A complete answer", content: "body" },
    });
    expect(v.qualityScore).toBe(1);
    expect(v.violatedRules).toEqual([]);
    expect(v.missingRequirements).toEqual([]);
  });

  it("captures violated rules and missing requirements with suggested fixes", () => {
    const v = reviewer.review({
      taskId: randomUUID(),
      definition: def(),
      output: { error: "boom" }, // empty summary, has error
    });
    expect(v.violatedRules).toContain("has_summary");
    expect(v.violatedRules).toContain("no_error_field");
    expect(v.missingRequirements).toContain("summary");
    expect(v.suggestedFixes.length).toBeGreaterThan(0);
    expect(v.qualityScore).toBeLessThan(0.7);
  });

  it("computes a partial quality score as fraction of checks passed", () => {
    // required:summary (pass) + non_empty_output (pass) + has_summary (pass) +
    // no_error_field (fail) => 3/4 = 0.75
    const v = reviewer.review({
      taskId: randomUUID(),
      definition: def(),
      output: { summary: "ok", error: "x" },
    });
    expect(v.qualityScore).toBeCloseTo(0.75, 5);
  });

  it("treats no configured checks + no required fields as fully passing", () => {
    const v = reviewer.review({
      taskId: randomUUID(),
      definition: def({ qualityRules: { minScore: 0.7, checks: [] }, outputSchema: { type: "object" } }),
      output: {},
    });
    expect(v.qualityScore).toBe(1);
    expect(v.violatedRules).toEqual([]);
  });

  it("fails closed on an unknown quality check", () => {
    expect(() =>
      reviewer.review({
        taskId: randomUUID(),
        definition: def({ qualityRules: { minScore: 0.7, checks: ["does_not_exist"] } }),
        output: { summary: "x" },
      }),
    ).toThrow(InvalidQualityRulesError);
  });
});

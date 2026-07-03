import { describe, it, expect } from "vitest";
import type { TxClient } from "@optimora/db";
import {
  PACKAGE_NAME,
  validateDag,
  RuleBasedPlanner,
  DagCycleError,
  InvalidBlueprintError,
  InvalidGoalError,
  planGoal,
  type GoalSpec,
} from "./index.js";

describe("planning: DAG validation (unit)", () => {
  it("accepts a valid DAG and returns a topological order", () => {
    const order = validateDag({
      tasks: [
        { key: "research", title: "r" },
        { key: "draft", title: "d", dependsOn: ["research"] },
        { key: "review", title: "v", dependsOn: ["draft"] },
      ],
    });
    expect(order.indexOf("research")).toBeLessThan(order.indexOf("draft"));
    expect(order.indexOf("draft")).toBeLessThan(order.indexOf("review"));
  });

  it("rejects cycles and malformed blueprints (fail closed)", () => {
    expect(() =>
      validateDag({
        tasks: [
          { key: "a", title: "a", dependsOn: ["b"] },
          { key: "b", title: "b", dependsOn: ["a"] },
        ],
      }),
    ).toThrow(DagCycleError);
    expect(() => validateDag({ tasks: [{ key: "a", title: "a", dependsOn: ["x"] }] })).toThrow(
      InvalidBlueprintError,
    );
    expect(() =>
      validateDag({
        tasks: [
          { key: "a", title: "a" },
          { key: "a", title: "dup" },
        ],
      }),
    ).toThrow(InvalidBlueprintError);
    expect(() => validateDag({ tasks: [] })).toThrow(InvalidBlueprintError);
  });
});

describe("planning: rule-based planner (unit)", () => {
  it("decomposes deterministically into research -> draft -> review", () => {
    const planner = new RuleBasedPlanner();
    const goal: GoalSpec = { tenantId: "t", orgId: "o", title: "Launch" };
    const a = planner.decompose(goal);
    const b = planner.decompose(goal);
    expect(a).toEqual(b); // deterministic
    expect(a.tasks.map((t) => t.key)).toEqual(["research", "draft", "review"]);
    expect(a.tasks.find((t) => t.key === "draft")?.dependsOn).toEqual(["research"]);
    validateDag(a); // the stub always produces a valid DAG
  });
});

describe("planning: goal validation (unit)", () => {
  it("fails closed on an invalid goal before touching the DB", async () => {
    const dummyTx = {} as TxClient; // never used because validation throws first
    await expect(
      planGoal(dummyTx, { tenantId: "bad", orgId: "bad", title: "x" }),
    ).rejects.toBeInstanceOf(InvalidGoalError);
  });

  it("exposes the package name", () => {
    expect(PACKAGE_NAME).toBe("@optimora/cognition");
  });
});

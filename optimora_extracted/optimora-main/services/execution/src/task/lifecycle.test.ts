import { describe, it, expect } from "vitest";
import {
  TASK_STATES,
  assertTaskTransition,
  canTransitionTask,
  InvalidTaskTransitionError,
} from "./lifecycle.js";

describe("task lifecycle (unit)", () => {
  it("declares the full state set", () => {
    expect(TASK_STATES).toContain("draft");
    expect(TASK_STATES).toContain("in_review");
    expect(TASK_STATES).toContain("escalated");
  });

  it("allows the happy-path transitions", () => {
    expect(canTransitionTask("draft", "ready")).toBe(true);
    expect(canTransitionTask("ready", "scheduled")).toBe(true);
    expect(canTransitionTask("scheduled", "in_progress")).toBe(true);
    expect(canTransitionTask("in_progress", "in_review")).toBe(true);
    expect(canTransitionTask("in_review", "done")).toBe(true);
  });

  it("rejects invalid transitions (fail closed)", () => {
    expect(canTransitionTask("draft", "done")).toBe(false);
    expect(canTransitionTask("done", "in_progress")).toBe(false);
    expect(canTransitionTask("in_progress", "nonsense")).toBe(false);
    expect(() => assertTaskTransition("draft", "done")).toThrow(InvalidTaskTransitionError);
  });
});

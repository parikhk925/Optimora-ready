/**
 * Deterministic rule-based planner (T-8.1). No AI calls. Produces a small,
 * predictable task DAG (research -> draft -> review) from a goal, optionally
 * prefixed with a planning task. The real LLM planner implements the same
 * PlannerProvider interface later.
 */
import type { GoalSpec, PlanBlueprint, PlannerProvider, TaskSpec } from "./types.js";

export class RuleBasedPlanner implements PlannerProvider {
  readonly name = "rule-based-stub";

  decompose(goal: GoalSpec): PlanBlueprint {
    const base = goal.priority ?? 3;
    const tasks: TaskSpec[] = [
      { key: "research", title: `Research: ${goal.title}`, priority: base, estimatedCost: 1 },
      {
        key: "draft",
        title: `Draft: ${goal.title}`,
        priority: base,
        estimatedCost: 2,
        dependsOn: ["research"],
      },
      {
        key: "review",
        title: `Review: ${goal.title}`,
        priority: base,
        estimatedCost: 1,
        dependsOn: ["draft"],
      },
    ];
    return { tasks };
  }
}

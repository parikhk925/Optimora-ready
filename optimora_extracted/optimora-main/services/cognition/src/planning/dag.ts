/**
 * DAG validation for plan blueprints (T-8.1). Ensures task keys are unique, all
 * dependencies reference existing tasks, and there are no cycles (Kahn's
 * algorithm). A cyclic or malformed blueprint is rejected (fail closed).
 */
import { DagCycleError, InvalidBlueprintError, type PlanBlueprint } from "./types.js";

/** Validate a blueprint and return a topological order of task keys. */
export function validateDag(blueprint: PlanBlueprint): string[] {
  const tasks = blueprint.tasks;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new InvalidBlueprintError("Blueprint must contain at least one task.");
  }

  const keys = new Set<string>();
  for (const t of tasks) {
    if (!t.key) throw new InvalidBlueprintError("Every task needs a key.");
    if (keys.has(t.key)) throw new InvalidBlueprintError(`Duplicate task key: ${t.key}`);
    keys.add(t.key);
  }

  const indegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const t of tasks) {
    indegree.set(t.key, indegree.get(t.key) ?? 0);
    for (const dep of t.dependsOn ?? []) {
      if (!keys.has(dep))
        throw new InvalidBlueprintError(`Unknown dependency "${dep}" for "${t.key}".`);
      if (dep === t.key) throw new DagCycleError(`Task "${t.key}" depends on itself.`);
      adj.set(dep, [...(adj.get(dep) ?? []), t.key]);
      indegree.set(t.key, (indegree.get(t.key) ?? 0) + 1);
    }
  }

  const queue = [...keys].filter((k) => (indegree.get(k) ?? 0) === 0);
  const order: string[] = [];
  while (queue.length > 0) {
    const k = queue.shift()!;
    order.push(k);
    for (const next of adj.get(k) ?? []) {
      indegree.set(next, (indegree.get(next) ?? 0) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  if (order.length !== keys.size) throw new DagCycleError();
  return order;
}

/**
 * Planning Engine types (T-8.1).
 *
 * The Planning Engine decomposes a goal/mission into a task DAG. Decomposition is
 * done by a PlannerProvider so a real LLM planner can plug in later behind the
 * same interface; the default is a deterministic rule-based stub (no AI calls).
 */
export interface GoalSpec {
  tenantId: string;
  orgId: string;
  title: string;
  objective?: string;
  /** Org-graph node (department/team) the work is assigned to. */
  targetNodeId?: string | null;
  priority?: number;
  /** Optional budget node + estimate to reserve against (T-3.2). */
  budgetNodeId?: string | null;
}

/** One task in a plan blueprint; `dependsOn` references other task keys. */
export interface TaskSpec {
  key: string;
  title: string;
  priority?: number;
  estimatedCost?: number;
  dependsOn?: string[];
}

export interface PlanBlueprint {
  tasks: TaskSpec[];
}

/** Pluggable planner. Real LLM planner implements this later; stub for now. */
export interface PlannerProvider {
  readonly name: string;
  decompose(goal: GoalSpec): PlanBlueprint | Promise<PlanBlueprint>;
}

export class PlanningError extends Error {}
export class InvalidGoalError extends PlanningError {}
export class DagCycleError extends PlanningError {
  constructor(message = "Plan blueprint contains a dependency cycle.") {
    super(message);
    this.name = "DagCycleError";
  }
}
export class InvalidBlueprintError extends PlanningError {}

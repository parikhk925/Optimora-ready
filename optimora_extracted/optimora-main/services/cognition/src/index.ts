/**
 * @optimora/cognition — the Cognition Plane (T-8.x).
 * T-8.1: the Planning Engine (goal -> task DAG). No AI calls (pluggable planner).
 */
export const PACKAGE_NAME = "@optimora/cognition" as const;

export { planGoal, type PlanResult } from "./planning/engine.js";
export {
  createPlan,
  getPlan,
  updatePlan,
  listPlanTasks,
  listPlanEvents,
  emitPlanEvent,
  type PlanView,
} from "./planning/store.js";
export { validateDag } from "./planning/dag.js";
export { RuleBasedPlanner } from "./planning/planner-stub.js";
export {
  type GoalSpec,
  type TaskSpec,
  type PlanBlueprint,
  type PlannerProvider,
  PlanningError,
  InvalidGoalError,
  DagCycleError,
  InvalidBlueprintError,
} from "./planning/types.js";

// ---- Scheduler (T-8.2, Spec A) ----
export { scheduleTask } from "./scheduler/engine.js";
export { hardFilter, type HardFilterContext } from "./scheduler/hard-filter.js";
export { softScore, weightsForPriority, type ScoreContext } from "./scheduler/soft-score.js";
export {
  type TaskRequirements,
  type SchedulerCandidate,
  type SchedulerDecision,
  type Assignment,
  type CandidateEvaluation,
  type ScoreBreakdown,
  type ScoreWeights,
  type ScheduleOptions,
  SchedulerError,
  TaskNotSchedulableError,
} from "./scheduler/types.js";

// ---- Decision Engine (T-8.3) ----
export {
  decideDepartmentRoute,
  decideAgentRoute,
  decideEscalation,
  decideConflict,
} from "./decision/engine.js";
export { nearestCommonAncestor } from "./decision/nca.js";
export {
  createDecisionRecord,
  emitDecisionEvent,
  getDecision,
  listDecisionEvents,
  type DecisionRecord,
} from "./decision/store.js";
export {
  type DecisionType,
  type DecisionOutcome,
  type DecisionContext,
  type DecisionResult,
  type DecisionProvider,
  DecisionError,
  InvalidDecisionContextError,
  UnauthorizedDecisionError,
} from "./decision/types.js";

// ---- Reflection Engine (T-8.4) ----
export { reflectOnTask } from "./reflection/engine.js";
export { RubricReviewer, CHECK_REGISTRY } from "./reflection/rubric.js";
export { StubJudgeReviewer } from "./reflection/judge-stub.js";
export {
  createCritiqueRecord,
  emitReflectionEvent,
  getCritique,
  listReflectionEvents,
  type CritiqueRecord,
  type CreateCritiqueInput,
} from "./reflection/store.js";
export {
  type ReviewerType,
  type CritiqueResult,
  type ReflectionRecommendation,
  type ReflectionContext,
  type EvidenceRef,
  type Critique,
  type ReflectInput,
  type ReviewVerdict,
  type ReflectionProvider,
  ReflectionError,
  InvalidReflectionContextError,
  MissingReflectionContextError,
  InvalidOutputError,
  InvalidQualityRulesError,
  ReflectionProviderNotImplementedError,
} from "./reflection/types.js";

// ---- Learning Engine (T-8.5) ----
export { runLearning, type RunLearningInput } from "./learning/engine.js";
export { aggregateSignals, type CritiqueSignal } from "./learning/aggregate.js";
export { DeterministicLearner, LEARNER_THRESHOLDS } from "./learning/learner.js";
export { StubLlmLearner } from "./learning/learner-stub.js";
export { evalGate, EVAL_GATE, type GateVerdict } from "./learning/eval-gate.js";
export {
  listCritiqueSignals,
  upsertAgentPerformance,
  getAgentPerformance,
  createLearningRecord,
  getLearningRecord,
  emitLearningEvent,
  listLearningEvents,
  type AgentPerformanceRecord,
  type LearningRecordRow,
  type CreateLearningRecordInput,
} from "./learning/store.js";
export {
  type RecommendationType,
  type ProposalStatus,
  type LearningContext,
  type PerformanceSignals,
  type LearningRecommendation,
  type LearningResult,
  type RecommendationDraft,
  type LearningProvider,
  LearningError,
  InvalidLearningContextError,
  MissingLearningContextError,
  MalformedSignalError,
  LearningProviderNotImplementedError,
} from "./learning/types.js";

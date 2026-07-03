/**
 * @optimora/execution — durable workflow foundation (T-7.1).
 * Temporal lives behind this package's abstraction (WorkflowService / worker
 * factory); later workflow + agent-runtime code builds on these primitives.
 */
export const PACKAGE_NAME = "@optimora/execution" as const;

export {
  DEFAULT_NAMESPACE,
  MissingTenantContextError,
  assertTenant,
  namespaceForTenant,
  taskQueueForTenant,
  buildWorkflowId,
  tenantMemo,
  type WorkflowIdParams,
} from "./temporal/naming.js";
export { temporalAddress } from "./temporal/connection.js";
export { checkTemporalHealth, type TemporalHealth } from "./temporal/health.js";
export {
  WorkflowService,
  createWorkflowService,
  type StartWorkflowParams,
  type WorkflowRunHandle,
  type WorkflowServiceHandle,
} from "./temporal/client.js";
export {
  createTenantWorker,
  type CreateWorkerParams,
  type ManagedWorker,
} from "./temporal/worker.js";

// ---- Task Engine (T-7.2) ----
export {
  TASK_STATES,
  type TaskState,
  isTaskState,
  canTransitionTask,
  assertTaskTransition,
  InvalidTaskTransitionError,
} from "./task/lifecycle.js";
export {
  createTask,
  getTask,
  transitionTask,
  addDependency,
  isUnblocked,
  markReady,
  listReadyQueue,
  assignAgent,
  attachBudgetReservation,
  emitTaskEvent,
  listTaskEvents,
  TaskNotFoundError,
  DependencyBlockedError,
  BudgetReservationMissingError,
  InvalidAgentDefinitionError,
  type TaskView,
  type CreateTaskInput,
} from "./task/store.js";

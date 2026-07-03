/**
 * Task lifecycle state machine (T-7.2).
 * Draft -> Ready -> Scheduled -> InProgress -> InReview -> Done, plus Failed,
 * Cancelled, Escalated. Invalid transitions fail closed.
 */
export const TASK_STATES = [
  "draft",
  "ready",
  "scheduled",
  "in_progress",
  "in_review",
  "done",
  "failed",
  "cancelled",
  "escalated",
] as const;

export type TaskState = (typeof TASK_STATES)[number];

export function isTaskState(value: string): value is TaskState {
  return (TASK_STATES as readonly string[]).includes(value);
}

const TRANSITIONS: Record<TaskState, readonly TaskState[]> = {
  draft: ["ready", "cancelled"],
  ready: ["scheduled", "cancelled"],
  scheduled: ["in_progress", "cancelled", "failed"],
  in_progress: ["in_review", "failed", "escalated", "cancelled"],
  in_review: ["done", "in_progress", "escalated", "failed"],
  escalated: ["in_progress", "cancelled", "failed"],
  done: [],
  failed: [],
  cancelled: [],
};

export class InvalidTaskTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid task transition: ${from} -> ${to}`);
    this.name = "InvalidTaskTransitionError";
  }
}

export function canTransitionTask(from: TaskState, to: string): to is TaskState {
  return isTaskState(to) && TRANSITIONS[from].includes(to);
}

export function assertTaskTransition(from: TaskState, to: string): TaskState {
  if (!canTransitionTask(from, to)) throw new InvalidTaskTransitionError(from, to);
  return to;
}

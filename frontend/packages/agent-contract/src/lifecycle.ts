/**
 * Agent lifecycle state machine (T-4.1).
 *
 * An AI employee moves through a hire/probation/promote/retire lifecycle. This
 * module defines the states and the allowed transitions; the full runtime that
 * drives transitions (performance-based promotion, etc.) arrives in later tasks.
 */
export const LIFECYCLE_STATES = [
  "draft",
  "trained",
  "hired",
  "probation",
  "promoted",
  "demoted",
  "suspended",
  "retired",
  "fired",
  "archived",
] as const;

export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

export function isLifecycleState(value: string): value is LifecycleState {
  return (LIFECYCLE_STATES as readonly string[]).includes(value);
}

/** Allowed transitions. `archived` is terminal. */
const TRANSITIONS: Record<LifecycleState, readonly LifecycleState[]> = {
  draft: ["trained", "archived"],
  trained: ["hired", "archived"],
  hired: ["probation", "promoted", "demoted", "suspended", "retired", "fired"],
  probation: ["hired", "promoted", "demoted", "suspended", "fired"],
  promoted: ["demoted", "suspended", "retired", "fired"],
  demoted: ["promoted", "suspended", "retired", "fired"],
  suspended: ["hired", "retired", "fired", "archived"],
  retired: ["archived"],
  fired: ["archived"],
  archived: [],
};

export class InvalidLifecycleTransitionError extends Error {
  constructor(from: LifecycleState, to: string) {
    super(`Invalid lifecycle transition: ${from} -> ${to}`);
    this.name = "InvalidLifecycleTransitionError";
  }
}

export function allowedTransitions(from: LifecycleState): readonly LifecycleState[] {
  return TRANSITIONS[from];
}

export function canTransition(from: LifecycleState, to: string): to is LifecycleState {
  return isLifecycleState(to) && TRANSITIONS[from].includes(to);
}

/** Returns the new state or throws InvalidLifecycleTransitionError. */
export function applyTransition(from: LifecycleState, to: string): LifecycleState {
  if (!canTransition(from, to)) throw new InvalidLifecycleTransitionError(from, to);
  return to;
}

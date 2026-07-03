/**
 * Temporal workflow definitions (T-7.1).
 *
 * This file is bundled and run in the Temporal workflow sandbox, so it must stay
 * deterministic and workflow-safe: only @temporalio/workflow APIs and a TYPE-only
 * import of activities. No Node APIs, no direct IO.
 */
import { proxyActivities, defineSignal, setHandler, condition } from "@temporalio/workflow";
import type * as activities from "./activities.js";

const { recordStep, taskTransitionActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: "10 seconds",
});

/** Minimal start/complete workflow used for health/smoke checks. */
export async function greetWorkflow(name: string): Promise<string> {
  const step = await recordStep(name);
  return `hello ${name} (${step})`;
}

export const proceedSignal = defineSignal("proceed");

/**
 * Resumable workflow: runs step one, then durably waits for a `proceed` signal,
 * then runs step two. The wait is what lets us kill the worker mid-run and prove
 * the workflow resumes on a fresh worker (state lives in the Temporal server).
 */
export async function resumableWorkflow(label: string): Promise<string> {
  const one = await recordStep(`${label}-one`);
  let proceed = false;
  setHandler(proceedSignal, () => {
    proceed = true;
  });
  await condition(() => proceed);
  const two = await recordStep(`${label}-two`);
  return `${one}|${two}`;
}

export const completeSignal = defineSignal("complete");

/**
 * Durable task execution (T-7.2): transitions the task to in_progress, durably
 * awaits a `complete` signal, then runs in_review -> done. The signal wait is the
 * window for the worker-kill/resume proof — task state lives in the DB + the
 * Temporal server, so a fresh worker resumes it.
 */
export async function taskExecutionWorkflow(input: {
  taskId: string;
  tenantId: string;
}): Promise<string> {
  await taskTransitionActivity({
    tenantId: input.tenantId,
    taskId: input.taskId,
    to: "in_progress",
  });
  let complete = false;
  setHandler(completeSignal, () => {
    complete = true;
  });
  await condition(() => complete);
  await taskTransitionActivity({ tenantId: input.tenantId, taskId: input.taskId, to: "in_review" });
  await taskTransitionActivity({ tenantId: input.tenantId, taskId: input.taskId, to: "done" });
  return "done";
}

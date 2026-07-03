/**
 * Temporal activities (T-7.1/T-7.2). Activities run in the normal Node context
 * (not the workflow sandbox), so they may use any IO incl. the database. The
 * workflow file imports these as TYPES only, so DB code never enters the sandbox.
 */
import { getPrisma, withTenantContext } from "@optimora/db";
import { transitionTask } from "./task/store.js";

export async function recordStep(label: string): Promise<string> {
  return `step:${label}`;
}

/** Durably transition a task to a new lifecycle state (tenant-scoped). */
export async function taskTransitionActivity(input: {
  tenantId: string;
  taskId: string;
  to: string;
}): Promise<string> {
  return withTenantContext(getPrisma(), { tenantId: input.tenantId }, async (tx) => {
    const task = await transitionTask(tx, input.taskId, input.to);
    return task.status;
  });
}

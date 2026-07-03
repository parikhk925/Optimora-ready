/**
 * Task durable-execution integration test (T-7.2) — runs a task through Temporal
 * (scheduled -> in_progress -> in_review -> done) and proves worker-kill/resume:
 * the workflow advances the task, the worker is stopped mid-run, and a fresh
 * worker resumes it after the signal. Requires the dev Temporal + Postgres.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import {
  createTask,
  createTenantWorker,
  createWorkflowService,
  getTask,
  markReady,
  transitionTask,
  type ManagedWorker,
  type WorkflowServiceHandle,
} from "../index.js";

const sys = getSystemPrisma();
const prisma = getPrisma();
const tenantA = randomUUID();
const orgA = randomUUID();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let svc: WorkflowServiceHandle | undefined;
const workers: ManagedWorker[] = [];
const inA = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, fn);

async function startWorker(): Promise<{ mw: ManagedWorker; run: Promise<void> }> {
  const mw = await createTenantWorker({ tenantId: tenantA });
  workers.push(mw);
  return { mw, run: mw.run() };
}

afterAll(async () => {
  for (const w of workers) {
    try {
      w.shutdown();
    } catch {
      /* ignore */
    }
    await w.close().catch(() => {});
  }
  await svc?.close().catch(() => {});
  await sys.tenant.deleteMany({ where: { id: tenantA } }).catch(() => {});
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Task durable execution", () => {
  it("runs a task to done and resumes on a fresh worker after a kill", async () => {
    await sys.tenant.create({ data: { id: tenantA, slug: `tt-${tenantA}`, name: "TT A" } });
    await sys.organization.create({
      data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" },
    });

    // Create the task and move it to `scheduled` before execution.
    const task = await inA((tx) =>
      createTask(tx, { tenantId: tenantA, orgId: orgA, title: "Durable task" }),
    );
    await inA((tx) => markReady(tx, task.id));
    await inA((tx) => transitionTask(tx, task.id, "scheduled"));

    svc = await createWorkflowService();

    // Worker 1 starts the workflow (transitions task -> in_progress, then awaits signal).
    const first = await startWorker();
    const handle = await svc.service.start({
      tenantId: tenantA,
      orgId: orgA,
      workflowType: "taskExecutionWorkflow",
      args: [{ taskId: task.id, tenantId: tenantA }],
      key: `task-${task.id}`,
    });
    await sleep(2500);
    expect((await inA((tx) => getTask(tx, task.id)))?.status).toBe("in_progress");

    // Kill worker 1 — task + workflow state survive on the server/DB.
    first.mw.shutdown();
    await first.run;
    await first.mw.close();

    // Worker 2 (fresh) resumes; the signal lets the task finish.
    const second = await startWorker();
    await svc.service.signal(handle.workflowId, "complete");

    expect(await handle.result<string>()).toBe("done");
    expect((await inA((tx) => getTask(tx, task.id)))?.status).toBe("done");

    second.mw.shutdown();
    await second.run;
    await second.mw.close();
  }, 120000);
});

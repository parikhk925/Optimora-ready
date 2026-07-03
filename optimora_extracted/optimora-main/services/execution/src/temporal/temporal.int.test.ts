/**
 * Temporal integration test (T-7.1) — proves the durable workflow foundation:
 * health, a workflow starts + completes, it is tenant-tagged (task queue +
 * workflow id + memo), fail-closed without tenant, and resumes on a fresh worker
 * after the original worker is stopped (durability). Requires the dev Temporal
 * server (pnpm infra:up).
 */
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  checkTemporalHealth,
  createTenantWorker,
  createWorkflowService,
  MissingTenantContextError,
  taskQueueForTenant,
  type ManagedWorker,
  type WorkflowServiceHandle,
} from "../index.js";

const tenantA = randomUUID();
const orgA = randomUUID();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let svc: WorkflowServiceHandle | undefined;
const workers: ManagedWorker[] = [];

async function startWorker(tenantId: string): Promise<{ mw: ManagedWorker; run: Promise<void> }> {
  const mw = await createTenantWorker({ tenantId });
  workers.push(mw);
  const run = mw.run();
  return { mw, run };
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
});

describe("Temporal foundation", () => {
  it("reports healthy", async () => {
    const h = await checkTemporalHealth();
    expect(h.healthy).toBe(true);
    expect(h.address).toContain(":7233");
  }, 30000);

  it("fails closed when starting a workflow without a tenant", async () => {
    svc ??= await createWorkflowService();
    await expect(
      svc.service.start({ tenantId: "", workflowType: "greetWorkflow", args: ["x"] }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);
  }, 30000);

  it("starts and completes a workflow, tenant-tagged", async () => {
    svc ??= await createWorkflowService();
    const { run } = await startWorker(tenantA);

    const handle = await svc.service.start({
      tenantId: tenantA,
      orgId: orgA,
      workflowType: "greetWorkflow",
      args: ["optimora"],
      key: "greet-1",
    });
    expect(handle.taskQueue).toBe(taskQueueForTenant(tenantA));
    expect(handle.workflowId).toContain(tenantA);

    const result = await handle.result<string>();
    expect(result).toBe("hello optimora (step:optimora)");

    const desc = await svc.service.describe(handle.workflowId);
    expect(desc.memo).toMatchObject({ tenantId: tenantA, orgId: orgA });

    const w = workers.pop()!;
    w.shutdown();
    await run;
    await w.close();
  }, 60000);

  it("resumes a workflow on a fresh worker after the original is stopped", async () => {
    svc ??= await createWorkflowService();

    // Worker 1 starts the workflow; it runs step one then durably awaits a signal.
    const first = await startWorker(tenantA);
    const handle = await svc.service.start({
      tenantId: tenantA,
      orgId: orgA,
      workflowType: "resumableWorkflow",
      args: ["job"],
      key: `resume-${randomUUID()}`,
    });
    await sleep(2000); // let step one run

    // Stop worker 1 — the workflow state survives on the Temporal server.
    const w1 = workers.find((w) => w === first.mw)!;
    w1.shutdown();
    await first.run;
    await w1.close();

    // Worker 2 (fresh) picks up the same task queue; signal lets it finish.
    const second = await startWorker(tenantA);
    await svc.service.signal(handle.workflowId, "proceed");

    const result = await handle.result<string>();
    expect(result).toBe("step:job-one|step:job-two");

    const w2 = workers.find((w) => w === second.mw)!;
    w2.shutdown();
    await second.run;
    await w2.close();
  }, 90000);
});

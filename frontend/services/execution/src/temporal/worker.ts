/**
 * Temporal worker factory (T-7.1). Creates a tenant-scoped worker that polls the
 * tenant's task queue and runs the registered workflows + activities. The worker
 * lifecycle (run/shutdown) is what the resume proof exercises.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  DefaultLogger,
  type LogLevel,
  NativeConnection,
  Runtime,
  Worker,
} from "@temporalio/worker";
import * as activities from "../activities.js";
import { temporalAddress } from "./connection.js";
import { assertTenant, namespaceForTenant, taskQueueForTenant } from "./naming.js";

let runtimeInstalled = false;

/** Install the Temporal Runtime once with a quiet default logger (override via env). */
function ensureRuntime(): void {
  if (runtimeInstalled) return;
  runtimeInstalled = true;
  const level = (process.env.TEMPORAL_LOG_LEVEL as LogLevel | undefined) ?? "WARN";
  try {
    Runtime.install({ logger: new DefaultLogger(level) });
  } catch {
    // Already installed elsewhere; ignore.
  }
}

/** Resolve the workflows entry on disk (src .ts in dev/tests, dist .js in prod). */
function resolveWorkflowsPath(): string {
  const base = fileURLToPath(new URL("../workflows", import.meta.url));
  for (const ext of [".ts", ".js"]) {
    if (existsSync(base + ext)) return base + ext;
  }
  return `${base}.js`;
}

export interface CreateWorkerParams {
  tenantId: string;
  namespace?: string;
}

export interface ManagedWorker {
  worker: Worker;
  taskQueue: string;
  /** Start polling; resolves when the worker stops. */
  run(): Promise<void>;
  /** Graceful shutdown. */
  shutdown(): void;
  /** Close the underlying native connection. */
  close(): Promise<void>;
}

export async function createTenantWorker(params: CreateWorkerParams): Promise<ManagedWorker> {
  assertTenant(params.tenantId);
  ensureRuntime();
  const taskQueue = taskQueueForTenant(params.tenantId);
  const namespace = params.namespace ?? namespaceForTenant(params.tenantId);
  const connection = await NativeConnection.connect({ address: temporalAddress() });

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue,
    workflowsPath: resolveWorkflowsPath(),
    activities,
  });

  return {
    worker,
    taskQueue,
    run: () => worker.run(),
    shutdown: () => worker.shutdown(),
    close: () => connection.close(),
  };
}

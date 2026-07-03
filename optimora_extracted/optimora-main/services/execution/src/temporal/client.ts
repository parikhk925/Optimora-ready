/**
 * WorkflowService — the small internal abstraction over Temporal's client (T-7.1).
 *
 * Callers start/signal/await workflows through this service and never import
 * @temporalio/client directly, so later workflow/business code does not depend on
 * Temporal implementation details. Every start is tenant-tagged (task queue +
 * workflow id + memo) and fails closed without a tenant.
 */
import { Client, Connection, type WorkflowHandle } from "@temporalio/client";
import { temporalAddress } from "./connection.js";
import {
  DEFAULT_NAMESPACE,
  assertTenant,
  buildWorkflowId,
  taskQueueForTenant,
  tenantMemo,
} from "./naming.js";

export interface StartWorkflowParams {
  tenantId: string;
  orgId?: string | null;
  /** Registered workflow type name, e.g. "greetWorkflow". */
  workflowType: string;
  args?: unknown[];
  key?: string;
}

export interface WorkflowRunHandle {
  workflowId: string;
  taskQueue: string;
  result<T>(): Promise<T>;
}

export class WorkflowService {
  constructor(private readonly client: Client) {}

  async start(params: StartWorkflowParams): Promise<WorkflowRunHandle> {
    assertTenant(params.tenantId);
    const taskQueue = taskQueueForTenant(params.tenantId);
    const workflowId = buildWorkflowId(params);
    const handle = await this.client.workflow.start(params.workflowType, {
      taskQueue,
      workflowId,
      args: params.args ?? [],
      memo: tenantMemo(params),
    });
    return {
      workflowId,
      taskQueue,
      result: <T>() => handle.result() as Promise<T>,
    };
  }

  getHandle(workflowId: string): WorkflowHandle {
    return this.client.workflow.getHandle(workflowId);
  }

  async signal(workflowId: string, signalName: string, ...args: unknown[]): Promise<void> {
    await this.client.workflow.getHandle(workflowId).signal(signalName, ...args);
  }

  /** Read workflow metadata (status, memo, etc.). */
  async describe(workflowId: string) {
    return this.client.workflow.getHandle(workflowId).describe();
  }
}

export interface WorkflowServiceHandle {
  service: WorkflowService;
  client: Client;
  close(): Promise<void>;
}

/** Create a WorkflowService backed by a fresh connection. Caller must close(). */
export async function createWorkflowService(options?: {
  namespace?: string;
}): Promise<WorkflowServiceHandle> {
  const connection = await Connection.connect({ address: temporalAddress() });
  const client = new Client({ connection, namespace: options?.namespace ?? DEFAULT_NAMESPACE });
  return {
    service: new WorkflowService(client),
    client,
    close: () => connection.close(),
  };
}

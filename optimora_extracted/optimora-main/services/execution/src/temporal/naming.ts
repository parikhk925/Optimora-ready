/**
 * Tenant-aware Temporal naming/resolution (T-7.1).
 *
 * For local dev/tests we use the default namespace, but every workflow still
 * carries tenant/org context in its TASK QUEUE, WORKFLOW ID, and MEMO. This
 * preserves the frozen direction of per-tenant isolation: namespaceForTenant()
 * is the single seam where real per-tenant namespaces / cells plug in later
 * without touching workflow or caller code.
 */
import { randomUUID } from "node:crypto";

export const DEFAULT_NAMESPACE = process.env.TEMPORAL_NAMESPACE ?? "default";
const BASE_TASK_QUEUE = process.env.TEMPORAL_TASK_QUEUE_BASE ?? "optimora";

export class MissingTenantContextError extends Error {
  constructor() {
    super("Missing tenant context: a tenantId is required to run a workflow.");
    this.name = "MissingTenantContextError";
  }
}

/** Fail closed: no tenant id => no workflow. */
export function assertTenant(tenantId: string | undefined | null): asserts tenantId is string {
  if (!tenantId || typeof tenantId !== "string" || tenantId.length === 0) {
    throw new MissingTenantContextError();
  }
}

/**
 * Namespace for a tenant. Today: the shared default namespace. Future: a
 * per-tenant namespace (or cell) — callers never change.
 */
export function namespaceForTenant(tenantId: string): string {
  assertTenant(tenantId);
  return DEFAULT_NAMESPACE;
}

/** Tenant-scoped task queue (carries tenant context even on the shared namespace). */
export function taskQueueForTenant(tenantId: string): string {
  assertTenant(tenantId);
  return `${BASE_TASK_QUEUE}.${tenantId}`;
}

export interface WorkflowIdParams {
  tenantId: string;
  orgId?: string | null;
  workflowType: string;
  /** Stable key for dedupe/idempotency; a UUID is used when omitted. */
  key?: string;
}

/** Workflow id encodes tenant/org/type so ids are traceable and isolated. */
export function buildWorkflowId(params: WorkflowIdParams): string {
  assertTenant(params.tenantId);
  const key = params.key ?? randomUUID();
  return `opt/${params.tenantId}/${params.orgId ?? "-"}/${params.workflowType}/${key}`;
}

/** Memo metadata attached to every workflow for tenant/org attribution. */
export function tenantMemo(params: {
  tenantId: string;
  orgId?: string | null;
}): Record<string, unknown> {
  assertTenant(params.tenantId);
  return { tenantId: params.tenantId, orgId: params.orgId ?? null };
}

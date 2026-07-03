/**
 * Context-assembly + event persistence (T-9.x). Tenant-scoped via the supplied
 * TxClient (RLS). An assembly record is write-once at finalize; the audit/outbox
 * event mirrors the runtime-event pattern.
 */
import type { TxClient } from "@optimora/db";
import type { AssemblyStatus, ContextAssemblyView, ContextSection } from "./types.js";

interface ContextAssemblyRow {
  id: string;
  tenantId: string;
  orgId: string;
  taskId: string;
  agentId: string;
  agentVersion: number;
  status: string;
  retriever: string;
  budgetMaxTokens: number;
  usedTokens: number;
  truncated: boolean;
  failureReason: string | null;
}

function toView(r: ContextAssemblyRow): ContextAssemblyView {
  return {
    id: r.id,
    tenantId: r.tenantId,
    orgId: r.orgId,
    taskId: r.taskId,
    agentId: r.agentId,
    agentVersion: r.agentVersion,
    status: r.status as AssemblyStatus,
    retriever: r.retriever,
    budgetMaxTokens: r.budgetMaxTokens,
    usedTokens: r.usedTokens,
    truncated: r.truncated,
    failureReason: r.failureReason,
  };
}

export async function createAssembly(
  tx: TxClient,
  input: {
    tenantId: string;
    orgId: string;
    taskId: string;
    agentId: string;
    agentVersion: number;
    status: AssemblyStatus;
    retriever: string;
    budgetMaxTokens: number;
    usedTokens: number;
    truncated: boolean;
    sections: ContextSection[];
    failureReason?: string | null;
  },
): Promise<ContextAssemblyView> {
  const row = (await tx.contextAssembly.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      taskId: input.taskId,
      agentId: input.agentId,
      agentVersion: input.agentVersion,
      status: input.status,
      retriever: input.retriever,
      budgetMaxTokens: input.budgetMaxTokens,
      usedTokens: input.usedTokens,
      truncated: input.truncated,
      sections: input.sections as unknown as object,
      failureReason: input.failureReason ?? null,
    },
  })) as ContextAssemblyRow;
  return toView(row);
}

export async function getAssembly(tx: TxClient, id: string): Promise<ContextAssemblyView | null> {
  const row = (await tx.contextAssembly.findUnique({ where: { id } })) as ContextAssemblyRow | null;
  return row ? toView(row) : null;
}

export async function emitContextEvent(
  tx: TxClient,
  input: { tenantId: string; assemblyId: string; type: string; payload?: Record<string, unknown> },
): Promise<void> {
  await tx.contextEvent.create({
    data: {
      tenantId: input.tenantId,
      assemblyId: input.assemblyId,
      type: input.type,
      payload: (input.payload ?? {}) as object,
    },
  });
}

export async function listContextEvents(tx: TxClient, assemblyId: string) {
  return tx.contextEvent.findMany({ where: { assemblyId }, orderBy: { createdAt: "asc" } });
}

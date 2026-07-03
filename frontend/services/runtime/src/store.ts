/**
 * Agent run + runtime-event persistence (T-9.1). Tenant-scoped via the supplied
 * TxClient (RLS). A run's identity/input is write-once; only status, output,
 * tool results, token/cost accounting, and timestamps advance as it executes.
 */
import type { TxClient } from "@optimora/db";
import type { AgentRunView, RunStatus, ToolResult } from "./types.js";

interface AgentRunRow {
  id: string;
  tenantId: string;
  orgId: string;
  taskId: string;
  agentId: string;
  agentVersion: number;
  agentHash: string | null;
  status: string;
  modelProvider: string;
  input: unknown;
  output: unknown;
  toolCalls: unknown;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  failureReason: string | null;
}

function toView(r: AgentRunRow): AgentRunView {
  return {
    id: r.id,
    tenantId: r.tenantId,
    orgId: r.orgId,
    taskId: r.taskId,
    agentId: r.agentId,
    agentVersion: r.agentVersion,
    agentHash: r.agentHash,
    status: r.status as RunStatus,
    modelProvider: r.modelProvider,
    input: (r.input ?? {}) as Record<string, unknown>,
    output: (r.output ?? null) as Record<string, unknown> | null,
    toolCalls: (r.toolCalls ?? []) as ToolResult[],
    tokensIn: r.tokensIn,
    tokensOut: r.tokensOut,
    cost: r.cost,
    failureReason: r.failureReason,
  };
}

export async function createRun(
  tx: TxClient,
  input: {
    tenantId: string;
    orgId: string;
    taskId: string;
    agentId: string;
    agentVersion: number;
    agentHash: string | null;
    modelProvider: string;
    input: Record<string, unknown>;
  },
): Promise<AgentRunView> {
  const row = (await tx.agentRun.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      taskId: input.taskId,
      agentId: input.agentId,
      agentVersion: input.agentVersion,
      agentHash: input.agentHash,
      modelProvider: input.modelProvider,
      status: "pending",
      input: input.input as object,
    },
  })) as AgentRunRow;
  return toView(row);
}

export async function markRunning(tx: TxClient, id: string): Promise<AgentRunView> {
  const row = (await tx.agentRun.update({
    where: { id },
    data: { status: "running", startedAt: new Date() },
  })) as AgentRunRow;
  return toView(row);
}

export async function markSucceeded(
  tx: TxClient,
  id: string,
  patch: { output: Record<string, unknown>; toolCalls: ToolResult[]; tokensIn: number; tokensOut: number },
): Promise<AgentRunView> {
  const row = (await tx.agentRun.update({
    where: { id },
    data: {
      status: "succeeded",
      output: patch.output as object,
      toolCalls: patch.toolCalls as object,
      tokensIn: patch.tokensIn,
      tokensOut: patch.tokensOut,
      cost: 0,
      finishedAt: new Date(),
    },
  })) as AgentRunRow;
  return toView(row);
}

export async function markRunFailed(
  tx: TxClient,
  id: string,
  reason: string,
): Promise<AgentRunView> {
  const row = (await tx.agentRun.update({
    where: { id },
    data: { status: "failed", failureReason: reason, finishedAt: new Date() },
  })) as AgentRunRow;
  return toView(row);
}

export async function getRun(tx: TxClient, id: string): Promise<AgentRunView | null> {
  const row = (await tx.agentRun.findUnique({ where: { id } })) as AgentRunRow | null;
  return row ? toView(row) : null;
}

export async function emitRuntimeEvent(
  tx: TxClient,
  input: { tenantId: string; runId: string; type: string; payload?: Record<string, unknown> },
): Promise<void> {
  await tx.runtimeEvent.create({
    data: {
      tenantId: input.tenantId,
      runId: input.runId,
      type: input.type,
      payload: (input.payload ?? {}) as object,
    },
  });
}

export async function listRuntimeEvents(tx: TxClient, runId: string) {
  return tx.runtimeEvent.findMany({ where: { runId }, orderBy: { createdAt: "asc" } });
}

export async function listRunsForTask(tx: TxClient, taskId: string): Promise<AgentRunView[]> {
  const rows = (await tx.agentRun.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
  })) as AgentRunRow[];
  return rows.map(toView);
}

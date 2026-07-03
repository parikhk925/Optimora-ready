/**
 * Decision record + outbox persistence (T-8.3). Tenant-scoped via the supplied
 * TxClient (RLS).
 */
import type { TxClient } from "@optimora/db";
import type { DecisionOutcome, DecisionType } from "./types.js";

export interface DecisionRecord {
  id: string;
  tenantId: string;
  orgId: string;
  type: string;
  outcome: string;
  subjectId: string | null;
  targetNodeId: string | null;
  targetAgentId: string | null;
  basis: string;
}

export async function createDecisionRecord(
  tx: TxClient,
  input: {
    tenantId: string;
    orgId: string;
    type: DecisionType;
    outcome: DecisionOutcome;
    subjectId?: string | null;
    targetNodeId?: string | null;
    targetAgentId?: string | null;
    basis?: string;
    rationale?: Record<string, unknown>;
  },
): Promise<DecisionRecord> {
  return tx.decision.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      type: input.type,
      outcome: input.outcome,
      subjectId: input.subjectId ?? null,
      targetNodeId: input.targetNodeId ?? null,
      targetAgentId: input.targetAgentId ?? null,
      basis: input.basis ?? "deterministic",
      rationale: (input.rationale ?? {}) as object,
    },
  });
}

export async function emitDecisionEvent(
  tx: TxClient,
  input: { tenantId: string; decisionId: string; type: string; payload?: Record<string, unknown> },
): Promise<void> {
  await tx.decisionEvent.create({
    data: {
      tenantId: input.tenantId,
      decisionId: input.decisionId,
      type: input.type,
      payload: (input.payload ?? {}) as object,
    },
  });
}

export async function getDecision(tx: TxClient, id: string): Promise<DecisionRecord | null> {
  return tx.decision.findUnique({ where: { id } });
}

export async function listDecisionEvents(tx: TxClient, decisionId: string) {
  return tx.decisionEvent.findMany({ where: { decisionId }, orderBy: { createdAt: "asc" } });
}

/**
 * Learning record + performance snapshot + outbox persistence (T-8.5).
 * Tenant-scoped via the supplied TxClient (RLS). The performance snapshot is the
 * ONLY mutable artifact the engine writes; agent definitions are never touched.
 */
import type { TxClient } from "@optimora/db";
import type {
  CritiqueSignal,
} from "./aggregate.js";
import type {
  PerformanceSignals,
  ProposalStatus,
  RecommendationType,
} from "./types.js";

/** Read the Critique signals for one agent in the current tenant (RLS-scoped). */
export async function listCritiqueSignals(
  tx: TxClient,
  agentId: string,
): Promise<CritiqueSignal[]> {
  return tx.critique.findMany({
    where: { agentId },
    orderBy: { createdAt: "asc" },
    select: {
      agentId: true,
      qualityScore: true,
      passed: true,
      recommendation: true,
      confidence: true,
      violatedRules: true,
      missingRequirements: true,
    },
  });
}

export interface AgentPerformanceRecord {
  id: string;
  tenantId: string;
  orgId: string;
  agentId: string;
  runs: number;
  avgQuality: number;
  successRate: number;
  failureRate: number;
  revisionRate: number;
  escalationRate: number;
  avgConfidence: number;
  reputation: number;
}

/**
 * Upsert the aggregated performance snapshot for an agent. This updates
 * reputation/performance metadata in the Learning Engine's own store — it does
 * NOT mutate any agent definition (which remains immutable).
 */
export async function upsertAgentPerformance(
  tx: TxClient,
  input: { tenantId: string; orgId: string; signals: PerformanceSignals },
): Promise<AgentPerformanceRecord> {
  const s = input.signals;
  const data = {
    runs: s.runs,
    avgQuality: s.avgQuality,
    successRate: s.successRate,
    failureRate: s.failureRate,
    revisionRate: s.revisionRate,
    escalationRate: s.escalationRate,
    avgConfidence: s.avgConfidence,
    reputation: s.reputation,
  };
  return tx.agentPerformance.upsert({
    where: { tenantId_agentId: { tenantId: input.tenantId, agentId: s.agentId } },
    create: { tenantId: input.tenantId, orgId: input.orgId, agentId: s.agentId, ...data },
    update: data,
  });
}

export async function getAgentPerformance(
  tx: TxClient,
  agentId: string,
): Promise<AgentPerformanceRecord | null> {
  return tx.agentPerformance.findFirst({ where: { agentId } });
}

export interface LearningRecordRow {
  id: string;
  tenantId: string;
  orgId: string;
  agentId: string;
  agentVersion: number | null;
  type: string;
  status: string;
  rationale: unknown;
  proposedChange: unknown;
  evalGatePassed: boolean;
  evalGateReason: string | null;
  basedOnCritiques: number;
  confidence: number;
}

export interface CreateLearningRecordInput {
  tenantId: string;
  orgId: string;
  agentId: string;
  agentVersion: number | null;
  type: RecommendationType;
  status: ProposalStatus;
  rationale: Record<string, unknown>;
  proposedChange: Record<string, unknown>;
  evalGatePassed: boolean;
  evalGateReason: string | null;
  basedOnCritiques: number;
  confidence: number;
}

export async function createLearningRecord(
  tx: TxClient,
  input: CreateLearningRecordInput,
): Promise<LearningRecordRow> {
  return tx.learningRecord.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      agentId: input.agentId,
      agentVersion: input.agentVersion,
      type: input.type,
      status: input.status,
      rationale: input.rationale as object,
      proposedChange: input.proposedChange as object,
      evalGatePassed: input.evalGatePassed,
      evalGateReason: input.evalGateReason,
      basedOnCritiques: input.basedOnCritiques,
      confidence: input.confidence,
    },
  });
}

export async function getLearningRecord(
  tx: TxClient,
  id: string,
): Promise<LearningRecordRow | null> {
  return tx.learningRecord.findUnique({ where: { id } });
}

export async function emitLearningEvent(
  tx: TxClient,
  input: {
    tenantId: string;
    learningRecordId: string;
    type: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  await tx.learningEvent.create({
    data: {
      tenantId: input.tenantId,
      learningRecordId: input.learningRecordId,
      type: input.type,
      payload: (input.payload ?? {}) as object,
    },
  });
}

export async function listLearningEvents(tx: TxClient, learningRecordId: string) {
  return tx.learningEvent.findMany({
    where: { learningRecordId },
    orderBy: { createdAt: "asc" },
  });
}

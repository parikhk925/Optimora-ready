/**
 * Critique record + reflection outbox persistence (T-8.4). Tenant-scoped via the
 * supplied TxClient (RLS).
 */
import type { TxClient } from "@optimora/db";
import type {
  CritiqueResult,
  EvidenceRef,
  ReflectionRecommendation,
  ReviewerType,
} from "./types.js";

export interface CritiqueRecord {
  id: string;
  tenantId: string;
  orgId: string;
  taskId: string;
  agentId: string | null;
  agentVersion: number | null;
  agentHash: string | null;
  qualityScore: number;
  result: string;
  passed: boolean;
  violatedRules: unknown;
  missingRequirements: unknown;
  suggestedFixes: unknown;
  confidence: number;
  evidence: unknown;
  reviewerType: string;
  recommendation: string;
  retryRecommended: boolean;
  escalationRecommended: boolean;
  attempt: number;
}

export interface CreateCritiqueInput {
  tenantId: string;
  orgId: string;
  taskId: string;
  agentId: string | null;
  agentVersion: number | null;
  agentHash: string | null;
  qualityScore: number;
  result: CritiqueResult;
  passed: boolean;
  violatedRules: string[];
  missingRequirements: string[];
  suggestedFixes: string[];
  confidence: number;
  evidence: EvidenceRef[];
  reviewerType: ReviewerType;
  recommendation: ReflectionRecommendation;
  retryRecommended: boolean;
  escalationRecommended: boolean;
  attempt: number;
}

export async function createCritiqueRecord(
  tx: TxClient,
  input: CreateCritiqueInput,
): Promise<CritiqueRecord> {
  return tx.critique.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      taskId: input.taskId,
      agentId: input.agentId,
      agentVersion: input.agentVersion,
      agentHash: input.agentHash,
      qualityScore: input.qualityScore,
      result: input.result,
      passed: input.passed,
      violatedRules: input.violatedRules as object,
      missingRequirements: input.missingRequirements as object,
      suggestedFixes: input.suggestedFixes as object,
      confidence: input.confidence,
      evidence: input.evidence as object,
      reviewerType: input.reviewerType,
      recommendation: input.recommendation,
      retryRecommended: input.retryRecommended,
      escalationRecommended: input.escalationRecommended,
      attempt: input.attempt,
    },
  });
}

export async function emitReflectionEvent(
  tx: TxClient,
  input: { tenantId: string; critiqueId: string; type: string; payload?: Record<string, unknown> },
): Promise<void> {
  await tx.reflectionEvent.create({
    data: {
      tenantId: input.tenantId,
      critiqueId: input.critiqueId,
      type: input.type,
      payload: (input.payload ?? {}) as object,
    },
  });
}

export async function getCritique(tx: TxClient, id: string): Promise<CritiqueRecord | null> {
  return tx.critique.findUnique({ where: { id } });
}

export async function listReflectionEvents(tx: TxClient, critiqueId: string) {
  return tx.reflectionEvent.findMany({ where: { critiqueId }, orderBy: { createdAt: "asc" } });
}

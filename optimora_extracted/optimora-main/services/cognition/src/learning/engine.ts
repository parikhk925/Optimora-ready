/**
 * Learning Engine (T-8.5). Deterministic-first. Consumes Reflection Engine
 * Critique records, aggregates per-agent performance signals, and produces
 * versioned, auditable, eval-gated learning recommendations. Recommendations are
 * PROPOSALS only — they are stored separately and NEVER mutate a live agent
 * definition (immutable ABI versions are preserved). The engine may update the
 * agent's performance snapshot (its own store) where allowed. Runs in the
 * caller's tenant transaction (RLS), so cross-tenant access fails closed.
 */
import type { TxClient } from "@optimora/db";
import { authorize } from "@optimora/auth-core";
import { safeParseAgentDefinition, type AgentDefinition } from "@optimora/agent-contract";
import { aggregateSignals } from "./aggregate.js";
import { evalGate } from "./eval-gate.js";
import { DeterministicLearner } from "./learner.js";
import {
  createLearningRecord,
  emitLearningEvent,
  listCritiqueSignals,
  upsertAgentPerformance,
} from "./store.js";
import {
  InvalidLearningContextError,
  MissingLearningContextError,
  type LearningContext,
  type LearningProvider,
  type LearningRecommendation,
  type LearningResult,
} from "./types.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateContext(ctx: LearningContext): void {
  if (!UUID_RE.test(ctx.tenantId ?? "") || !UUID_RE.test(ctx.orgId ?? "")) {
    throw new InvalidLearningContextError("Missing or invalid tenant/org context.");
  }
}

/** Returns true if the run is NOT authorized (deny). No principal => allowed. */
function unauthorized(ctx: LearningContext): boolean {
  if (!ctx.principal) return false;
  const permission = ctx.requiredPermission ?? "learning:run";
  const decision = authorize({
    principal: ctx.principal,
    action: permission,
    resource: { type: "learning", id: ctx.orgId, tenantId: ctx.tenantId, orgId: ctx.orgId },
    context: { requiredPermission: permission },
  });
  return !decision.allowed;
}

export interface RunLearningInput {
  /** The (immutable) agent definition to learn against. Never mutated. */
  definition: AgentDefinition;
  /** Override the eval-gate minimum sample size. */
  minSamples?: number;
  /** Override the eval-gate minimum confidence. */
  minConfidence?: number;
}

/**
 * Run a learning pass for one agent: aggregate its critiques, update the
 * performance snapshot, generate eval-gated proposals, persist them, and emit
 * learning events. Returns the signals + stored recommendations.
 */
export async function runLearning(
  tx: TxClient,
  ctx: LearningContext,
  input: RunLearningInput,
  provider: LearningProvider = new DeterministicLearner(),
): Promise<LearningResult> {
  // 1) Fail closed on missing/invalid tenant/org context.
  validateContext(ctx);

  // 2) Authorize (fail closed).
  if (unauthorized(ctx)) {
    throw new InvalidLearningContextError("Unauthorized learning request.");
  }

  // 3) Fail closed on missing/invalid agent definition.
  const parsed = safeParseAgentDefinition(input.definition);
  if (!parsed.success) {
    throw new MissingLearningContextError("Missing or invalid agent definition.");
  }
  const definition = parsed.data;
  const agentId = definition.identity.agentId;

  // 4) Consume Critique records (tenant-scoped read → cross-tenant denial too).
  const critiques = await listCritiqueSignals(tx, agentId);
  if (critiques.length === 0) {
    throw new MissingLearningContextError("No critiques found for agent in tenant context.");
  }

  // 5) Aggregate deterministic performance signals (malformed signals fail closed).
  const signals = aggregateSignals(agentId, critiques);

  // 6) Update the agent performance snapshot (own store; definition untouched).
  await upsertAgentPerformance(tx, { tenantId: ctx.tenantId, orgId: ctx.orgId, signals });

  // 7) Generate recommendation drafts (deterministic by default).
  const drafts = await provider.propose(signals, definition);

  // 8) Eval-gate, store, and emit an event for each proposal.
  const recommendations: LearningRecommendation[] = [];
  for (const draft of drafts) {
    const gate = evalGate(draft, signals, {
      minSamples: input.minSamples,
      minConfidence: input.minConfidence,
    });
    const record = await createLearningRecord(tx, {
      tenantId: ctx.tenantId,
      orgId: ctx.orgId,
      agentId,
      agentVersion: definition.version,
      type: draft.type,
      status: "proposed", // never auto-approved; approval is out-of-band.
      rationale: draft.rationale,
      proposedChange: draft.proposedChange,
      evalGatePassed: gate.passed,
      evalGateReason: gate.reason,
      basedOnCritiques: signals.runs,
      confidence: draft.confidence,
    });
    await emitLearningEvent(tx, {
      tenantId: ctx.tenantId,
      learningRecordId: record.id,
      type: gate.passed ? "learning.proposed" : "learning.blocked",
      payload: { agentId, type: draft.type, evalGatePassed: gate.passed, reason: gate.reason },
    });
    recommendations.push({
      recordId: record.id,
      agentId,
      agentVersion: definition.version,
      type: draft.type,
      status: "proposed",
      rationale: draft.rationale,
      proposedChange: draft.proposedChange,
      evalGatePassed: gate.passed,
      evalGateReason: gate.reason,
      basedOnCritiques: signals.runs,
      confidence: draft.confidence,
    });
  }

  return { agentId, signals, recommendations };
}

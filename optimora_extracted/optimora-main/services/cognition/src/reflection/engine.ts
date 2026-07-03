/**
 * Reflection Engine (T-8.4). Deterministic, rubric/check-based critique of task
 * output against the Agent ABI quality rules. Every reflection validates context
 * (fail closed), optionally authorizes via the Policy Engine, evaluates output
 * via a reviewer provider (deterministic by default; LLM-as-judge behind a stub),
 * derives a rework-loop decision (accept | revise | escalate | fail), records an
 * auditable Critique, and emits a reflection event. Runs in the caller's tenant
 * transaction (RLS), so cross-tenant access fails closed naturally.
 */
import type { TxClient } from "@optimora/db";
import { authorize } from "@optimora/auth-core";
import { safeParseAgentDefinition } from "@optimora/agent-contract";
import { getTask } from "@optimora/execution";
import { RubricReviewer } from "./rubric.js";
import { createCritiqueRecord, emitReflectionEvent } from "./store.js";
import {
  InvalidOutputError,
  InvalidReflectionContextError,
  MissingReflectionContextError,
  type Critique,
  type ReflectInput,
  type ReflectionContext,
  type ReflectionProvider,
  type ReflectionRecommendation,
  type ReviewVerdict,
} from "./types.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateContext(ctx: ReflectionContext): void {
  if (!UUID_RE.test(ctx.tenantId ?? "") || !UUID_RE.test(ctx.orgId ?? "")) {
    throw new InvalidReflectionContextError("Missing or invalid tenant/org context.");
  }
}

/** Returns true if the reflection is NOT authorized (deny). No principal => allowed. */
function unauthorized(ctx: ReflectionContext): boolean {
  if (!ctx.principal) return false;
  const permission = ctx.requiredPermission ?? "reflection:review";
  const decision = authorize({
    principal: ctx.principal,
    action: permission,
    resource: { type: "reflection", id: ctx.orgId, tenantId: ctx.tenantId, orgId: ctx.orgId },
    context: { requiredPermission: permission },
  });
  return !decision.allowed;
}

/**
 * Derive the rework-loop recommendation from the pass/fail verdict + the agent's
 * retry/escalation rules. accept on pass; otherwise revise while retries remain,
 * then escalate or fail per `escalationRules.onRetriesExhausted`.
 */
function deriveRecommendation(
  passed: boolean,
  attempt: number,
  retryMaxAttempts: number,
  onRetriesExhausted: "escalate" | "fail" | "human",
): { recommendation: ReflectionRecommendation; retryRecommended: boolean; escalationRecommended: boolean } {
  if (passed) {
    return { recommendation: "accept", retryRecommended: false, escalationRecommended: false };
  }
  // attempt is 0-based; retries remain while the NEXT attempt is < maxAttempts.
  const retriesRemain = attempt + 1 < retryMaxAttempts;
  if (retriesRemain) {
    return { recommendation: "revise", retryRecommended: true, escalationRecommended: false };
  }
  if (onRetriesExhausted === "fail") {
    return { recommendation: "fail", retryRecommended: false, escalationRecommended: false };
  }
  // "escalate" or "human" → route up.
  return { recommendation: "escalate", retryRecommended: false, escalationRecommended: true };
}

/**
 * Reflect on a single task output. The default reviewer is the deterministic
 * RubricReviewer; pass a different provider to swap in LLM-as-judge later.
 */
export async function reflectOnTask(
  tx: TxClient,
  ctx: ReflectionContext,
  input: ReflectInput,
  provider: ReflectionProvider = new RubricReviewer(),
): Promise<Critique> {
  // 1) Fail closed on missing/invalid tenant/org context.
  validateContext(ctx);

  // 2) Fail closed on missing task id.
  if (!UUID_RE.test(input.taskId ?? "")) {
    throw new MissingReflectionContextError("Missing or invalid task id.");
  }

  // 3) Authorize (fail closed). Records nothing on deny — denies are pre-flight.
  if (unauthorized(ctx)) {
    throw new InvalidReflectionContextError("Unauthorized reflection request.");
  }

  // 4) Fail closed on missing task (tenant-scoped read → cross-tenant denial too).
  const task = await getTask(tx, input.taskId);
  if (!task) {
    throw new MissingReflectionContextError("Task not found in tenant context.");
  }

  // 5) Fail closed on missing/invalid agent definition.
  const parsed = safeParseAgentDefinition(input.definition);
  if (!parsed.success) {
    throw new MissingReflectionContextError("Missing or invalid agent definition.");
  }
  const definition = parsed.data;

  // 6) Fail closed on invalid output (must be a JSON object).
  if (input.output == null || typeof input.output !== "object" || Array.isArray(input.output)) {
    throw new InvalidOutputError("Task output must be a JSON object.");
  }

  // 7) Evaluate via the reviewer provider (throws on invalid quality rules).
  const verdict: ReviewVerdict = await provider.review({ ...input, definition });

  // 8) Pass/fail against the rubric minimum score.
  const minScore = definition.qualityRules.minScore;
  const passed = verdict.qualityScore >= minScore && verdict.violatedRules.length === 0;
  const attempt = input.attempt ?? 0;

  const { recommendation, retryRecommended, escalationRecommended } = deriveRecommendation(
    passed,
    attempt,
    definition.retryRules.maxAttempts,
    definition.escalationRules.onRetriesExhausted,
  );

  // 9) Record the auditable critique.
  const record = await createCritiqueRecord(tx, {
    tenantId: ctx.tenantId,
    orgId: ctx.orgId,
    taskId: input.taskId,
    agentId: definition.identity.agentId,
    agentVersion: definition.version,
    agentHash: definition.contentHash || null,
    qualityScore: verdict.qualityScore,
    result: passed ? "pass" : "fail",
    passed,
    violatedRules: verdict.violatedRules,
    missingRequirements: verdict.missingRequirements,
    suggestedFixes: verdict.suggestedFixes,
    confidence: verdict.confidence,
    evidence: verdict.evidence,
    reviewerType: verdict.reviewerType,
    recommendation,
    retryRecommended,
    escalationRecommended,
    attempt,
  });

  // 10) Emit the reflection event.
  await emitReflectionEvent(tx, {
    tenantId: ctx.tenantId,
    critiqueId: record.id,
    type: `reflection.${recommendation}`,
    payload: {
      taskId: input.taskId,
      result: passed ? "pass" : "fail",
      qualityScore: verdict.qualityScore,
      reviewerType: verdict.reviewerType,
    },
  });

  return {
    recordId: record.id,
    taskId: input.taskId,
    agentId: definition.identity.agentId,
    agentVersion: definition.version,
    agentHash: definition.contentHash || null,
    qualityScore: verdict.qualityScore,
    result: passed ? "pass" : "fail",
    passed,
    violatedRules: verdict.violatedRules,
    missingRequirements: verdict.missingRequirements,
    suggestedFixes: verdict.suggestedFixes,
    confidence: verdict.confidence,
    evidence: verdict.evidence,
    reviewerType: verdict.reviewerType,
    recommendation,
    retryRecommended,
    escalationRecommended,
    attempt,
  };
}

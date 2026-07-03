/**
 * Context Fabric assembler (T-9.x). Deterministic, tenant-aware, fail-closed: given
 * a task + agent (ABI) it assembles an ordered, budget-bounded context from the
 * agent definition, task, input, the assigned org-graph node, and cognition
 * references (plan / decision / reflection / learning) resolved through a retriever
 * seam (deterministic stub by default — NO paid calls, NO real memory/vector/RAG).
 * It does NOT recompute or mutate the Cognition Plane, Org Graph, Task Engine, or
 * Agent ABI. Fails closed on invalid context, unauthorized/cross-tenant access,
 * invalid task/agent, malformed refs, or a non-positive budget.
 */
import type { TxClient } from "@optimora/db";
import { authorize } from "@optimora/auth-core";
import { safeParseAgentDefinition } from "@optimora/agent-contract";
import { getTask } from "@optimora/execution";
import { getNode } from "@optimora/org-graph";
import { applyBudget, estimateTokens } from "./budget.js";
import { StubRetriever } from "./retriever.js";
import { createAssembly, emitContextEvent } from "./store.js";
import {
  InvalidContextBudgetError,
  InvalidContextContextError,
  InvalidContextRefError,
  MissingContextError,
  UnauthorizedContextError,
  type AssembledContext,
  type ContextFabricContext,
  type ContextRefs,
  type ContextRequest,
  type ContextRetriever,
  type ContextSection,
  type RetrievalRef,
  type SectionKind,
} from "./types.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_BUDGET_TOKENS = 4096;

/** Priority per kind (lower kept first under budget pressure). */
const PRIORITY: Record<SectionKind, number> = {
  agent: 0,
  task: 1,
  input: 2,
  org_node: 3,
  plan: 4,
  decision: 5,
  reflection: 6,
  learning: 7,
};

function validateContext(ctx: ContextFabricContext): void {
  if (!UUID_RE.test(ctx.tenantId ?? "") || !UUID_RE.test(ctx.orgId ?? "")) {
    throw new InvalidContextContextError("Missing or invalid tenant/org context.");
  }
}

/** Returns true if assembly is NOT authorized by policy (deny). No principal => allowed. */
function policyDenies(ctx: ContextFabricContext): boolean {
  if (!ctx.principal) return false;
  const permission = ctx.requiredPermission ?? "context:assemble";
  const decision = authorize({
    principal: ctx.principal,
    action: permission,
    resource: { type: "context_assembly", id: ctx.orgId, tenantId: ctx.tenantId, orgId: ctx.orgId },
    context: { requiredPermission: permission },
  });
  return !decision.allowed;
}

/** Flatten the (validated) refs into ordered retrieval refs. Malformed => fail closed. */
function toRetrievalRefs(refs: ContextRefs | undefined): RetrievalRef[] {
  if (!refs) return [];
  const out: RetrievalRef[] = [];
  const push = (kind: SectionKind, id: string) => {
    if (!UUID_RE.test(id)) {
      throw new InvalidContextRefError(`Malformed ${kind} reference: "${id}".`);
    }
    out.push({ kind, id });
  };
  if (refs.planId !== undefined) push("plan", refs.planId);
  for (const id of refs.decisionIds ?? []) push("decision", id);
  for (const id of refs.reflectionIds ?? []) push("reflection", id);
  for (const id of refs.learningIds ?? []) push("learning", id);
  return out;
}

function section(kind: SectionKind, id: string | null, content: string): ContextSection {
  return { kind, id, priority: PRIORITY[kind], content, tokens: estimateTokens(content), truncated: false };
}

export interface AssembleOptions {
  retriever?: ContextRetriever;
}

/**
 * Assemble context for a task+agent within the caller's tenant transaction. The
 * resulting assembly + its sections are persisted and a `context.assembled` event
 * is emitted before returning. Validation failures fail closed (throw) before any
 * record is written.
 */
export async function assembleContext(
  tx: TxClient,
  ctx: ContextFabricContext,
  request: ContextRequest,
  options: AssembleOptions = {},
): Promise<AssembledContext> {
  validateContext(ctx);
  if (policyDenies(ctx)) {
    throw new UnauthorizedContextError("Unauthorized context assembly.");
  }

  const parsed = safeParseAgentDefinition(request.definition);
  if (!parsed.success) {
    throw new MissingContextError("Missing or invalid agent definition.");
  }
  const definition = parsed.data;

  if (!UUID_RE.test(request.taskId ?? "")) {
    throw new MissingContextError("Missing or invalid task id.");
  }
  // Tenant-scoped read => cross-tenant tasks are invisible (fail closed).
  const task = await getTask(tx, request.taskId);
  if (!task) {
    throw new MissingContextError("Task not found in tenant context.");
  }

  const maxTokens = request.budget?.maxTokens ?? DEFAULT_BUDGET_TOKENS;
  if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
    throw new InvalidContextBudgetError("Context budget must be a positive integer.");
  }

  const retrievalRefs = toRetrievalRefs(request.refs);
  const retriever = options.retriever ?? new StubRetriever();

  // Build sections in deterministic kind/priority order.
  const sections: ContextSection[] = [];
  sections.push(
    section("agent", definition.identity.agentId, `${definition.role}\n${definition.jobDescription}`),
  );
  sections.push(section("task", task.id, task.title));
  sections.push(section("input", null, JSON.stringify(request.input ?? {})));

  // Assigned org node, where available (best-effort; never recomputes the graph).
  if (task.assignedNodeId && UUID_RE.test(task.assignedNodeId)) {
    const node = await getNode(tx, task.assignedNodeId);
    if (node) {
      sections.push(section("org_node", node.id, `${node.type}:${node.name}`));
    }
  }

  // Cognition references via the retriever seam (stub by default).
  for (const ref of retrievalRefs) {
    const item = await retriever.retrieve(ref);
    sections.push(section(ref.kind, ref.id, item.content));
  }

  // Stable priority-ordered budget truncation.
  sections.sort((a, b) => a.priority - b.priority);
  const budgeted = applyBudget(sections, maxTokens);

  const assembly = await createAssembly(tx, {
    tenantId: ctx.tenantId,
    orgId: ctx.orgId,
    taskId: task.id,
    agentId: definition.identity.agentId,
    agentVersion: definition.version,
    status: "assembled",
    retriever: retriever.name,
    budgetMaxTokens: maxTokens,
    usedTokens: budgeted.usedTokens,
    truncated: budgeted.truncated,
    sections: budgeted.sections,
  });
  await emitContextEvent(tx, {
    tenantId: ctx.tenantId,
    assemblyId: assembly.id,
    type: "context.assembled",
    payload: {
      taskId: task.id,
      agentId: definition.identity.agentId,
      sections: budgeted.sections.length,
      usedTokens: budgeted.usedTokens,
      truncated: budgeted.truncated,
    },
  });

  return {
    assembly,
    sections: budgeted.sections,
    usedTokens: budgeted.usedTokens,
    budgetMaxTokens: maxTokens,
    truncated: budgeted.truncated,
  };
}

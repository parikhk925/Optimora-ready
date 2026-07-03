/**
 * Context Fabric types (T-9.x). A deterministic context-assembly plane: given a
 * task + agent (ABI), it assembles an ordered, budget-bounded context from the
 * task, agent definition, org graph, and cognition references (plan / decision /
 * reflection / learning) where available. It performs NO recomputation of those
 * planes and makes NO paid AI calls — memory/vector/RAG retrieval sits behind the
 * `ContextRetriever` seam whose default is a deterministic stub. Fails closed on
 * missing tenant, invalid task/agent, malformed refs, unauthorized or cross-tenant
 * access.
 */
import type { AgentDefinition } from "@optimora/agent-contract";
import type { Principal } from "@optimora/auth-core";

/** Assembly lifecycle. */
export const ASSEMBLY_STATES = ["assembled", "failed"] as const;
export type AssemblyStatus = (typeof ASSEMBLY_STATES)[number];

/** Section kinds, in deterministic assembly/priority order (lower = kept first). */
export const SECTION_KINDS = [
  "agent",
  "task",
  "input",
  "org_node",
  "plan",
  "decision",
  "reflection",
  "learning",
] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

export interface ContextFabricContext {
  tenantId: string;
  orgId: string;
  /** When provided, assembly is authorized via the Policy Engine (fail closed). */
  principal?: Principal;
  requiredPermission?: string;
}

/** Cognition references to fold into context. IDs only — content via the retriever. */
export interface ContextRefs {
  planId?: string;
  decisionIds?: string[];
  reflectionIds?: string[];
  learningIds?: string[];
}

/** Input to a single context assembly. */
export interface ContextRequest {
  taskId: string;
  definition: AgentDefinition;
  input?: Record<string, unknown>;
  refs?: ContextRefs;
  /** Hard token budget for the assembled context (deterministic truncation). */
  budget?: { maxTokens: number };
}

/** A reference handed to a retriever to resolve into content. */
export interface RetrievalRef {
  kind: SectionKind;
  id: string;
}

/** A retrieved item (deterministic stub by default; future memory/vector/RAG). */
export interface RetrievedItem {
  ref: RetrievalRef;
  content: string;
}

/**
 * Retriever abstraction for cognition/memory references. The default is a
 * deterministic stub — no real retrieval, no paid calls. A real memory/vector/RAG
 * provider plugs in here later. Implementations must be pure w.r.t. their ref.
 */
export interface ContextRetriever {
  readonly name: string;
  retrieve(ref: RetrievalRef): RetrievedItem | Promise<RetrievedItem>;
}

/** One assembled, token-counted context section. */
export interface ContextSection {
  kind: SectionKind;
  /** Source id where applicable (task id, node id, ref id); null for derived. */
  id: string | null;
  priority: number;
  content: string;
  tokens: number;
  /** True when this section's content was truncated to fit the budget. */
  truncated: boolean;
}

export interface ContextAssemblyView {
  id: string;
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
  failureReason: string | null;
}

export interface AssembledContext {
  assembly: ContextAssemblyView;
  sections: ContextSection[];
  usedTokens: number;
  budgetMaxTokens: number;
  truncated: boolean;
}

export class ContextError extends Error {}
export class InvalidContextContextError extends ContextError {}
export class MissingContextError extends ContextError {}
export class InvalidContextRefError extends ContextError {}
export class InvalidContextBudgetError extends ContextError {}
export class UnauthorizedContextError extends ContextError {}

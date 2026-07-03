/**
 * @optimora/context — the Context Fabric (T-9.x).
 *
 * A deterministic, tenant-aware, fail-closed context-assembly plane. It assembles
 * an ordered, budget-bounded context for a task+agent from the agent definition,
 * task, input, org graph, and cognition references (plan / decision / reflection /
 * learning) via a retriever seam whose default is a deterministic stub — NO paid
 * AI calls and NO real memory/vector/RAG yet. It does not redesign the Runtime,
 * Task Engine, Agent ABI, Cognition Plane, Policy Engine, or Org Graph.
 */
export const PACKAGE_NAME = "@optimora/context" as const;

export { assembleContext, type AssembleOptions } from "./assembler.js";
export { StubRetriever } from "./retriever.js";
export {
  estimateTokens,
  truncateToTokens,
  applyBudget,
  CHARS_PER_TOKEN,
  type BudgetResult,
} from "./budget.js";
export { getAssembly, emitContextEvent, listContextEvents } from "./store.js";
export {
  ASSEMBLY_STATES,
  SECTION_KINDS,
  type AssemblyStatus,
  type SectionKind,
  type ContextFabricContext,
  type ContextRefs,
  type ContextRequest,
  type RetrievalRef,
  type RetrievedItem,
  type ContextRetriever,
  type ContextSection,
  type ContextAssemblyView,
  type AssembledContext,
  ContextError,
  InvalidContextContextError,
  MissingContextError,
  InvalidContextRefError,
  InvalidContextBudgetError,
  UnauthorizedContextError,
} from "./types.js";

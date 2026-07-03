/**
 * @optimora/memory — Agent Memory Store (E9 Memory).
 *
 * Deterministic, tenant-aware, fail-closed memory plane: stores, queries, and
 * archives agent-scoped memory records by type (fact / preference / instruction /
 * observation / critique / learning / task_note), tags, recency, and importance.
 * Vector/embedding retrieval sits behind the MemoryRetriever seam (stub only for
 * now — no paid calls, no real embeddings). Plugs into the Context Fabric via
 * makeMemoryContextRetriever without redesigning either plane.
 */
export const PACKAGE_NAME = "@optimora/memory" as const;

export { createMemory, queryMemory, archiveMemory, getMemory, type MemoryServiceOptions } from "./service.js";
export { StubMemoryRetriever } from "./retriever.js";
export { makeMemoryContextRetriever, type ContextRetrieverLike } from "./context-retriever.js";
export { getMemoryRecord, listMemoryEvents, emitMemoryEvent } from "./store.js";
export {
  MEMORY_TYPES,
  MEMORY_STATUSES,
  type MemoryType,
  type MemoryStatus,
  type MemoryContext,
  type CreateMemoryInput,
  type MemoryView,
  type MemoryQuery,
  type MemoryRetrievalResult,
  type MemoryRetriever,
  MemoryError,
  InvalidMemoryContextError,
  MissingMemoryError,
  InvalidMemoryInputError,
  UnauthorizedMemoryError,
} from "./types.js";

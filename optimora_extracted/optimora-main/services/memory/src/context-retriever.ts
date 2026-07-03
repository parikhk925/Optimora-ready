/**
 * Context Fabric integration seam (E9 Memory). Implements the Context Fabric
 * `ContextRetriever` interface so the memory store can feed records into context
 * assembly without redesigning either plane. Uses deterministic stub retrieval —
 * no embeddings, no paid calls. Callers must supply the MemoryService query
 * via the factory; the returned retriever is pure (no side effects beyond reads).
 */
import type { TxClient } from "@optimora/db";
import type { MemoryContext, MemoryQuery, MemoryRetriever } from "./types.js";
import { queryMemory } from "./service.js";

/**
 * Shape of the Context Fabric ContextRetriever (mirrored here to avoid a hard
 * import cycle — context imports memory, not the other way round). The Context
 * Fabric is the consumer; memory provides the data.
 */
export interface ContextRetrieverLike {
  readonly name: string;
  retrieve(ref: { kind: string; id: string }): { ref: { kind: string; id: string }; content: string } | Promise<{ ref: { kind: string; id: string }; content: string }>;
}

/**
 * Returns a Context Fabric–compatible retriever backed by the memory store.
 * Resolves `kind === "memory"` refs; all other kinds return the stub placeholder.
 */
export function makeMemoryContextRetriever(
  tx: TxClient,
  ctx: MemoryContext,
  options: { retriever?: MemoryRetriever } = {},
): ContextRetrieverLike {
  return {
    name: "memory",
    async retrieve(ref) {
      if (ref.kind !== "memory") {
        return { ref, content: `[${ref.kind}:${ref.id}]` };
      }
      const query: MemoryQuery = { agentId: ref.id, status: "active", limit: 10 };
      const result = await queryMemory(tx, ctx, query, options);
      const content = result.records
        .map((r) => `[${r.type}] ${r.content}`)
        .join("\n");
      return { ref, content: content || `[memory:${ref.id}:empty]` };
    },
  };
}

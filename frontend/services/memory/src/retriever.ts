/**
 * Deterministic stub memory retriever. Filters records by the query fields
 * (agentId, taskId, type, tags, status) then orders by importance desc,
 * createdAt desc, applies offset/limit — no embeddings, no vector search, no
 * paid calls. A real semantic/vector provider plugs in here later.
 */
import type { MemoryQuery, MemoryRetriever, MemoryView } from "./types.js";

export class StubMemoryRetriever implements MemoryRetriever {
  readonly name = "stub";

  retrieve(records: MemoryView[], query: MemoryQuery): MemoryView[] {
    const out = records.filter((r) => {
      if (query.agentId !== undefined && r.agentId !== query.agentId) return false;
      if (query.taskId !== undefined && r.taskId !== query.taskId) return false;
      if (query.type !== undefined && r.type !== query.type) return false;
      if (query.status !== undefined && r.status !== query.status) return false;
      if (query.tags && query.tags.length > 0) {
        if (!query.tags.every((t) => r.tags.includes(t))) return false;
      }
      return true;
    });
    // Deterministic ordering: importance desc, then createdAt desc.
    out.sort((a, b) => {
      if (b.importance !== a.importance) return b.importance - a.importance;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 100;
    return out.slice(offset, offset + limit);
  }
}

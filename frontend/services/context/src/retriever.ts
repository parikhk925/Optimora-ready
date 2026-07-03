/**
 * Deterministic stub retriever (T-9.x). Resolves a cognition/memory reference into
 * content WITHOUT any real retrieval, vector search, or paid call. This is the seam
 * where a future memory/vector/RAG provider plugs in; the stub returns a stable,
 * id-derived placeholder so assembly stays fully deterministic and testable.
 */
import type { ContextRetriever, RetrievalRef, RetrievedItem } from "./types.js";

export class StubRetriever implements ContextRetriever {
  readonly name = "stub";

  retrieve(ref: RetrievalRef): RetrievedItem {
    return { ref, content: `[${ref.kind}:${ref.id}]` };
  }
}

/**
 * Qdrant client + per-org collection helpers (T-1.5).
 * Each org gets its own collection (see namespacing.ts) for hard isolation.
 */
import { QdrantClient } from "@qdrant/js-client-rest";
import { qdrantOrgCollection } from "./namespacing.js";

export { QdrantClient } from "@qdrant/js-client-rest";

export interface QdrantConfig {
  url?: string;
  apiKey?: string;
}

let singleton: QdrantClient | undefined;

/** Lazily-created Qdrant client (reads QDRANT_URL / QDRANT_API_KEY by default). */
export function getQdrant(config: QdrantConfig = {}): QdrantClient {
  if (config.url || config.apiKey) {
    return new QdrantClient({
      url: config.url ?? process.env.QDRANT_URL ?? "http://localhost:6333",
      apiKey: config.apiKey ?? process.env.QDRANT_API_KEY,
      checkCompatibility: false,
    });
  }
  singleton ??= new QdrantClient({
    url: process.env.QDRANT_URL ?? "http://localhost:6333",
    apiKey: process.env.QDRANT_API_KEY,
    // Skip the strict client/server minor-version check; we pin both in CI/dev.
    checkCompatibility: false,
  });
  return singleton;
}

/**
 * Ensure an org's vector collection exists with the given dimensionality.
 * Idempotent: returns the namespaced collection name; creates it if missing.
 */
export async function ensureOrgCollection(
  client: QdrantClient,
  orgId: string,
  name: string,
  vectorSize: number,
  distance: "Cosine" | "Euclid" | "Dot" = "Cosine",
): Promise<string> {
  const collection = qdrantOrgCollection(orgId, name);
  const exists = await client.collectionExists(collection);
  if (!exists.exists) {
    await client.createCollection(collection, {
      vectors: { size: vectorSize, distance },
    });
  }
  return collection;
}

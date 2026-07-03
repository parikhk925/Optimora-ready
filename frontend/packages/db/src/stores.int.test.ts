/**
 * Stores integration test (T-1.5) — verifies live connectivity to Qdrant and
 * ClickHouse and that per-org Qdrant collections are created in isolation.
 * Requires the dev stack (pnpm infra:up). Run via test:integration.
 */
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { ensureOrgCollection, getClickhouse, getQdrant, qdrantOrgCollection } from "./index.js";

const orgA = randomUUID();
const orgB = randomUUID();
const qdrant = getQdrant();

afterAll(async () => {
  for (const org of [orgA, orgB]) {
    const name = qdrantOrgCollection(org, "memory");
    try {
      await qdrant.deleteCollection(name);
    } catch {
      // best-effort cleanup
    }
  }
});

describe("Qdrant per-org collections", () => {
  it("creates an isolated collection per org (idempotent)", async () => {
    const a = await ensureOrgCollection(qdrant, orgA, "memory", 8);
    // Second call is a no-op (already exists).
    const aAgain = await ensureOrgCollection(qdrant, orgA, "memory", 8);
    expect(a).toBe(aAgain);
    expect((await qdrant.collectionExists(a)).exists).toBe(true);
  });

  it("different orgs get distinct collections", async () => {
    const a = qdrantOrgCollection(orgA, "memory");
    const b = await ensureOrgCollection(qdrant, orgB, "memory", 8);
    expect(b).not.toBe(a);
    expect((await qdrant.collectionExists(b)).exists).toBe(true);
  });
});

describe("ClickHouse connectivity", () => {
  it("responds to ping", async () => {
    const ch = getClickhouse();
    const res = await ch.ping();
    expect(res.success).toBe(true);
    await ch.close();
  });
});

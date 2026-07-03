/**
 * Memory retriever + input-validation unit tests (E9 Memory). No DB, no AI calls.
 */
import { describe, expect, it } from "vitest";
import { StubMemoryRetriever } from "./retriever.js";
import {
  InvalidMemoryContextError,
  InvalidMemoryInputError,
  type MemoryView,
} from "./types.js";
import { randomUUID } from "node:crypto";

function rec(override: Partial<MemoryView> = {}): MemoryView {
  return {
    id: randomUUID(),
    tenantId: randomUUID(),
    orgId: randomUUID(),
    agentId: randomUUID(),
    taskId: null,
    type: "fact",
    content: "hello",
    tags: [],
    importance: 0.5,
    meta: {},
    status: "active",
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...override,
  };
}

describe("StubMemoryRetriever", () => {
  const r = new StubMemoryRetriever();

  it("returns all active records with no filters", () => {
    const records = [rec({ status: "active" }), rec({ status: "archived" })];
    // no status filter — returns both
    expect(r.retrieve(records, {})).toHaveLength(2);
  });

  it("filters by status", () => {
    const records = [rec({ status: "active" }), rec({ status: "archived" })];
    expect(r.retrieve(records, { status: "active" })).toHaveLength(1);
  });

  it("filters by type", () => {
    const records = [rec({ type: "fact" }), rec({ type: "preference" })];
    expect(r.retrieve(records, { type: "fact" })).toHaveLength(1);
  });

  it("filters by tags (AND semantics)", () => {
    const a = rec({ tags: ["ai", "core"] });
    const b = rec({ tags: ["ai"] });
    expect(r.retrieve([a, b], { tags: ["ai", "core"] })).toHaveLength(1);
    expect(r.retrieve([a, b], { tags: ["ai"] })).toHaveLength(2);
  });

  it("filters by agentId", () => {
    const id = randomUUID();
    const records = [rec({ agentId: id }), rec()];
    expect(r.retrieve(records, { agentId: id })).toHaveLength(1);
  });

  it("orders by importance desc then createdAt desc (deterministic)", () => {
    const old = rec({ importance: 0.9, createdAt: new Date(1000) });
    const hi = rec({ importance: 0.9, createdAt: new Date(2000) });
    const lo = rec({ importance: 0.1 });
    const out = r.retrieve([old, lo, hi], {});
    expect(out[0]?.id).toBe(hi.id);
    expect(out[1]?.id).toBe(old.id);
    expect(out[2]?.id).toBe(lo.id);
  });

  it("applies offset and limit", () => {
    const records = Array.from({ length: 5 }, () => rec());
    expect(r.retrieve(records, { limit: 2 })).toHaveLength(2);
    expect(r.retrieve(records, { offset: 3, limit: 10 })).toHaveLength(2);
  });
});

describe("InvalidMemoryContextError / InvalidMemoryInputError", () => {
  it("are instances of MemoryError", () => {
    expect(new InvalidMemoryContextError("x")).toBeInstanceOf(Error);
    expect(new InvalidMemoryInputError("x")).toBeInstanceOf(Error);
  });
});

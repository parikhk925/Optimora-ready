/**
 * Budget/retriever unit tests (T-9.x) — deterministic token estimation, budget
 * truncation, and the stub retriever. No DB, no AI calls.
 */
import { describe, expect, it } from "vitest";
import { applyBudget, estimateTokens, truncateToTokens } from "./budget.js";
import { StubRetriever } from "./retriever.js";
import type { ContextSection, SectionKind } from "./types.js";

function sec(kind: SectionKind, priority: number, content: string): ContextSection {
  return { kind, id: null, priority, content, tokens: estimateTokens(content), truncated: false };
}

describe("estimateTokens", () => {
  it("is a deterministic char-based heuristic", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
  });
});

describe("truncateToTokens", () => {
  it("truncates at a token boundary and clamps non-positive budgets", () => {
    expect(truncateToTokens("abcdefgh", 1)).toBe("abcd");
    expect(truncateToTokens("abc", 5)).toBe("abc");
    expect(truncateToTokens("abc", 0)).toBe("");
  });
});

describe("applyBudget", () => {
  it("keeps all sections when within budget", () => {
    const out = applyBudget([sec("agent", 0, "abcd"), sec("task", 1, "abcd")], 10);
    expect(out.truncated).toBe(false);
    expect(out.sections).toHaveLength(2);
    expect(out.usedTokens).toBe(2);
  });

  it("truncates the overflowing section and drops the rest (priority order)", () => {
    const out = applyBudget(
      [sec("agent", 0, "abcdefgh"), sec("task", 1, "keep-me")], // 2 tokens, then more
      1,
    );
    expect(out.sections).toHaveLength(1);
    expect(out.sections[0]?.truncated).toBe(true);
    expect(out.sections[0]?.content).toBe("abcd");
    expect(out.usedTokens).toBe(1);
    expect(out.truncated).toBe(true);
  });

  it("stops cleanly when budget is exactly consumed", () => {
    const out = applyBudget([sec("agent", 0, "abcd"), sec("task", 1, "abcd")], 1);
    expect(out.sections).toHaveLength(1);
    expect(out.truncated).toBe(true);
  });
});

describe("StubRetriever", () => {
  it("returns deterministic id-derived content (no real retrieval)", () => {
    const r = new StubRetriever();
    const item = r.retrieve({ kind: "plan", id: "p1" });
    expect(r.name).toBe("stub");
    expect(item.content).toBe("[plan:p1]");
  });
});

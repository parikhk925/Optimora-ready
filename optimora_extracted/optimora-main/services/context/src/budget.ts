/**
 * Deterministic token estimation + budget truncation (T-9.x). Pure functions, no
 * I/O. The estimate is a stable char-based heuristic (NOT a real tokenizer) so the
 * plane stays deterministic and free of paid/model dependencies. Sections are kept
 * in priority order (lower first); the first section that overflows the remaining
 * budget is truncated at a token boundary, and lower-priority sections beyond it
 * are dropped.
 */
import type { ContextSection } from "./types.js";

/** Chars-per-token heuristic. Deterministic and provider-free. */
export const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** Truncate text to at most `maxTokens` tokens (deterministic char boundary). */
export function truncateToTokens(text: string, maxTokens: number): string {
  if (maxTokens <= 0) return "";
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  return text.length <= maxChars ? text : text.slice(0, maxChars);
}

export interface BudgetResult {
  sections: ContextSection[];
  usedTokens: number;
  truncated: boolean;
}

/**
 * Apply a hard token budget to priority-ordered sections. Input is assumed sorted
 * by `priority` ascending; ties preserve insertion order (stable). Returns the
 * sections that fit (the overflowing one truncated), total used tokens, and whether
 * any truncation/drop occurred.
 */
export function applyBudget(sections: ContextSection[], maxTokens: number): BudgetResult {
  const kept: ContextSection[] = [];
  let used = 0;
  let truncated = false;

  for (const section of sections) {
    const remaining = maxTokens - used;
    if (remaining <= 0) {
      truncated = true;
      break;
    }
    if (section.tokens <= remaining) {
      kept.push(section);
      used += section.tokens;
      continue;
    }
    // Overflow: truncate this section to the remaining budget, then stop.
    const content = truncateToTokens(section.content, remaining);
    const tokens = estimateTokens(content);
    kept.push({ ...section, content, tokens, truncated: true });
    used += tokens;
    truncated = true;
    break;
  }

  return { sections: kept, usedTokens: used, truncated };
}

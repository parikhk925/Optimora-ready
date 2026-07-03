/**
 * Deterministic rubric/check-based reviewer (T-8.4). Evaluates task output
 * against the Agent ABI quality rules (`qualityRules.checks` + `minScore`) and
 * the agent output schema's required fields. No AI calls. Unknown check names
 * fail closed (invalid quality rules).
 */
import type { AgentDefinition } from "@optimora/agent-contract";
import {
  InvalidQualityRulesError,
  type EvidenceRef,
  type ReflectInput,
  type ReflectionProvider,
  type ReviewVerdict,
} from "./types.js";

type CheckFn = (output: Record<string, unknown>) => { passed: boolean; detail: string; pointer?: string };

function isNonEmpty(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
}

/**
 * Built-in deterministic checks, keyed by the names referenced in
 * `qualityRules.checks`. Each returns pass/fail + human-readable evidence.
 */
export const CHECK_REGISTRY: Record<string, CheckFn> = {
  output_is_object: (o) => ({
    passed: o != null && typeof o === "object" && !Array.isArray(o),
    detail: "output must be a JSON object",
  }),
  non_empty_output: (o) => ({
    passed: Object.keys(o).length > 0,
    detail: "output must not be empty",
  }),
  no_error_field: (o) => ({
    passed: !isNonEmpty(o.error) && !isNonEmpty(o.errors),
    detail: "output must not carry an error field",
    pointer: "error",
  }),
  has_summary: (o) => ({
    passed: isNonEmpty(o.summary),
    detail: "output.summary must be present and non-empty",
    pointer: "summary",
  }),
  has_content: (o) => ({
    passed: isNonEmpty(o.content) || isNonEmpty(o.text) || isNonEmpty(o.result),
    detail: "output must carry content/text/result",
    pointer: "content",
  }),
  no_placeholder: (o) => {
    const blob = JSON.stringify(o).toLowerCase();
    const passed = !/\b(tbd|todo|lorem ipsum|fixme|placeholder)\b/.test(blob);
    return { passed, detail: "output must not contain placeholder text" };
  },
};

/** Suggested-fix text for a violated check. */
function fixFor(check: string, detail: string): string {
  return `Address failed check "${check}": ${detail}.`;
}

/** Validate that every referenced check is known (fail closed otherwise). */
function assertKnownChecks(checks: string[]): void {
  const unknown = checks.filter((c) => !(c in CHECK_REGISTRY));
  if (unknown.length > 0) {
    throw new InvalidQualityRulesError(`Unknown quality check(s): ${unknown.join(", ")}`);
  }
}

/** Required field names declared on the agent output schema (if any). */
function requiredFields(def: AgentDefinition): string[] {
  const schema = def.outputSchema as { required?: unknown };
  const req = schema?.required;
  return Array.isArray(req) ? req.filter((x): x is string => typeof x === "string") : [];
}

/**
 * Deterministic rubric reviewer. Pure + synchronous: evaluates the configured
 * checks plus output-schema required fields, and computes a 0..1 quality score
 * as the weighted fraction of checks passed.
 */
export class RubricReviewer implements ReflectionProvider {
  readonly reviewerType = "deterministic" as const;

  review(input: ReflectInput): ReviewVerdict {
    const { definition, output } = input;
    const checks = definition.qualityRules.checks ?? [];
    assertKnownChecks(checks);

    const obj = (output && typeof output === "object" && !Array.isArray(output)
      ? (output as Record<string, unknown>)
      : {}) as Record<string, unknown>;

    const evidence: EvidenceRef[] = [];
    const violatedRules: string[] = [];
    const missingRequirements: string[] = [];
    const suggestedFixes: string[] = [];

    // 1) Output schema required fields → missing requirements.
    for (const field of requiredFields(definition)) {
      const present = isNonEmpty(obj[field]);
      evidence.push({
        check: `required:${field}`,
        passed: present,
        detail: `required output field "${field}"`,
        pointer: field,
      });
      if (!present) {
        missingRequirements.push(field);
        suggestedFixes.push(`Provide the missing required field "${field}".`);
      }
    }

    // 2) Configured rubric checks → violated rules.
    for (const name of checks) {
      const res = CHECK_REGISTRY[name]!(obj);
      evidence.push({ check: name, passed: res.passed, detail: res.detail, pointer: res.pointer });
      if (!res.passed) {
        violatedRules.push(name);
        suggestedFixes.push(fixFor(name, res.detail));
      }
    }

    const total = evidence.length;
    const passedCount = evidence.filter((e) => e.passed).length;
    // No checks configured → treat as fully passing (score 1), nothing to violate.
    const qualityScore = total === 0 ? 1 : passedCount / total;

    return {
      qualityScore,
      violatedRules,
      missingRequirements,
      suggestedFixes,
      // Deterministic checks are fully confident in their own verdict.
      confidence: 1,
      evidence,
      reviewerType: this.reviewerType,
    };
  }
}

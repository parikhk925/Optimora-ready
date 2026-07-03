/**
 * LLM-as-judge provider stub (T-8.4). Reserves the provider seam for future
 * model-backed review. It intentionally does NOT call any paid AI model yet —
 * invoking it fails closed. The Reflection Engine uses the deterministic
 * RubricReviewer until a real judge is wired in.
 */
import {
  ReflectionProviderNotImplementedError,
  type ReflectInput,
  type ReflectionProvider,
  type ReviewVerdict,
} from "./types.js";

export class StubJudgeReviewer implements ReflectionProvider {
  readonly reviewerType = "llm_judge" as const;

  review(_input: ReflectInput): ReviewVerdict {
    throw new ReflectionProviderNotImplementedError(
      "LLM-as-judge reviewer is not implemented yet; use the deterministic RubricReviewer.",
    );
  }
}

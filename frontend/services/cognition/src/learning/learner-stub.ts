/**
 * LLM-assisted learner stub (T-8.5). Reserves the provider seam for future
 * model-backed learning. It intentionally does NOT call any paid AI model yet —
 * invoking it fails closed. The Learning Engine uses the DeterministicLearner
 * until a real learner is wired in.
 */
import type { AgentDefinition } from "@optimora/agent-contract";
import {
  LearningProviderNotImplementedError,
  type LearningProvider,
  type PerformanceSignals,
  type RecommendationDraft,
} from "./types.js";

export class StubLlmLearner implements LearningProvider {
  readonly name = "llm_stub";

  propose(_signals: PerformanceSignals, _definition: AgentDefinition): RecommendationDraft[] {
    throw new LearningProviderNotImplementedError(
      "LLM-assisted learner is not implemented yet; use the DeterministicLearner.",
    );
  }
}

/**
 * Real (paid) model provider stub (T-9.1). Reserves the provider seam for a
 * future model-backed runtime. It intentionally does NOT call any paid AI model
 * yet — invoking it fails closed. The runtime uses the deterministic
 * EchoModelProvider until a real provider (and the claude-api guidance) is wired
 * in under its own EMS task.
 */
import {
  ModelProviderNotImplementedError,
  type ModelProvider,
  type ModelRequest,
  type ModelResult,
} from "./types.js";

export class StubModelProvider implements ModelProvider {
  readonly name = "stub";

  complete(_request: ModelRequest): ModelResult {
    throw new ModelProviderNotImplementedError(
      "Paid model provider is not implemented yet; use the deterministic EchoModelProvider.",
    );
  }
}

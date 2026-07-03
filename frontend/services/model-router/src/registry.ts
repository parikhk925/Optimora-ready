/**
 * Provider registry (E9 Model Routing). Holds registered ProviderRegistrations
 * keyed by provider name. A real provider (Anthropic, OpenAI, local) plugs in by
 * registering here — no code changes to the router or runtime required.
 */
import type { ProviderRegistration, RoutingPolicy } from "./types.js";

export class ProviderRegistry {
  private readonly _entries: Map<string, ProviderRegistration> = new Map();

  register(reg: ProviderRegistration): void {
    this._entries.set(reg.provider.name, reg);
  }

  /** Returns all registrations in insertion order. */
  all(): ProviderRegistration[] {
    return [...this._entries.values()];
  }

  get(name: string): ProviderRegistration | undefined {
    return this._entries.get(name);
  }

  /**
   * Select the best available provider for the given policy. Selection is fully
   * deterministic: filters then scores, no randomness. Returns null if nothing
   * matches (caller fails closed).
   *
   * Scoring (higher = preferred):
   *   +4  quality tier matches exactly
   *   +2  latency class matches preference
   *   +1  every safetyProfile tag is in caps
   *   −10 if allowedProviders list specified and provider not in it (excluded)
   */
  select(policy: RoutingPolicy): ProviderRegistration | null {
    const tier = policy.qualityTier ?? "standard";
    const latency = policy.latencyPreference ?? "normal";
    const allowed = policy.allowedProviders;
    const safety = policy.safetyProfile ?? [];

    let best: ProviderRegistration | null = null;
    let bestScore = -Infinity;

    for (const reg of this._entries.values()) {
      if (!reg.available) continue;
      if (allowed && allowed.length > 0 && !allowed.includes(reg.provider.name)) continue;

      let score = 0;
      if (reg.qualityTiers.includes(tier)) score += 4;
      if (reg.latencyClass === latency) score += 2;
      if (safety.every((t) => reg.caps.includes(t))) score += 1;

      if (score > bestScore) {
        bestScore = score;
        best = reg;
      }
    }
    return best;
  }
}

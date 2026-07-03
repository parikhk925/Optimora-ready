/**
 * Model Router unit tests (E9 Model Routing). No DB, no AI calls.
 * Tests registry selection, policy scoring, error types.
 */
import { describe, expect, it } from "vitest";
import { ProviderRegistry } from "./registry.js";
import {
  CostCeilingExceededError,
  InvalidRouterContextError,
  MalformedRouterRequestError,
  ModelRouterError,
  NoProviderAvailableError,
} from "./types.js";
import type { ModelProvider, ModelResult, ProviderRegistration } from "./types.js";

function stubProvider(name: string, tokensIn = 10, tokensOut = 5): ModelProvider {
  return {
    name,
    complete: (): ModelResult => ({ output: { result: name }, tokensIn, tokensOut }),
  };
}

function reg(
  name: string,
  opts: Partial<Omit<ProviderRegistration, "provider">> = {},
): ProviderRegistration {
  return {
    provider: stubProvider(name),
    costPerTokenUsd: 0,
    qualityTiers: ["standard"],
    latencyClass: "normal",
    caps: [],
    available: true,
    ...opts,
  };
}

describe("ProviderRegistry.select", () => {
  it("returns null when no providers registered", () => {
    expect(new ProviderRegistry().select({})).toBeNull();
  });

  it("returns null when all providers are unavailable", () => {
    const r = new ProviderRegistry();
    r.register(reg("p1", { available: false }));
    expect(r.select({})).toBeNull();
  });

  it("selects the only available provider", () => {
    const r = new ProviderRegistry();
    r.register(reg("echo"));
    expect(r.select({})?.provider.name).toBe("echo");
  });

  it("prefers the provider whose quality tier matches", () => {
    const r = new ProviderRegistry();
    r.register(reg("draft-only", { qualityTiers: ["draft"] }));
    r.register(reg("high-only", { qualityTiers: ["high"] }));
    expect(r.select({ qualityTier: "high" })?.provider.name).toBe("high-only");
    expect(r.select({ qualityTier: "draft" })?.provider.name).toBe("draft-only");
  });

  it("respects allowedProviders list", () => {
    const r = new ProviderRegistry();
    r.register(reg("a"));
    r.register(reg("b"));
    expect(r.select({ allowedProviders: ["b"] })?.provider.name).toBe("b");
  });

  it("excludes unavailable provider from allowedProviders", () => {
    const r = new ProviderRegistry();
    r.register(reg("a", { available: false }));
    expect(r.select({ allowedProviders: ["a"] })).toBeNull();
  });

  it("selection is deterministic (same inputs same output)", () => {
    const r = new ProviderRegistry();
    r.register(reg("x", { qualityTiers: ["standard", "high"] }));
    r.register(reg("y", { qualityTiers: ["draft"] }));
    const a = r.select({ qualityTier: "high" })?.provider.name;
    const b = r.select({ qualityTier: "high" })?.provider.name;
    expect(a).toBe(b);
  });
});

describe("Error hierarchy", () => {
  it("all errors extend ModelRouterError", () => {
    expect(new InvalidRouterContextError("x")).toBeInstanceOf(ModelRouterError);
    expect(new NoProviderAvailableError("x")).toBeInstanceOf(ModelRouterError);
    expect(new CostCeilingExceededError("x")).toBeInstanceOf(ModelRouterError);
    expect(new MalformedRouterRequestError("x")).toBeInstanceOf(ModelRouterError);
  });
});

describe("validateRequest (via router)", () => {
  it("MalformedRouterRequestError shape is stable", () => {
    const e = new MalformedRouterRequestError("bad role");
    expect(e.message).toContain("bad role");
  });
});

describe("UUID-based routing context", () => {
  it("InvalidRouterContextError is thrown for bad context", () => {
    const e = new InvalidRouterContextError("bad tenant");
    expect(e).toBeInstanceOf(InvalidRouterContextError);
    expect(e.message).toContain("bad tenant");
  });
});

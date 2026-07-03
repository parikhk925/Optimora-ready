import { describe, it, expect } from "vitest";
import {
  PACKAGE_NAME,
  applyTransition,
  canTransition,
  InvalidLifecycleTransitionError,
  parseAgentDefinition,
  InvalidAgentContractError,
  createDefinition,
  nextVersion,
  verifyDefinitionHash,
  assertDefinitionIntegrity,
  ImmutabilityError,
  validateInput,
  validateOutput,
  isBackwardCompatible,
  type NewDefinitionInput,
  type AgentDefinition,
} from "./index.js";

const AGENT_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const NODE_ID = "11111111-1111-1111-1111-111111111111";

function baseInput(overrides: Partial<NewDefinitionInput> = {}): NewDefinitionInput {
  return {
    identity: { agentId: AGENT_ID, key: "content-writer", displayName: "Content Writer" },
    role: "Content Writer",
    orgNodeId: NODE_ID,
    permissions: ["content:write"],
    budget: { budgetNodeId: NODE_ID },
    inputSchema: {
      type: "object",
      required: ["topic"],
      properties: { topic: { type: "string" } },
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      required: ["text"],
      properties: { text: { type: "string" } },
    },
    ...overrides,
  };
}

describe("agent-contract: validation", () => {
  it("accepts a valid contract and applies defaults", () => {
    const def = createDefinition(baseInput());
    expect(def.version).toBe(1);
    expect(def.role).toBe("Content Writer");
    expect(def.retryRules.maxAttempts).toBe(3); // default applied
    expect(def.permissions).toContain("content:write");
    expect(def.budget.budgetNodeId).toBe(NODE_ID);
  });

  it("rejects an invalid contract", () => {
    expect(() => parseAgentDefinition({ role: "x" })).toThrow(InvalidAgentContractError); // missing identity/version
    expect(() =>
      createDefinition(
        baseInput({ identity: { agentId: "not-a-uuid", key: "k", displayName: "X" } }),
      ),
    ).toThrow(InvalidAgentContractError);
    expect(() => createDefinition(baseInput({ budget: { budgetNodeId: "nope" } }))).toThrow(
      InvalidAgentContractError,
    );
  });
});

describe("agent-contract: lifecycle", () => {
  it("allows valid transitions and rejects invalid ones", () => {
    expect(canTransition("draft", "trained")).toBe(true);
    expect(canTransition("trained", "hired")).toBe(true);
    expect(canTransition("hired", "probation")).toBe(true);
    expect(canTransition("hired", "archived")).toBe(false);
    expect(applyTransition("probation", "hired")).toBe("hired");
    expect(() => applyTransition("archived", "hired")).toThrow(InvalidLifecycleTransitionError);
    expect(() => applyTransition("draft", "nonsense")).toThrow(InvalidLifecycleTransitionError);
  });
});

describe("agent-contract: immutable versioning", () => {
  it("seals definitions (frozen + hash-verified)", () => {
    const def = createDefinition(baseInput());
    expect(verifyDefinitionHash(def)).toBe(true);
    expect(Object.isFrozen(def)).toBe(true);
    expect(() => {
      (def as unknown as { role: string }).role = "tampered";
    }).toThrow();
  });

  it("detects tampering via the content hash", () => {
    const def = createDefinition(baseInput());
    const tampered = { ...def, role: "tampered" } as AgentDefinition; // copy, then break
    expect(verifyDefinitionHash(tampered)).toBe(false);
    expect(() => assertDefinitionIntegrity(tampered)).toThrow(ImmutabilityError);
  });

  it("nextVersion produces a new sealed version without mutating the previous", () => {
    const v1 = createDefinition(baseInput());
    const v2 = nextVersion(v1, { role: "Senior Content Writer" }, "promotion");
    expect(v1.version).toBe(1); // unchanged
    expect(v2.version).toBe(2);
    expect(v2.previousHash).toBe(v1.contentHash);
    expect(v2.contentHash).not.toBe(v1.contentHash);
    expect(verifyDefinitionHash(v2)).toBe(true);
  });
});

describe("agent-contract: input/output schema validation", () => {
  it("validates inputs and outputs against the declared schemas", () => {
    const def = createDefinition(baseInput());
    expect(validateInput(def, { topic: "AI" }).valid).toBe(true);
    expect(validateInput(def, {}).valid).toBe(false); // missing required 'topic'
    expect(validateInput(def, { topic: "AI", extra: 1 }).valid).toBe(false); // additionalProperties:false
    expect(validateOutput(def, { text: "hello" }).valid).toBe(true);
    expect(validateOutput(def, { text: 5 }).valid).toBe(false); // wrong type
  });
});

describe("agent-contract: backward compatibility", () => {
  it("flags breaking input/output changes and accepts compatible ones", () => {
    const v1 = createDefinition(baseInput());

    // Adding a new required input field is breaking.
    const breakingIn = nextVersion(v1, {
      inputSchema: {
        type: "object",
        required: ["topic", "tone"],
        properties: { topic: { type: "string" }, tone: { type: "string" } },
        additionalProperties: false,
      },
    });
    expect(isBackwardCompatible(v1, breakingIn).compatible).toBe(false);

    // Removing a guaranteed output field is breaking.
    const breakingOut = nextVersion(v1, {
      outputSchema: { type: "object", required: [], properties: {} },
    });
    expect(isBackwardCompatible(v1, breakingOut).compatible).toBe(false);

    // Adding an optional input field + a new permission is compatible (note only).
    const compatible = nextVersion(v1, {
      inputSchema: {
        type: "object",
        required: ["topic"],
        properties: { topic: { type: "string" }, tone: { type: "string" } },
        additionalProperties: false,
      },
      permissions: ["content:write", "content:publish"],
    });
    const res = isBackwardCompatible(v1, compatible);
    expect(res.compatible).toBe(true);
    expect(res.notes.some((n) => n.includes("content:publish"))).toBe(true);
  });
});

describe("agent-contract: package", () => {
  it("exposes its name", () => {
    expect(PACKAGE_NAME).toBe("@optimora/agent-contract");
  });
});

import { describe, it, expect } from "vitest";
import { authorize, assertAuthorized, PolicyDenyError } from "./authorize.js";
import type { AuthorizeRequest, Decision, PolicyProvider } from "./types.js";

const allowProvider: PolicyProvider = {
  authorize: (req): Decision => ({
    effect: "allow",
    allowed: true,
    reasons: [],
    determiningPolicies: ["policy0"],
    metadata: {
      principalId: req.principal.id,
      principalType: req.principal.type,
      tenantId: req.principal.tenantId,
      action: req.action,
      resourceType: req.resource.type,
      resourceId: req.resource.id,
      engine: "fake",
      evaluatedAt: "now",
    },
  }),
};

const throwingProvider: PolicyProvider = {
  authorize: () => {
    throw new Error("boom");
  },
};

const req: AuthorizeRequest = {
  principal: { type: "user", id: "u1", tenantId: "t1", roles: ["org_admin"] },
  action: "organization:read",
  resource: { type: "organization", id: "o1", tenantId: "t1" },
};

describe("authorize() facade", () => {
  it("passes through a provider allow", () => {
    const d = authorize(req, allowProvider);
    expect(d.allowed).toBe(true);
    expect(d.effect).toBe("allow");
  });

  it("fails closed on missing required context without calling the provider", () => {
    const bad = { ...req, action: "" } as AuthorizeRequest;
    const d = authorize(bad, throwingProvider);
    expect(d.allowed).toBe(false);
    expect(d.reasons).toContain("missing_required_context");
  });

  it("fails closed when the provider throws", () => {
    const d = authorize(req, throwingProvider);
    expect(d.allowed).toBe(false);
    expect(d.reasons[0]).toMatch(/^engine_error:/);
  });

  it("assertAuthorized throws PolicyDenyError on deny", () => {
    expect(() =>
      assertAuthorized({ ...req, action: "" } as AuthorizeRequest, throwingProvider),
    ).toThrow(PolicyDenyError);
  });

  it("decision always carries audit metadata", () => {
    const d = authorize(req, allowProvider);
    expect(d.metadata).toMatchObject({
      principalId: "u1",
      tenantId: "t1",
      action: "organization:read",
    });
    expect(typeof d.metadata.evaluatedAt).toBe("string");
  });
});

import { describe, it, expect } from "vitest";
import { explainDecision } from "./explain.js";
import {
  auditDecision,
  authorizeWithAudit,
  type AuditSink,
  type AuthzAuditEvent,
} from "./audit.js";
import type { Decision } from "./types.js";

function decision(partial: Partial<Decision> & Pick<Decision, "effect" | "allowed">): Decision {
  return {
    reasons: [],
    determiningPolicies: [],
    metadata: {
      principalId: "p1",
      principalType: "user",
      tenantId: "t1",
      action: "organization:update",
      resourceType: "organization",
      resourceId: "o1",
      engine: "cedar:2025-06-optimora-base-v1",
      evaluatedAt: "2026-06-28T00:00:00.000Z",
    },
    ...partial,
  };
}

class CapturingSink implements AuditSink {
  events: AuthzAuditEvent[] = [];
  emit(e: AuthzAuditEvent): void {
    this.events.push(e);
  }
}

describe("deny explainer", () => {
  it("does not leak cross-tenant existence (generic forbidden)", () => {
    const e = explainDecision(
      decision({ effect: "deny", allowed: false, reasons: ["cross_tenant_capability"] }),
      "agent",
    );
    expect(e.code).toBe("forbidden");
    expect(e.message.toLowerCase()).not.toContain("tenant");
    expect(e.message).toBe("This agent is not permitted to perform this action.");
  });

  it("uses principal-aware messages without leaking policy internals", () => {
    const user = explainDecision(
      decision({ effect: "deny", allowed: false, reasons: ["no_matching_permit"] }),
      "user",
    );
    const key = explainDecision(
      decision({ effect: "deny", allowed: false, reasons: ["no_matching_permit"] }),
      "api_key",
    );
    expect(user.message).toMatch(/permission/i);
    expect(key.message).toMatch(/API key/i);
    for (const m of [user.message, key.message]) {
      expect(m).not.toMatch(/policy|cedar|permit/i);
    }
  });

  it("maps credential and engine errors to non-revealing codes", () => {
    expect(
      explainDecision(
        decision({ effect: "deny", allowed: false, reasons: ["invalid_capability_token"] }),
        "agent",
      ).code,
    ).toBe("unauthorized");
    expect(
      explainDecision(
        decision({ effect: "deny", allowed: false, reasons: ["engine_error:boom"] }),
        "user",
      ).code,
    ).toBe("unavailable");
  });
});

describe("audit emission", () => {
  it("emits an allow event with full metadata", async () => {
    const sink = new CapturingSink();
    const res = await auditDecision(decision({ effect: "allow", allowed: true }), "user", {
      sink,
      orgId: "o1",
      requestId: "req-1",
    });
    expect(res.decision.allowed).toBe(true);
    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]).toMatchObject({
      type: "authz.decision",
      principalType: "user",
      tenantId: "t1",
      orgId: "o1",
      action: "organization:update",
      resourceType: "organization",
      effect: "allow",
      denyReasons: [],
      policyVersion: "2025-06-optimora-base-v1",
      engine: "cedar",
      requestId: "req-1",
    });
    expect(typeof sink.events[0]!.timestamp).toBe("string");
  });

  it("emits a deny event keeping the raw reasons", async () => {
    const sink = new CapturingSink();
    const res = await auditDecision(
      decision({ effect: "deny", allowed: false, reasons: ["no_matching_permit"] }),
      "user",
      { sink },
    );
    expect(res.explanation.code).toBe("forbidden");
    expect(sink.events[0]!.effect).toBe("deny");
    expect(sink.events[0]!.denyReasons).toContain("no_matching_permit");
  });

  it("fails closed when an ALLOW cannot be audited", async () => {
    const sink: AuditSink = {
      emit: () => {
        throw new Error("sink down");
      },
    };
    const res = await auditDecision(decision({ effect: "allow", allowed: true }), "user", { sink });
    expect(res.decision.allowed).toBe(false);
    expect(res.decision.reasons).toContain("audit_unavailable");
    expect(res.explanation.code).toBe("unavailable");
  });

  it("does not block a DENY when audit emission fails (non-blocking)", async () => {
    const sink: AuditSink = {
      emit: () => {
        throw new Error("sink down");
      },
    };
    const res = await auditDecision(
      decision({ effect: "deny", allowed: false, reasons: ["no_matching_permit"] }),
      "user",
      { sink },
    );
    expect(res.decision.allowed).toBe(false); // still denied, not crashed
  });

  it("authorizeWithAudit runs authorize + audit together", async () => {
    const sink = new CapturingSink();
    const res = await authorizeWithAudit(
      {
        principal: { type: "user", id: "u1", tenantId: "t1", roles: [], permissions: [] },
        action: "organization:update",
        resource: { type: "organization", id: "o1", tenantId: "t1", orgId: "o1" },
        context: { requiredPermission: "organization:update" },
      },
      { sink, requestId: "req-2" },
    );
    expect(res.decision.allowed).toBe(false); // no roles/permissions -> deny
    expect(sink.events[0]).toMatchObject({ effect: "deny", requestId: "req-2", orgId: "o1" });
  });
});

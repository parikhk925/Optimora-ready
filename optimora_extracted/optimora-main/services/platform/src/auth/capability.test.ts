import { describe, it, expect } from "vitest";
import {
  agentPrincipalFromCapability,
  decodeCapabilityToken,
  type CapabilityClaims,
} from "./capability.js";

const claims: CapabilityClaims = {
  gid: "j1",
  sub: "agent-1",
  tenantId: "t1",
  orgId: "o1",
  taskId: "task-1",
  scopes: ["organization:read"],
  type: "capability",
};

describe("capability tokens (unit)", () => {
  it("maps capability claims to a scope-bound agent principal", () => {
    const p = agentPrincipalFromCapability(claims);
    expect(p).toMatchObject({
      type: "agent",
      id: "agent-1",
      tenantId: "t1",
      orgId: "o1",
      roles: [], // no broad roles -> least privilege
      scopes: ["organization:read"],
      permissions: ["organization:read"], // scopes become effective permissions
    });
  });

  it("decodes a malformed token to null (fail closed)", async () => {
    expect(await decodeCapabilityToken("secret-0123456789abcdef0123456789", "garbage")).toBeNull();
    expect(await decodeCapabilityToken("secret-0123456789abcdef0123456789", "a.b.c")).toBeNull();
  });
});

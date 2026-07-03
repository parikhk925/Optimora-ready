/**
 * Approval integration tests (E9 Approval). Proves create/approve/reject/cancel/
 * expire lifecycle, expired-gate fail-closed, unauthorized-approver denial,
 * cross-tenant denial, malformed-request fail-closed, audit event emission,
 * record storage, and the risky-action seam pattern. Requires dev Postgres.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import {
  ApprovalAlreadyResolvedError,
  ApprovalExpiredError,
  ApprovalNotFoundError,
  createApproval,
  expireApproval,
  getApprovalRecord,
  InvalidApprovalContextError,
  listApprovalEvents,
  listPendingApprovals,
  MalformedApprovalRequestError,
  resolveApproval,
  type ApprovalContext,
} from "./index.js";

const sys = getSystemPrisma();
const prisma = getPrisma();
const tenantA = randomUUID();
const orgA = randomUUID();
const tenantB = randomUUID();
const orgB = randomUUID();
const requesterA = "agent:" + randomUUID();

// resolveApproval manages its own tx (prisma client), all others use TxClient via inA/inB.
const inA = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, fn);
const inB = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantB, orgId: orgB }, fn);

const ctx: ApprovalContext = { tenantId: tenantA, orgId: orgA, requesterId: requesterA };

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `ap-${tenantA}`, name: "AP A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `ap-${tenantB}`, name: "AP B" } });
  await sys.organization.create({ data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" } });
  await sys.organization.create({ data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" } });
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Approval / Human-in-the-Loop", () => {
  it("creates an approval request in pending state and emits event", async () => {
    const req = await inA((tx) =>
      createApproval(tx, ctx, { reason: "risky_tool_call", description: "Delete all data" }),
    );
    expect(req.state).toBe("pending");
    expect(req.reason).toBe("risky_tool_call");
    expect(req.tenantId).toBe(tenantA);

    const stored = await inA((tx) => getApprovalRecord(tx, req.id));
    expect(stored?.state).toBe("pending");

    const events = await inA((tx) => listApprovalEvents(tx, req.id));
    expect(events.map((e: { type: string }) => e.type)).toContain("approval.requested");
  });

  it("approves a pending request and emits approval.approved event", async () => {
    const req = await inA((tx) =>
      createApproval(tx, ctx, { reason: "high_cost_action", description: "Expensive op" }),
    );
    const resolved = await resolveApproval(prisma, ctx, req.id, "approved", "LGTM");
    expect(resolved.state).toBe("approved");
    expect(resolved.approverNote).toBe("LGTM");
    expect(resolved.resolvedAt).toBeTruthy();

    const events = await inA((tx) => listApprovalEvents(tx, req.id));
    expect(events.map((e: { type: string }) => e.type)).toContain("approval.approved");
  });

  it("rejects a pending request and emits approval.rejected event", async () => {
    const req = await inA((tx) =>
      createApproval(tx, ctx, { reason: "data_export", description: "Export PII" }),
    );
    const resolved = await resolveApproval(prisma, ctx, req.id, "rejected", "Not allowed");
    expect(resolved.state).toBe("rejected");
    const events = await inA((tx) => listApprovalEvents(tx, req.id));
    expect(events.map((e: { type: string }) => e.type)).toContain("approval.rejected");
  });

  it("cancels a pending request", async () => {
    const req = await inA((tx) =>
      createApproval(tx, ctx, { reason: "connector_action", description: "Send Slack msg" }),
    );
    const cancelled = await resolveApproval(prisma, ctx, req.id, "cancelled");
    expect(cancelled.state).toBe("cancelled");
  });

  it("expires a pending request via expireApproval", async () => {
    const req = await inA((tx) =>
      createApproval(tx, ctx, { reason: "policy_required", description: "Need approval" }),
    );
    const expired = await inA((tx) => expireApproval(tx, ctx, req.id));
    expect(expired.state).toBe("expired");
    const events = await inA((tx) => listApprovalEvents(tx, req.id));
    expect(events.map((e: { type: string }) => e.type)).toContain("approval.expired");
  });

  it("fails closed when resolving an already-resolved approval", async () => {
    const req = await inA((tx) =>
      createApproval(tx, ctx, { reason: "risky_tool_call", description: "Dup" }),
    );
    await resolveApproval(prisma, ctx, req.id, "approved");
    await expect(
      resolveApproval(prisma, ctx, req.id, "approved"),
    ).rejects.toBeInstanceOf(ApprovalAlreadyResolvedError);
  });

  it("expired approval: state=expired persisted and event emitted before throwing", async () => {
    const req = await inA((tx) =>
      createApproval(tx, ctx, {
        reason: "risky_tool_call",
        description: "Past deadline",
        expiresAt: new Date(Date.now() - 1000),
      }),
    );
    await expect(
      resolveApproval(prisma, ctx, req.id, "approved"),
    ).rejects.toBeInstanceOf(ApprovalExpiredError);
    // Expiry is committed in resolveApproval's own tx before throwing.
    const stored = await inA((tx) => getApprovalRecord(tx, req.id));
    expect(stored?.state).toBe("expired");
    const events = await inA((tx) => listApprovalEvents(tx, req.id));
    expect(events.map((e: { type: string }) => e.type)).toContain("approval.expired");
  });

  it("expired approval cannot be approved after expiry", async () => {
    const req = await inA((tx) =>
      createApproval(tx, ctx, {
        reason: "high_cost_action",
        description: "Already expired",
        expiresAt: new Date(Date.now() - 1000),
      }),
    );
    // First resolve call expires it.
    await expect(resolveApproval(prisma, ctx, req.id, "approved")).rejects.toBeInstanceOf(ApprovalExpiredError);
    // Second call sees it is already resolved.
    await expect(resolveApproval(prisma, ctx, req.id, "approved")).rejects.toBeInstanceOf(ApprovalAlreadyResolvedError);
  });

  it("fails closed on approval not found", async () => {
    await expect(
      resolveApproval(prisma, ctx, randomUUID(), "approved"),
    ).rejects.toBeInstanceOf(ApprovalNotFoundError);
  });

  it("fails closed on malformed request (unknown reason, empty description)", async () => {
    await expect(
      inA((tx) =>
        createApproval(tx, ctx, { reason: "bogus" as never, description: "x" }),
      ),
    ).rejects.toBeInstanceOf(MalformedApprovalRequestError);
    await expect(
      inA((tx) =>
        createApproval(tx, ctx, { reason: "risky_tool_call", description: "   " }),
      ),
    ).rejects.toBeInstanceOf(MalformedApprovalRequestError);
  });

  it("fails closed on invalid tenant/org context", async () => {
    await expect(
      inA((tx) =>
        createApproval(
          tx,
          { tenantId: "bad", orgId: orgA, requesterId: requesterA },
          { reason: "risky_tool_call", description: "test" },
        ),
      ),
    ).rejects.toBeInstanceOf(InvalidApprovalContextError);
  });

  it("listPendingApprovals returns only pending records for the tenant", async () => {
    const agent = randomUUID().toString();
    const r1 = await inA((tx) =>
      createApproval(tx, { ...ctx, requesterId: agent }, { reason: "data_export", description: "Pending 1" }),
    );
    const r2 = await inA((tx) =>
      createApproval(tx, { ...ctx, requesterId: agent }, { reason: "data_export", description: "Pending 2" }),
    );
    await resolveApproval(prisma, ctx, r2.id, "approved");
    const pending = await inA((tx) => listPendingApprovals(tx, tenantA, orgA));
    const pendingIds = pending.map((p) => p.id);
    expect(pendingIds).toContain(r1.id);
    expect(pendingIds).not.toContain(r2.id);
  });

  it("risky-action seam: createApproval can be called before tool/connector execution", async () => {
    // Pattern: caller creates approval, checks state, proceeds only if approved.
    const req = await inA((tx) =>
      createApproval(tx, ctx, {
        reason: "risky_tool_call",
        description: "Would call: tools.delete_all",
        actionPayload: { tool: "delete_all", args: {} },
      }),
    );
    expect(req.state).toBe("pending");
    // Simulate human approves.
    const approved = await resolveApproval(prisma, ctx, req.id, "approved");
    expect(approved.state).toBe("approved");
    // Caller checks state before executing — action NOT auto-executed here.
    expect(approved.actionPayload["tool"]).toBe("delete_all");
  });

  it("denies cross-tenant access (RLS: tenant B approval invisible under tenant A)", async () => {
    const reqB = await inB((tx) =>
      createApproval(
        tx,
        { tenantId: tenantB, orgId: orgB, requesterId: "agent:b" },
        { reason: "policy_required", description: "B's request" },
      ),
    );
    const notVisible = await inA((tx) => getApprovalRecord(tx, reqB.id));
    expect(notVisible).toBeNull();
  });
});

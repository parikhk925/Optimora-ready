/**
 * Agent Communication Bus integration test (T-10.1). Proves agent↔agent,
 * agent→manager escalation, manager→agent, department/team broadcast, system
 * notice, unauthorized-relationship denial, cross-tenant denial, invalid
 * sender/recipient fail-closed, message immutability, delivery-status
 * transitions, inbox/outbox queries, and communication events. Requires the dev
 * Postgres + migrations.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma, getSystemPrisma, withTenantContext, type TxClient } from "@optimora/db";
import { createEdge, createNode } from "@optimora/org-graph";
import {
  sendMessage,
  broadcast,
  markRead,
  getMessage,
  listInbox,
  listOutbox,
  listThread,
  listCommunicationEvents,
  InvalidCommunicationContextError,
  InvalidSenderError,
  InvalidRecipientError,
  MalformedPayloadError,
  UnauthorizedRelationshipError,
  InvalidDeliveryTransitionError,
  type CommunicationContext,
} from "./index.js";

const sys = getSystemPrisma();
const prisma = getPrisma();
const tenantA = randomUUID();
const orgA = randomUUID();
const tenantB = randomUUID();
const orgB = randomUUID();

const inA = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantA, orgId: orgA }, fn);
const inB = <T>(fn: (tx: TxClient) => Promise<T>) =>
  withTenantContext(prisma, { tenantId: tenantB, orgId: orgB }, fn);

const ctx: CommunicationContext = { tenantId: tenantA, orgId: orgA };

let exec: string;
let dept: string;
let teamA: string;
let agent1: string;
let agent2: string;
let agent3: string;
let lone: string;
let nodeB: string; // tenant B

beforeAll(async () => {
  await sys.tenant.create({ data: { id: tenantA, slug: `cb-${tenantA}`, name: "CB A" } });
  await sys.tenant.create({ data: { id: tenantB, slug: `cb-${tenantB}`, name: "CB B" } });
  await sys.organization.create({ data: { id: orgA, tenantId: tenantA, slug: "main", name: "Org A" } });
  await sys.organization.create({ data: { id: orgB, tenantId: tenantB, slug: "main", name: "Org B" } });

  await inA(async (tx) => {
    const mk = (type: "executive" | "department" | "team" | "manager" | "agent", name: string) =>
      createNode(tx, { tenantId: tenantA, orgId: orgA, type, name });
    exec = (await mk("executive", "CEO")).id;
    dept = (await mk("department", "Dept")).id;
    teamA = (await mk("team", "TeamA")).id;
    agent1 = (await mk("agent", "Agent1")).id;
    agent2 = (await mk("agent", "Agent2")).id;
    agent3 = (await mk("agent", "Agent3")).id;
    lone = (await mk("agent", "Lone")).id;

    const manages = (from: string, to: string) =>
      createEdge(tx, { tenantId: tenantA, orgId: orgA, fromNodeId: from, toNodeId: to, type: "manages" });
    await manages(exec, dept);
    await manages(dept, teamA);
    await manages(teamA, agent1);
    await manages(teamA, agent2);
    await manages(dept, agent3);
    await manages(exec, lone);
    // agent1 <-> agent3 collaborate (peer).
    await createEdge(tx, {
      tenantId: tenantA,
      orgId: orgA,
      fromNodeId: agent1,
      toNodeId: agent3,
      type: "collaborates_with",
    });
  });

  nodeB = (
    await inB((tx) => createNode(tx, { tenantId: tenantB, orgId: orgB, type: "agent", name: "B" }))
  ).id;
});

afterAll(async () => {
  await sys.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await sys.$disconnect();
  await prisma.$disconnect();
});

describe("Agent Communication Bus", () => {
  it("delivers an agent-to-agent message (sibling peers) and records events", async () => {
    const m = await inA((tx) =>
      sendMessage(tx, ctx, { senderNodeId: agent1, recipientNodeId: agent2, type: "question", payload: { q: "ready?" } }),
    );
    expect(m.relationship).toBe("peer_sibling");
    expect(m.status).toBe("delivered");
    expect(m.deliveredAt).not.toBeNull();

    const events = await inA((tx) => listCommunicationEvents(tx, m.id));
    expect(events.map((e) => e.type)).toEqual(
      expect.arrayContaining(["communication.sent", "communication.delivered"]),
    );
  });

  it("delivers an agent-to-agent message via an explicit collaboration edge (peer)", async () => {
    const m = await inA((tx) =>
      sendMessage(tx, ctx, { senderNodeId: agent1, recipientNodeId: agent3, type: "answer", payload: {} }),
    );
    expect(m.relationship).toBe("peer");
  });

  it("delivers an agent-to-manager escalation (upward)", async () => {
    const m = await inA((tx) =>
      sendMessage(tx, ctx, { senderNodeId: agent1, recipientNodeId: teamA, type: "escalation", payload: { reason: "blocked" } }),
    );
    expect(m.relationship).toBe("subordinate_to_manager");
    expect(m.status).toBe("delivered");
  });

  it("delivers a manager-to-agent message (downward)", async () => {
    const m = await inA((tx) =>
      sendMessage(tx, ctx, { senderNodeId: teamA, recipientNodeId: agent1, type: "task_update", payload: { state: "go" } }),
    );
    expect(m.relationship).toBe("manager_to_subordinate");
  });

  it("fans out a department/team broadcast to all members", async () => {
    const msgs = await inA((tx) =>
      broadcast(tx, ctx, { senderNodeId: dept, scopeNodeId: teamA, type: "system_notice", payload: { notice: "standup" } }),
    );
    const recipients = msgs.map((m) => m.recipientNodeId).sort();
    expect(recipients).toEqual([agent1, agent2].sort());
    expect(msgs.every((m) => m.relationship === "broadcast" && m.status === "delivered")).toBe(true);
    // All share one thread + broadcast group.
    expect(new Set(msgs.map((m) => m.broadcastGroupId)).size).toBe(1);
    expect(new Set(msgs.map((m) => m.threadId)).size).toBe(1);
  });

  it("delivers a system/controller notice (no node sender)", async () => {
    const m = await inA((tx) =>
      sendMessage(tx, ctx, { senderNodeId: null, recipientNodeId: agent1, type: "system_notice", payload: { msg: "maintenance" } }),
    );
    expect(m.senderKind).toBe("system");
    expect(m.senderNodeId).toBeNull();
    expect(m.relationship).toBe("system");
  });

  it("denies an unauthorized relationship", async () => {
    await expect(
      inA((tx) => sendMessage(tx, ctx, { senderNodeId: agent1, recipientNodeId: lone, type: "question", payload: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedRelationshipError);
  });

  it("denies cross-tenant communication (recipient invisible under RLS)", async () => {
    await expect(
      inA((tx) => sendMessage(tx, ctx, { senderNodeId: agent1, recipientNodeId: nodeB, type: "question", payload: {} })),
    ).rejects.toBeInstanceOf(InvalidRecipientError);
  });

  it("fails closed on invalid sender / recipient / payload / context", async () => {
    await expect(
      inA((tx) => sendMessage(tx, ctx, { senderNodeId: randomUUID(), recipientNodeId: agent1, type: "question", payload: {} })),
    ).rejects.toBeInstanceOf(InvalidSenderError);
    await expect(
      inA((tx) => sendMessage(tx, ctx, { senderNodeId: agent1, recipientNodeId: randomUUID(), type: "question", payload: {} })),
    ).rejects.toBeInstanceOf(InvalidRecipientError);
    await expect(
      inA((tx) =>
        sendMessage(tx, ctx, {
          senderNodeId: agent1,
          recipientNodeId: agent2,
          type: "question",
          payload: "nope" as unknown as Record<string, unknown>,
        }),
      ),
    ).rejects.toBeInstanceOf(MalformedPayloadError);
    await expect(
      inA((tx) =>
        sendMessage(tx, { tenantId: "bad", orgId: orgA }, { senderNodeId: agent1, recipientNodeId: agent2, type: "question", payload: {} }),
      ),
    ).rejects.toBeInstanceOf(InvalidCommunicationContextError);
  });

  it("keeps messages immutable while delivery status transitions", async () => {
    const m = await inA((tx) =>
      sendMessage(tx, ctx, { senderNodeId: teamA, recipientNodeId: agent2, type: "task_update", payload: { v: 1 } }),
    );
    const read = await inA((tx) => markRead(tx, ctx, m.id));
    expect(read.status).toBe("read");
    expect(read.readAt).not.toBeNull();

    // Content is unchanged across the status transition (immutable record).
    const after = await inA((tx) => getMessage(tx, m.id));
    expect(after?.payload).toEqual({ v: 1 });
    expect(after?.type).toBe("task_update");
    expect(after?.senderNodeId).toBe(teamA);
    expect(after?.createdAt.getTime()).toBe(m.createdAt.getTime());

    // Illegal re-transition (read -> read) fails closed.
    await expect(inA((tx) => markRead(tx, ctx, m.id))).rejects.toBeInstanceOf(
      InvalidDeliveryTransitionError,
    );
  });

  it("supports inbox / outbox / thread queries", async () => {
    const m = await inA((tx) =>
      sendMessage(tx, ctx, { senderNodeId: agent1, recipientNodeId: agent2, type: "question", payload: { tag: "ioq" } }),
    );
    const inbox = await inA((tx) => listInbox(tx, agent2));
    expect(inbox.some((x) => x.id === m.id)).toBe(true);
    const outbox = await inA((tx) => listOutbox(tx, agent1));
    expect(outbox.some((x) => x.id === m.id)).toBe(true);
    const thread = await inA((tx) => listThread(tx, m.threadId));
    expect(thread.map((x) => x.id)).toContain(m.id);
  });
});

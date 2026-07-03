/**
 * Budget cascade over the Org Graph (T-3.2).
 *
 * Budgets attach to nodes. A node's EFFECTIVE limit is the minimum of its own
 * limit and every manages-ancestor's limit, so a child can never exceed an
 * ancestor cap. Reservations hold spend pre-emptively; the ledger records actual
 * spend. Everything runs on a tenant-scoped TxClient (RLS), so cross-tenant
 * nodes/budgets are invisible. Fail-closed: if the node or any ancestor in the
 * chain lacks a budget (or currencies disagree), the effective limit is unknown
 * and reservations/spends are denied.
 *
 * This is NOT a finance/billing system — it is the structural budget cap that the
 * Cost-Guard (E12) builds on later.
 */
import type { TxClient } from "@optimora/db";
import { ancestors } from "./traversal.js";

export class BudgetError extends Error {}
export class BudgetContextMissingError extends BudgetError {
  constructor(message = "Budget context missing: node or an ancestor has no budget.") {
    super(message);
    this.name = "BudgetContextMissingError";
  }
}
export class BudgetExceededError extends BudgetError {
  constructor(message = "Budget exceeded: amount exceeds the available effective budget.") {
    super(message);
    this.name = "BudgetExceededError";
  }
}
export class InvalidAmountError extends BudgetError {}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toNum(d: { toString(): string } | null | undefined): number {
  return d == null ? 0 : Number(d.toString());
}

export interface NodeBudgetView {
  nodeId: string;
  limit: number;
  currency: string;
}

export async function setBudget(
  tx: TxClient,
  input: { tenantId: string; orgId: string; nodeId: string; limit: number; currency?: string },
): Promise<NodeBudgetView> {
  if (!(input.limit >= 0)) throw new InvalidAmountError("Budget limit must be >= 0.");
  const currency = input.currency ?? "USD";
  const row = await tx.nodeBudget.upsert({
    where: { nodeId: input.nodeId },
    create: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      nodeId: input.nodeId,
      limitAmount: input.limit,
      currency,
    },
    update: { limitAmount: input.limit, currency },
  });
  return { nodeId: row.nodeId, limit: toNum(row.limitAmount), currency: row.currency };
}

export interface EffectiveLimit {
  effectiveLimit: number;
  currency: string;
  /** The node ids whose budgets bound this limit (self + ancestors). */
  chain: string[];
}

/**
 * Effective limit for a node = min(limit over the node and all manages-ancestors).
 * Returns null (fail closed) if the node id is malformed, the node has no budget,
 * any ancestor lacks a budget, or currencies disagree.
 */
export async function getEffectiveLimit(
  tx: TxClient,
  nodeId: string,
): Promise<EffectiveLimit | null> {
  if (!UUID_RE.test(nodeId)) return null;

  const self = await tx.nodeBudget.findUnique({ where: { nodeId } });
  if (!self) return null; // missing budget context -> fail closed

  const anc = await ancestors(tx, nodeId, "manages");
  const chainIds = [nodeId, ...anc.map((a) => a.id)];

  const budgets = await tx.nodeBudget.findMany({
    where: { nodeId: { in: chainIds } },
    select: { nodeId: true, limitAmount: true, currency: true },
  });
  // Every node in the chain must have a budget (missing ancestor budget -> fail closed).
  if (budgets.length !== chainIds.length) return null;

  const currency = self.currency;
  if (budgets.some((b) => b.currency !== currency)) return null; // currency mismatch -> fail closed

  const effectiveLimit = Math.min(...budgets.map((b) => toNum(b.limitAmount)));
  return { effectiveLimit, currency, chain: chainIds };
}

/** Currently-used amount at a node: active reservations + recorded spend. */
export async function getUsed(tx: TxClient, nodeId: string): Promise<number> {
  const [res, led] = await Promise.all([
    tx.budgetReservation.aggregate({
      where: { nodeId, status: "active" },
      _sum: { amount: true },
    }),
    tx.budgetLedger.aggregate({ where: { nodeId }, _sum: { amount: true } }),
  ]);
  return toNum(res._sum.amount) + toNum(led._sum.amount);
}

/** Available to reserve/spend at a node, or null (fail closed) if limit unknown. */
export async function getAvailable(tx: TxClient, nodeId: string): Promise<number | null> {
  const eff = await getEffectiveLimit(tx, nodeId);
  if (!eff) return null;
  return eff.effectiveLimit - (await getUsed(tx, nodeId));
}

export interface ReservationView {
  id: string;
  nodeId: string;
  amount: number;
  status: string;
}

/** Reserve budget at a node. Fails closed on missing budget; denies if over-budget. */
export async function reserve(
  tx: TxClient,
  input: { tenantId: string; orgId: string; nodeId: string; amount: number; reason?: string },
): Promise<ReservationView> {
  if (!(input.amount > 0)) throw new InvalidAmountError("Reservation amount must be > 0.");
  const available = await getAvailable(tx, input.nodeId);
  if (available == null) throw new BudgetContextMissingError();
  if (input.amount > available) throw new BudgetExceededError();

  const row = await tx.budgetReservation.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      nodeId: input.nodeId,
      amount: input.amount,
      reason: input.reason ?? null,
      status: "active",
    },
  });
  return { id: row.id, nodeId: row.nodeId, amount: toNum(row.amount), status: row.status };
}

/** Release an active reservation, freeing its held amount. Returns true if freed. */
export async function release(tx: TxClient, reservationId: string): Promise<boolean> {
  const res = await tx.budgetReservation.updateMany({
    where: { id: reservationId, status: "active" },
    data: { status: "released", releasedAt: new Date() },
  });
  return res.count > 0;
}

export interface SpendView {
  id: string;
  nodeId: string;
  amount: number;
}

/**
 * Record spend at a node. If `reservationId` is given, the matching active
 * reservation is committed (so its hold converts to recorded spend); otherwise
 * the spend is checked against current availability (fail-closed / over-budget).
 */
export async function recordSpend(
  tx: TxClient,
  input: {
    tenantId: string;
    orgId: string;
    nodeId: string;
    amount: number;
    reservationId?: string;
    description?: string;
  },
): Promise<SpendView> {
  if (!(input.amount > 0)) throw new InvalidAmountError("Spend amount must be > 0.");

  if (input.reservationId) {
    const committed = await tx.budgetReservation.updateMany({
      where: { id: input.reservationId, nodeId: input.nodeId, status: "active" },
      data: { status: "committed" },
    });
    if (committed.count === 0)
      throw new BudgetContextMissingError("No active reservation to commit.");
  } else {
    const available = await getAvailable(tx, input.nodeId);
    if (available == null) throw new BudgetContextMissingError();
    if (input.amount > available) throw new BudgetExceededError();
  }

  const row = await tx.budgetLedger.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      nodeId: input.nodeId,
      amount: input.amount,
      reservationId: input.reservationId ?? null,
      description: input.description ?? null,
    },
  });
  return { id: row.id, nodeId: row.nodeId, amount: toNum(row.amount) };
}

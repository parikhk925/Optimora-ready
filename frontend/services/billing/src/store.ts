import type { TxClient } from "@optimora/db";
import type { PlanLimits, SubscriptionView } from "./types.js";

function toSubView(r: {
  id: string; tenantId: string; orgId: string | null; planKey: string; status: string;
  trialEndsAt: Date | null; currentPeriodStart: Date; currentPeriodEnd: Date | null;
  cancelledAt: Date | null; customLimits: unknown; externalRef: string | null;
  createdAt: Date; updatedAt: Date;
}): SubscriptionView {
  return {
    ...r,
    customLimits: (r.customLimits as Partial<PlanLimits>) ?? {},
  };
}

export async function getSubscriptionRecord(
  tx: TxClient,
  tenantId: string,
  orgId?: string | null,
): Promise<SubscriptionView | null> {
  const r = await tx.billingSubscription.findFirst({
    where: { tenantId, orgId: orgId ?? null },
  });
  return r ? toSubView(r) : null;
}

export async function getSubscriptionById(tx: TxClient, id: string): Promise<SubscriptionView | null> {
  const r = await tx.billingSubscription.findUnique({ where: { id } });
  return r ? toSubView(r) : null;
}

export async function createSubscriptionRecord(
  tx: TxClient,
  data: {
    tenantId: string; orgId?: string | null; planKey: string; status: string;
    trialEndsAt?: Date | null; currentPeriodStart: Date; currentPeriodEnd?: Date | null;
    customLimits: object; externalRef?: string | null;
  },
): Promise<SubscriptionView> {
  const r = await tx.billingSubscription.create({ data });
  return toSubView(r);
}

export async function updateSubscriptionRecord(
  tx: TxClient,
  id: string,
  data: Partial<{
    status: string; trialEndsAt: Date | null; currentPeriodStart: Date;
    currentPeriodEnd: Date | null; cancelledAt: Date | null;
    customLimits: object; externalRef: string | null;
  }>,
): Promise<SubscriptionView> {
  const r = await tx.billingSubscription.update({ where: { id }, data });
  return toSubView(r);
}

export async function emitBillingEvent(
  tx: TxClient,
  event: { tenantId: string; subId?: string | null; type: string; payload: object },
): Promise<void> {
  await tx.billingEvent.create({ data: event });
}

export async function listBillingEvents(
  tx: TxClient,
  subId: string,
): Promise<{ id: string; type: string; createdAt: Date }[]> {
  return tx.billingEvent.findMany({
    where: { subId },
    orderBy: { createdAt: "asc" },
    select: { id: true, type: true, createdAt: true },
  });
}

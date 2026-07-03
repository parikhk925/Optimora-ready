/**
 * Org Graph event outbox (T-3.1). Node/edge mutations and reconciliation emit
 * events here; downstream consumers (the comms bus / planning engine) drain them
 * in later tasks.
 */
import type { TxClient } from "@optimora/db";
import type { OrgEvent } from "./types.js";

export async function emitOrgEvent(
  tx: TxClient,
  input: { tenantId: string; orgId: string; type: string; payload?: Record<string, unknown> },
): Promise<OrgEvent> {
  const row = await tx.orgEvent.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      type: input.type,
      payload: (input.payload ?? {}) as object,
    },
  });
  return { ...row, payload: (row.payload ?? {}) as Record<string, unknown> };
}

export async function listOrgEvents(tx: TxClient, orgId?: string): Promise<OrgEvent[]> {
  const rows = await tx.orgEvent.findMany({
    where: orgId ? { orgId } : undefined,
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({ ...r, payload: (r.payload ?? {}) as Record<string, unknown> }));
}

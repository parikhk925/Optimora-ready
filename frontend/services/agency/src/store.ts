import type { TxClient } from "@optimora/db";
import type {
  AgencyProfileView,
  AgencyModule,
  ClientWorkspaceView,
  FeatureFlagsView,
  JurisdictionDefaults,
} from "./types.js";

function toProfileView(r: {
  id: string; tenantId: string; agencyName: string; brandName: string;
  logoUrl: string | null; accentColor: string | null; supportEmail: string | null;
  defaultLocale: string; defaultCurrency: string; allowedClientRegions: string[];
  enabledModules: unknown; whiteLabelEnabled: boolean; createdAt: Date; updatedAt: Date;
}): AgencyProfileView {
  return {
    ...r,
    enabledModules: (r.enabledModules as AgencyModule[]) ?? [],
  };
}

function toWorkspaceView(r: {
  id: string; tenantId: string; agencyOrgId: string; clientName: string;
  industry: string | null; countryCode: string; region: string | null;
  jurisdictionDefaults: unknown; enabledAgents: string[]; enabledModules: string[];
  status: string; createdAt: Date; updatedAt: Date;
}): ClientWorkspaceView {
  return {
    ...r,
    jurisdictionDefaults: (r.jurisdictionDefaults as JurisdictionDefaults) ?? {},
  };
}

function toFlagsView(r: {
  id: string; tenantId: string; orgId: string; clientWorkspaceId: string | null;
  runtime: boolean; memory: boolean; tools: boolean; integrations: boolean;
  financeAgent: boolean; salesAgent: boolean; supportAgent: boolean; reporting: boolean;
  createdAt: Date; updatedAt: Date;
}): FeatureFlagsView {
  return r;
}

export async function getProfileRecord(tx: TxClient, tenantId: string): Promise<AgencyProfileView | null> {
  const r = await tx.agencyProfile.findUnique({ where: { tenantId } });
  return r ? toProfileView(r) : null;
}

export async function createProfileRecord(
  tx: TxClient,
  data: {
    tenantId: string; agencyName: string; brandName: string; logoUrl?: string | null;
    accentColor?: string | null; supportEmail?: string | null; defaultLocale: string;
    defaultCurrency: string; allowedClientRegions: string[]; enabledModules: AgencyModule[];
    whiteLabelEnabled: boolean;
  },
): Promise<AgencyProfileView> {
  const r = await tx.agencyProfile.create({ data });
  return toProfileView(r);
}

export async function updateProfileRecord(
  tx: TxClient,
  tenantId: string,
  data: Partial<{
    agencyName: string; brandName: string; logoUrl: string | null;
    accentColor: string | null; supportEmail: string | null; defaultLocale: string;
    defaultCurrency: string; allowedClientRegions: string[]; enabledModules: AgencyModule[];
    whiteLabelEnabled: boolean;
  }>,
): Promise<AgencyProfileView> {
  const r = await tx.agencyProfile.update({ where: { tenantId }, data });
  return toProfileView(r);
}

export async function createWorkspaceRecord(
  tx: TxClient,
  data: {
    tenantId: string; agencyOrgId: string; clientName: string; industry?: string | null;
    countryCode: string; region?: string | null; jurisdictionDefaults: object;
    enabledAgents: string[]; enabledModules: string[]; status: string;
  },
): Promise<ClientWorkspaceView> {
  const r = await tx.clientWorkspace.create({ data });
  return toWorkspaceView(r);
}

export async function updateWorkspaceRecord(
  tx: TxClient,
  id: string,
  data: Partial<{
    clientName: string; industry: string | null; countryCode: string; region: string | null;
    jurisdictionDefaults: object; enabledAgents: string[]; enabledModules: string[];
    status: string;
  }>,
): Promise<ClientWorkspaceView> {
  const r = await tx.clientWorkspace.update({ where: { id }, data });
  return toWorkspaceView(r);
}

export async function getWorkspaceRecord(tx: TxClient, id: string): Promise<ClientWorkspaceView | null> {
  const r = await tx.clientWorkspace.findUnique({ where: { id } });
  return r ? toWorkspaceView(r) : null;
}

export async function listWorkspaceRecords(
  tx: TxClient,
  filter: { tenantId: string; agencyOrgId?: string; status?: string },
): Promise<ClientWorkspaceView[]> {
  const where: Record<string, unknown> = { tenantId: filter.tenantId };
  if (filter.agencyOrgId) where["agencyOrgId"] = filter.agencyOrgId;
  if (filter.status) where["status"] = filter.status;
  const rows = await tx.clientWorkspace.findMany({ where, orderBy: { createdAt: "desc" } });
  return rows.map(toWorkspaceView);
}

export async function upsertFlagsRecord(
  tx: TxClient,
  data: {
    tenantId: string; orgId: string; clientWorkspaceId?: string | null;
    runtime: boolean; memory: boolean; tools: boolean; integrations: boolean;
    financeAgent: boolean; salesAgent: boolean; supportAgent: boolean; reporting: boolean;
  },
): Promise<FeatureFlagsView> {
  // Find existing flags for this scope
  const where = data.clientWorkspaceId
    ? { tenantId_orgId_clientWorkspaceId: { tenantId: data.tenantId, orgId: data.orgId, clientWorkspaceId: data.clientWorkspaceId } }
    : undefined;

  if (where) {
    const existing = await tx.featureFlags.findFirst({
      where: { tenantId: data.tenantId, orgId: data.orgId, clientWorkspaceId: data.clientWorkspaceId },
    });
    if (existing) {
      const r = await tx.featureFlags.update({ where: { id: existing.id }, data });
      return toFlagsView(r);
    }
  } else {
    const existing = await tx.featureFlags.findFirst({
      where: { tenantId: data.tenantId, orgId: data.orgId, clientWorkspaceId: null },
    });
    if (existing) {
      const r = await tx.featureFlags.update({ where: { id: existing.id }, data });
      return toFlagsView(r);
    }
  }

  const r = await tx.featureFlags.create({ data });
  return toFlagsView(r);
}

export async function getFlagsRecord(
  tx: TxClient,
  tenantId: string,
  orgId: string,
  clientWorkspaceId?: string | null,
): Promise<FeatureFlagsView | null> {
  const r = await tx.featureFlags.findFirst({
    where: { tenantId, orgId, clientWorkspaceId: clientWorkspaceId ?? null },
  });
  return r ? toFlagsView(r) : null;
}

export async function emitAgencyEvent(
  tx: TxClient,
  event: { tenantId: string; refId?: string | null; type: string; payload: object },
): Promise<void> {
  await tx.agencyEvent.create({ data: event });
}

export async function listAgencyEvents(tx: TxClient, refId: string): Promise<{ id: string; type: string; createdAt: Date }[]> {
  return tx.agencyEvent.findMany({ where: { refId }, orderBy: { createdAt: "asc" }, select: { id: true, type: true, createdAt: true } });
}

/**
 * Jurisdiction config persistence (E9 Jurisdiction). Tenant-scoped via TxClient (RLS).
 * Configs are versioned (new record per write). Bindings and task refs are append-only.
 */
import type { TxClient } from "@optimora/db";
import type {
  AgentJurisdictionBindingView,
  BusinessDomain,
  CountryCode,
  JurisdictionConfigView,
  JurisdictionProfile,
  TaskJurisdictionRefView,
} from "./types.js";

interface ConfigRow {
  id: string;
  tenantId: string;
  orgId: string;
  countryCode: string;
  region: string | null;
  businessDomain: string;
  version: number;
  profile: unknown;
  active: boolean;
  createdAt: Date;
}

function toConfigView(r: ConfigRow): JurisdictionConfigView {
  return {
    id: r.id,
    tenantId: r.tenantId,
    orgId: r.orgId,
    countryCode: r.countryCode as CountryCode,
    region: r.region,
    businessDomain: r.businessDomain as BusinessDomain,
    version: r.version,
    profile: r.profile as JurisdictionProfile,
    active: r.active,
    createdAt: r.createdAt,
  };
}

/** Get the next version number for a given org + country + domain. */
async function nextVersion(
  tx: TxClient,
  orgId: string,
  countryCode: string,
  businessDomain: string,
): Promise<number> {
  const latest = (await tx.jurisdictionConfig.findFirst({
    where: { orgId, countryCode, businessDomain },
    orderBy: { version: "desc" },
    select: { version: true },
  })) as { version: number } | null;
  return (latest?.version ?? 0) + 1;
}

export async function createJurisdictionConfig(
  tx: TxClient,
  input: {
    tenantId: string;
    orgId: string;
    countryCode: CountryCode;
    region?: string | null;
    businessDomain: BusinessDomain;
    profile: JurisdictionProfile;
  },
): Promise<JurisdictionConfigView> {
  // Deactivate previous active version for same org+country+domain.
  await tx.jurisdictionConfig.updateMany({
    where: { orgId: input.orgId, countryCode: input.countryCode, businessDomain: input.businessDomain, active: true },
    data: { active: false },
  });
  const version = await nextVersion(tx, input.orgId, input.countryCode, input.businessDomain);
  const row = (await tx.jurisdictionConfig.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      countryCode: input.countryCode,
      region: input.region ?? null,
      businessDomain: input.businessDomain,
      version,
      profile: input.profile as object,
      active: true,
    },
  })) as ConfigRow;
  return toConfigView(row);
}

export async function getJurisdictionConfig(tx: TxClient, id: string): Promise<JurisdictionConfigView | null> {
  const row = (await tx.jurisdictionConfig.findUnique({ where: { id } })) as ConfigRow | null;
  return row ? toConfigView(row) : null;
}

export async function getActiveConfig(
  tx: TxClient,
  orgId: string,
  countryCode: CountryCode,
  businessDomain: BusinessDomain,
): Promise<JurisdictionConfigView | null> {
  const row = (await tx.jurisdictionConfig.findFirst({
    where: { orgId, countryCode, businessDomain, active: true },
    orderBy: { version: "desc" },
  })) as ConfigRow | null;
  return row ? toConfigView(row) : null;
}

export async function listJurisdictionConfigs(
  tx: TxClient,
  filter: { tenantId: string; orgId?: string; countryCode?: CountryCode; businessDomain?: BusinessDomain; active?: boolean },
): Promise<JurisdictionConfigView[]> {
  const where: Record<string, unknown> = { tenantId: filter.tenantId };
  if (filter.orgId) where["orgId"] = filter.orgId;
  if (filter.countryCode) where["countryCode"] = filter.countryCode;
  if (filter.businessDomain) where["businessDomain"] = filter.businessDomain;
  if (filter.active !== undefined) where["active"] = filter.active;
  const rows = (await tx.jurisdictionConfig.findMany({ where, orderBy: { createdAt: "desc" } })) as ConfigRow[];
  return rows.map(toConfigView);
}

export async function createAgentBinding(
  tx: TxClient,
  input: { tenantId: string; orgId: string; agentId: string; jurisdictionConfigId: string },
): Promise<AgentJurisdictionBindingView> {
  const row = await tx.agentJurisdictionBinding.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      agentId: input.agentId,
      jurisdictionConfigId: input.jurisdictionConfigId,
    },
  });
  return row as AgentJurisdictionBindingView;
}

export async function listAgentBindings(
  tx: TxClient,
  agentId: string,
): Promise<AgentJurisdictionBindingView[]> {
  const rows = await tx.agentJurisdictionBinding.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
  });
  return rows as AgentJurisdictionBindingView[];
}

export async function createTaskJurisdictionRef(
  tx: TxClient,
  input: { tenantId: string; orgId: string; taskId: string; jurisdictionConfigId: string },
): Promise<TaskJurisdictionRefView> {
  const row = await tx.taskJurisdictionRef.create({
    data: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      taskId: input.taskId,
      jurisdictionConfigId: input.jurisdictionConfigId,
    },
  });
  return row as TaskJurisdictionRefView;
}

export async function getTaskJurisdictionRef(
  tx: TxClient,
  taskId: string,
): Promise<TaskJurisdictionRefView | null> {
  const row = await tx.taskJurisdictionRef.findFirst({
    where: { taskId },
    orderBy: { createdAt: "desc" },
  });
  return row ? (row as TaskJurisdictionRefView) : null;
}

export async function emitJurisdictionEvent(
  tx: TxClient,
  input: { tenantId: string; jurisdictionConfigId: string; type: string; payload?: Record<string, unknown> },
): Promise<void> {
  await tx.jurisdictionEvent.create({
    data: {
      tenantId: input.tenantId,
      jurisdictionConfigId: input.jurisdictionConfigId,
      type: input.type,
      payload: (input.payload ?? {}) as object,
    },
  });
}

export async function listJurisdictionEvents(tx: TxClient, jurisdictionConfigId: string) {
  return tx.jurisdictionEvent.findMany({ where: { jurisdictionConfigId }, orderBy: { createdAt: "asc" } });
}

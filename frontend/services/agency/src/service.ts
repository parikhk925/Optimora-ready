import type { TxClient } from "@optimora/db";
import {
  AGENCY_MODULES,
  ALLOWED_CLIENT_REGIONS,
  CLIENT_WORKSPACE_STATUSES,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  isValidRegion,
  type AgencyContext,
  type AgencyModule,
  type AgencyProfileView,
  type ClientWorkspaceView,
  type CreateAgencyProfileInput,
  type CreateClientWorkspaceInput,
  type FeatureFlagsInput,
  type FeatureFlagsView,
  type UpdateAgencyProfileInput,
  type UpdateClientWorkspaceInput,
  InvalidAgencyContextError,
  AgencyProfileAlreadyExistsError,
  AgencyProfileNotFoundError,
  ClientWorkspaceNotFoundError,
  InvalidLocaleError,
  InvalidCurrencyError,
  InvalidClientRegionError,
  InvalidModuleError,
  InvalidWorkspaceStatusError,
  MalformedAgencyConfigError,
} from "./types.js";
import {
  createProfileRecord,
  createWorkspaceRecord,
  emitAgencyEvent,
  getFlagsRecord,
  getProfileRecord,
  getWorkspaceRecord,
  listAgencyEvents,
  listWorkspaceRecords,
  updateProfileRecord,
  updateWorkspaceRecord,
  upsertFlagsRecord,
} from "./store.js";

function validateContext(ctx: AgencyContext): void {
  if (!ctx.tenantId || !/^[0-9a-f-]{36}$/.test(ctx.tenantId)) {
    throw new InvalidAgencyContextError("Invalid tenantId in agency context.");
  }
  if (!ctx.orgId || !/^[0-9a-f-]{36}$/.test(ctx.orgId)) {
    throw new InvalidAgencyContextError("Invalid orgId in agency context.");
  }
}

function validateLocale(locale: string): void {
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    throw new InvalidLocaleError(`Unsupported locale: ${locale}. Supported: ${SUPPORTED_LOCALES.join(", ")}`);
  }
}

function validateCurrency(currency: string): void {
  if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(currency)) {
    throw new InvalidCurrencyError(`Unsupported currency: ${currency}. Supported: ${SUPPORTED_CURRENCIES.join(", ")}`);
  }
}

function validateRegions(regions: string[]): void {
  for (const r of regions) {
    if (!(ALLOWED_CLIENT_REGIONS as readonly string[]).includes(r)) {
      throw new InvalidClientRegionError(`Invalid client region: ${r}. Allowed: ${ALLOWED_CLIENT_REGIONS.join(", ")}`);
    }
  }
}

function validateModules(modules: string[]): void {
  for (const m of modules) {
    if (!(AGENCY_MODULES as readonly string[]).includes(m)) {
      throw new InvalidModuleError(`Unknown module: ${m}. Known: ${AGENCY_MODULES.join(", ")}`);
    }
  }
}

function validateWorkspaceStatus(status: string): void {
  if (!(CLIENT_WORKSPACE_STATUSES as readonly string[]).includes(status)) {
    throw new InvalidWorkspaceStatusError(`Invalid workspace status: ${status}. Allowed: ${CLIENT_WORKSPACE_STATUSES.join(", ")}`);
  }
}

function validateCountryCode(code: string): void {
  const VALID = ["IN", "US", "CA", "GB", "GLOBAL"];
  if (!VALID.includes(code)) {
    throw new MalformedAgencyConfigError(`Invalid country code for workspace: ${code}.`);
  }
}

// ---- Agency Profile ----

export async function createAgencyProfile(
  tx: TxClient,
  ctx: AgencyContext,
  input: CreateAgencyProfileInput,
): Promise<AgencyProfileView> {
  validateContext(ctx);
  const locale = input.defaultLocale ?? "en-US";
  const currency = input.defaultCurrency ?? "USD";
  validateLocale(locale);
  validateCurrency(currency);
  if (input.allowedClientRegions) validateRegions(input.allowedClientRegions);
  if (input.enabledModules) validateModules(input.enabledModules);

  const existing = await getProfileRecord(tx, ctx.tenantId);
  if (existing) throw new AgencyProfileAlreadyExistsError("Agency profile already exists for this tenant.");

  const profile = await createProfileRecord(tx, {
    tenantId: ctx.tenantId,
    agencyName: input.agencyName,
    brandName: input.brandName,
    logoUrl: input.logoUrl ?? null,
    accentColor: input.accentColor ?? null,
    supportEmail: input.supportEmail ?? null,
    defaultLocale: locale,
    defaultCurrency: currency,
    allowedClientRegions: input.allowedClientRegions ?? [],
    enabledModules: (input.enabledModules ?? []) as AgencyModule[],
    whiteLabelEnabled: input.whiteLabelEnabled ?? false,
  });

  await emitAgencyEvent(tx, {
    tenantId: ctx.tenantId,
    refId: profile.id,
    type: "agency.profile.created",
    payload: { actorId: ctx.actorId, agencyName: profile.agencyName },
  });

  return profile;
}

export async function getAgencyProfile(tx: TxClient, ctx: AgencyContext): Promise<AgencyProfileView> {
  validateContext(ctx);
  const profile = await getProfileRecord(tx, ctx.tenantId);
  if (!profile) throw new AgencyProfileNotFoundError("No agency profile found for this tenant.");
  return profile;
}

export async function updateAgencyProfile(
  tx: TxClient,
  ctx: AgencyContext,
  input: UpdateAgencyProfileInput,
): Promise<AgencyProfileView> {
  validateContext(ctx);
  if (input.defaultLocale) validateLocale(input.defaultLocale);
  if (input.defaultCurrency) validateCurrency(input.defaultCurrency);
  if (input.allowedClientRegions) validateRegions(input.allowedClientRegions);
  if (input.enabledModules) validateModules(input.enabledModules);

  const existing = await getProfileRecord(tx, ctx.tenantId);
  if (!existing) throw new AgencyProfileNotFoundError("No agency profile found for this tenant.");

  const updated = await updateProfileRecord(tx, ctx.tenantId, {
    ...(input.agencyName !== undefined && { agencyName: input.agencyName }),
    ...(input.brandName !== undefined && { brandName: input.brandName }),
    ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
    ...(input.accentColor !== undefined && { accentColor: input.accentColor }),
    ...(input.supportEmail !== undefined && { supportEmail: input.supportEmail }),
    ...(input.defaultLocale !== undefined && { defaultLocale: input.defaultLocale }),
    ...(input.defaultCurrency !== undefined && { defaultCurrency: input.defaultCurrency }),
    ...(input.allowedClientRegions !== undefined && { allowedClientRegions: input.allowedClientRegions }),
    ...(input.enabledModules !== undefined && { enabledModules: input.enabledModules as AgencyModule[] }),
    ...(input.whiteLabelEnabled !== undefined && { whiteLabelEnabled: input.whiteLabelEnabled }),
  });

  await emitAgencyEvent(tx, {
    tenantId: ctx.tenantId,
    refId: updated.id,
    type: "agency.profile.updated",
    payload: { actorId: ctx.actorId },
  });

  return updated;
}

// ---- Client Workspace ----

export async function createClientWorkspace(
  tx: TxClient,
  ctx: AgencyContext,
  input: CreateClientWorkspaceInput,
): Promise<ClientWorkspaceView> {
  validateContext(ctx);
  const countryCode = input.countryCode ?? "GLOBAL";
  validateCountryCode(countryCode);
  if (input.region) {
    if (!isValidRegion(input.region)) {
      throw new MalformedAgencyConfigError(`Invalid region format: ${input.region}. Expected ISO 3166-2 (e.g. IN-MH).`);
    }
    const prefix = input.region.split("-")[0];
    if (countryCode !== "GLOBAL" && prefix !== countryCode) {
      throw new MalformedAgencyConfigError(`Region ${input.region} does not match country code ${countryCode}.`);
    }
  }
  const status = input.status ?? "pending";
  validateWorkspaceStatus(status);
  if (input.enabledModules) validateModules(input.enabledModules);

  const ws = await createWorkspaceRecord(tx, {
    tenantId: ctx.tenantId,
    agencyOrgId: ctx.orgId,
    clientName: input.clientName,
    industry: input.industry ?? null,
    countryCode,
    region: input.region ?? null,
    jurisdictionDefaults: input.jurisdictionDefaults ?? {},
    enabledAgents: input.enabledAgents ?? [],
    enabledModules: input.enabledModules ?? [],
    status,
  });

  await emitAgencyEvent(tx, {
    tenantId: ctx.tenantId,
    refId: ws.id,
    type: "agency.client_workspace.created",
    payload: { actorId: ctx.actorId, clientName: ws.clientName },
  });

  return ws;
}

export async function getClientWorkspace(tx: TxClient, ctx: AgencyContext, id: string): Promise<ClientWorkspaceView> {
  validateContext(ctx);
  const ws = await getWorkspaceRecord(tx, id);
  if (!ws) throw new ClientWorkspaceNotFoundError(`Client workspace ${id} not found.`);
  return ws;
}

export async function listClientWorkspaces(
  tx: TxClient,
  ctx: AgencyContext,
  filter?: { status?: string },
): Promise<ClientWorkspaceView[]> {
  validateContext(ctx);
  return listWorkspaceRecords(tx, { tenantId: ctx.tenantId, agencyOrgId: ctx.orgId, status: filter?.status });
}

export async function updateClientWorkspace(
  tx: TxClient,
  ctx: AgencyContext,
  id: string,
  input: UpdateClientWorkspaceInput,
): Promise<ClientWorkspaceView> {
  validateContext(ctx);
  const existing = await getWorkspaceRecord(tx, id);
  if (!existing) throw new ClientWorkspaceNotFoundError(`Client workspace ${id} not found.`);

  if (input.countryCode) validateCountryCode(input.countryCode);
  if (input.region) {
    if (!isValidRegion(input.region)) {
      throw new MalformedAgencyConfigError(`Invalid region format: ${input.region}.`);
    }
    const effectiveCountry = input.countryCode ?? existing.countryCode;
    const prefix = input.region.split("-")[0];
    if (effectiveCountry !== "GLOBAL" && prefix !== effectiveCountry) {
      throw new MalformedAgencyConfigError(`Region ${input.region} does not match country code ${effectiveCountry}.`);
    }
  }
  if (input.status) validateWorkspaceStatus(input.status);
  if (input.enabledModules) validateModules(input.enabledModules);

  const updated = await updateWorkspaceRecord(tx, id, {
    ...(input.clientName !== undefined && { clientName: input.clientName }),
    ...(input.industry !== undefined && { industry: input.industry }),
    ...(input.countryCode !== undefined && { countryCode: input.countryCode }),
    ...(input.region !== undefined && { region: input.region }),
    ...(input.jurisdictionDefaults !== undefined && { jurisdictionDefaults: input.jurisdictionDefaults }),
    ...(input.enabledAgents !== undefined && { enabledAgents: input.enabledAgents }),
    ...(input.enabledModules !== undefined && { enabledModules: input.enabledModules }),
    ...(input.status !== undefined && { status: input.status }),
  });

  await emitAgencyEvent(tx, {
    tenantId: ctx.tenantId,
    refId: updated.id,
    type: "agency.client_workspace.updated",
    payload: { actorId: ctx.actorId },
  });

  return updated;
}

// ---- Feature Flags ----

export async function setFeatureFlags(
  tx: TxClient,
  ctx: AgencyContext,
  input: FeatureFlagsInput,
  clientWorkspaceId?: string | null,
): Promise<FeatureFlagsView> {
  validateContext(ctx);

  const existing = await getFlagsRecord(tx, ctx.tenantId, ctx.orgId, clientWorkspaceId);

  const resolved = {
    tenantId: ctx.tenantId,
    orgId: ctx.orgId,
    clientWorkspaceId: clientWorkspaceId ?? null,
    runtime: input.runtime ?? existing?.runtime ?? true,
    memory: input.memory ?? existing?.memory ?? true,
    tools: input.tools ?? existing?.tools ?? true,
    integrations: input.integrations ?? existing?.integrations ?? true,
    financeAgent: input.financeAgent ?? existing?.financeAgent ?? false,
    salesAgent: input.salesAgent ?? existing?.salesAgent ?? false,
    supportAgent: input.supportAgent ?? existing?.supportAgent ?? false,
    reporting: input.reporting ?? existing?.reporting ?? false,
  };

  const flags = await upsertFlagsRecord(tx, resolved);

  await emitAgencyEvent(tx, {
    tenantId: ctx.tenantId,
    refId: clientWorkspaceId ?? flags.id,
    type: "agency.feature_flags.set",
    payload: { actorId: ctx.actorId, orgId: ctx.orgId, clientWorkspaceId: clientWorkspaceId ?? null },
  });

  return flags;
}

export async function getFeatureFlags(
  tx: TxClient,
  ctx: AgencyContext,
  clientWorkspaceId?: string | null,
): Promise<FeatureFlagsView | null> {
  validateContext(ctx);
  return getFlagsRecord(tx, ctx.tenantId, ctx.orgId, clientWorkspaceId);
}

export { listAgencyEvents };

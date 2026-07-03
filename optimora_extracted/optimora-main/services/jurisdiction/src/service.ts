/**
 * Jurisdiction service (E9 Jurisdiction). Deterministic, tenant-aware, fail-closed.
 * Creates/reads versioned jurisdiction configs, binds agents, references tasks.
 *
 * ARCHITECTURE RULE: Finance/CA agent must never assume one country. Always require
 * explicit jurisdiction or use GLOBAL fallback with disclaimer. Fail closed on invalid
 * or missing jurisdiction.
 *
 * No live tax law logic. No government filing integrations. No paid APIs.
 */
import type { TxClient } from "@optimora/db";
import { authorize } from "@optimora/auth-core";
import {
  createAgentBinding,
  createJurisdictionConfig,
  createTaskJurisdictionRef,
  emitJurisdictionEvent,
  getActiveConfig,
  getJurisdictionConfig,
  getTaskJurisdictionRef,
  listAgentBindings,
  listJurisdictionConfigs,
  listJurisdictionEvents,
} from "./store.js";
import { resolveProfile } from "./profiles.js";
import {
  BUSINESS_DOMAINS,
  COUNTRY_CODES,
  InvalidBusinessDomainError,
  InvalidCountryCodeError,
  InvalidJurisdictionContextError,
  JurisdictionConfigNotFoundError,
  MalformedJurisdictionConfigError,
  UnauthorizedJurisdictionAccessError,
  type AgentJurisdictionBindingView,
  type CreateJurisdictionConfigInput,
  type JurisdictionConfigView,
  type JurisdictionContext,
  type TaskJurisdictionRefView,
} from "./types.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Region codes: ISO 3166-2 style (e.g. "US-CA", "CA-ON", "IN-MH", "GB-ENG"). */
const REGION_RE = /^[A-Z]{2}-[A-Z]{2,5}$/;

function validateContext(ctx: JurisdictionContext): void {
  if (!UUID_RE.test(ctx.tenantId ?? "") || !UUID_RE.test(ctx.orgId ?? "")) {
    throw new InvalidJurisdictionContextError("Missing or invalid tenant/org context.");
  }
  if (!ctx.actorId || ctx.actorId.trim() === "") {
    throw new InvalidJurisdictionContextError("Missing actorId.");
  }
}

function policyDenies(ctx: JurisdictionContext, action: string, resourceId: string): boolean {
  if (!("principal" in ctx)) return false;
  const principal = (ctx as Record<string, unknown>).principal;
  if (!principal) return false;
  const decision = authorize({
    principal: principal as never,
    action,
    resource: { type: "jurisdiction_config", id: resourceId, tenantId: ctx.tenantId, orgId: ctx.orgId },
    context: { requiredPermission: action },
  });
  return !decision.allowed;
}

function validateCountryCode(code: string): void {
  if (!COUNTRY_CODES.includes(code as never)) {
    throw new InvalidCountryCodeError(
      `Unknown country code: "${code}". Supported: ${COUNTRY_CODES.join(", ")}.`,
    );
  }
}

function validateBusinessDomain(domain: string): void {
  if (!BUSINESS_DOMAINS.includes(domain as never)) {
    throw new InvalidBusinessDomainError(
      `Unknown business domain: "${domain}". Supported: ${BUSINESS_DOMAINS.join(", ")}.`,
    );
  }
}

function validateRegion(countryCode: string, region: string | null | undefined): void {
  if (!region) return;
  if (!REGION_RE.test(region)) {
    throw new MalformedJurisdictionConfigError(
      `Malformed region code: "${region}". Expected ISO 3166-2 format (e.g. "US-CA", "IN-MH").`,
    );
  }
  // Region prefix must match country code (GLOBAL has no regions).
  if (countryCode !== "GLOBAL" && !region.startsWith(`${countryCode}-`)) {
    throw new MalformedJurisdictionConfigError(
      `Region "${region}" does not belong to country "${countryCode}".`,
    );
  }
}

export async function createConfig(
  tx: TxClient,
  ctx: JurisdictionContext,
  input: CreateJurisdictionConfigInput,
): Promise<JurisdictionConfigView> {
  validateContext(ctx);
  validateCountryCode(input.countryCode);
  validateBusinessDomain(input.businessDomain);
  validateRegion(input.countryCode, input.region);
  if (policyDenies(ctx, "jurisdiction:write", ctx.orgId)) {
    throw new UnauthorizedJurisdictionAccessError("Unauthorized jurisdiction config write.");
  }
  const profile = resolveProfile(input.countryCode, input.profileOverrides);
  const config = await createJurisdictionConfig(tx, {
    tenantId: ctx.tenantId,
    orgId: ctx.orgId,
    countryCode: input.countryCode,
    region: input.region ?? null,
    businessDomain: input.businessDomain,
    profile,
  });
  await emitJurisdictionEvent(tx, {
    tenantId: ctx.tenantId,
    jurisdictionConfigId: config.id,
    type: "jurisdiction.config.created",
    payload: { countryCode: input.countryCode, businessDomain: input.businessDomain, version: config.version },
  });
  return config;
}

export async function getConfig(
  tx: TxClient,
  ctx: JurisdictionContext,
  id: string,
): Promise<JurisdictionConfigView> {
  validateContext(ctx);
  if (!UUID_RE.test(id ?? "")) throw new JurisdictionConfigNotFoundError("Invalid config id.");
  if (policyDenies(ctx, "jurisdiction:read", id)) {
    throw new UnauthorizedJurisdictionAccessError("Unauthorized jurisdiction config read.");
  }
  const config = await getJurisdictionConfig(tx, id);
  if (!config) throw new JurisdictionConfigNotFoundError("Jurisdiction config not found.");
  return config;
}

export async function getActiveJurisdiction(
  tx: TxClient,
  ctx: JurisdictionContext,
  countryCode: string,
  businessDomain: string,
): Promise<JurisdictionConfigView> {
  validateContext(ctx);
  validateCountryCode(countryCode);
  validateBusinessDomain(businessDomain);
  const config = await getActiveConfig(tx, ctx.orgId, countryCode as never, businessDomain as never);
  if (!config) {
    // Fail-safe: return GLOBAL fallback rather than null, but surface a disclaimer.
    // This is NOT a silent default — callers must check config.countryCode === "GLOBAL"
    // and surface the complianceDisclaimer to users.
    const fallbackProfile = resolveProfile("GLOBAL");
    return {
      id: "global-fallback",
      tenantId: ctx.tenantId,
      orgId: ctx.orgId,
      countryCode: "GLOBAL",
      region: null,
      businessDomain: businessDomain as never,
      version: 0,
      profile: fallbackProfile,
      active: false,
      createdAt: new Date(0),
    };
  }
  return config;
}

export async function bindAgentToJurisdiction(
  tx: TxClient,
  ctx: JurisdictionContext,
  agentId: string,
  jurisdictionConfigId: string,
): Promise<AgentJurisdictionBindingView> {
  validateContext(ctx);
  if (!UUID_RE.test(agentId ?? "")) {
    throw new MalformedJurisdictionConfigError("Invalid agentId.");
  }
  if (!UUID_RE.test(jurisdictionConfigId ?? "")) {
    throw new JurisdictionConfigNotFoundError("Invalid jurisdictionConfigId.");
  }
  const config = await getJurisdictionConfig(tx, jurisdictionConfigId);
  if (!config) throw new JurisdictionConfigNotFoundError("Jurisdiction config not found.");
  const binding = await createAgentBinding(tx, {
    tenantId: ctx.tenantId,
    orgId: ctx.orgId,
    agentId,
    jurisdictionConfigId,
  });
  await emitJurisdictionEvent(tx, {
    tenantId: ctx.tenantId,
    jurisdictionConfigId,
    type: "jurisdiction.agent.bound",
    payload: { agentId, jurisdictionConfigId },
  });
  return binding;
}

export async function declareTaskJurisdiction(
  tx: TxClient,
  ctx: JurisdictionContext,
  taskId: string,
  jurisdictionConfigId: string,
): Promise<TaskJurisdictionRefView> {
  validateContext(ctx);
  if (!UUID_RE.test(taskId ?? "")) throw new MalformedJurisdictionConfigError("Invalid taskId.");
  if (!UUID_RE.test(jurisdictionConfigId ?? "")) {
    throw new JurisdictionConfigNotFoundError("Invalid jurisdictionConfigId.");
  }
  const config = await getJurisdictionConfig(tx, jurisdictionConfigId);
  if (!config) throw new JurisdictionConfigNotFoundError("Jurisdiction config not found.");
  return createTaskJurisdictionRef(tx, {
    tenantId: ctx.tenantId,
    orgId: ctx.orgId,
    taskId,
    jurisdictionConfigId,
  });
}

export {
  listJurisdictionConfigs,
  listAgentBindings,
  getTaskJurisdictionRef,
  listJurisdictionEvents,
};

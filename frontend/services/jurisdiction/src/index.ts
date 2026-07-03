/**
 * @optimora/jurisdiction — Jurisdiction / Compliance Configuration Foundation (E9 Jurisdiction).
 *
 * ARCHITECTURE RULE: Finance/CA agent must NEVER assume one country by default.
 * Always require explicit jurisdiction context or use GLOBAL fallback with disclaimer.
 *
 * Config-driven, versioned, tenant-aware, fail-closed. No live tax law logic.
 * No government filing integrations. No paid APIs.
 */
export const PACKAGE_NAME = "@optimora/jurisdiction" as const;

export {
  createConfig,
  getConfig,
  getActiveJurisdiction,
  bindAgentToJurisdiction,
  declareTaskJurisdiction,
  listJurisdictionConfigs,
  listAgentBindings,
  getTaskJurisdictionRef,
  listJurisdictionEvents,
} from "./service.js";
export { JURISDICTION_PROFILES, resolveProfile } from "./profiles.js";
export {
  COUNTRY_CODES,
  BUSINESS_DOMAINS,
  type CountryCode,
  type BusinessDomain,
  type JurisdictionProfile,
  type JurisdictionContext,
  type CreateJurisdictionConfigInput,
  type JurisdictionConfigView,
  type AgentJurisdictionBindingView,
  type TaskJurisdictionRefView,
  JurisdictionError,
  InvalidJurisdictionContextError,
  JurisdictionConfigNotFoundError,
  InvalidCountryCodeError,
  InvalidBusinessDomainError,
  UnauthorizedJurisdictionAccessError,
  MalformedJurisdictionConfigError,
} from "./types.js";

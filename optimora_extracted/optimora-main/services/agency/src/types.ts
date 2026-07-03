export const SUPPORTED_LOCALES = [
  "en-US", "en-GB", "en-CA", "en-IN",
  "fr-CA", "fr-FR",
  "de-DE", "es-ES", "pt-BR",
] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const SUPPORTED_CURRENCIES = [
  "USD", "CAD", "GBP", "INR", "EUR", "AUD", "SGD",
] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const AGENCY_MODULES = [
  "runtime", "memory", "tools", "integrations",
  "financeAgent", "salesAgent", "supportAgent", "reporting",
] as const;
export type AgencyModule = (typeof AGENCY_MODULES)[number];

export const CLIENT_WORKSPACE_STATUSES = ["pending", "active", "suspended"] as const;
export type ClientWorkspaceStatus = (typeof CLIENT_WORKSPACE_STATUSES)[number];

export const ALLOWED_CLIENT_REGIONS = [
  "IN", "US", "CA", "GB", "AU", "SG", "EU", "GLOBAL",
] as const;
export type AllowedClientRegion = (typeof ALLOWED_CLIENT_REGIONS)[number];

// ISO 3166-2 subdivision prefix pattern: XX-YYY
const REGION_RE = /^[A-Z]{2}-[A-Z0-9]{1,3}$/;

export function isValidRegion(region: string): boolean {
  return REGION_RE.test(region);
}

export interface AgencyContext {
  tenantId: string;
  orgId: string;
  actorId: string;
}

export interface CreateAgencyProfileInput {
  agencyName: string;
  brandName: string;
  logoUrl?: string;
  accentColor?: string;
  supportEmail?: string;
  defaultLocale?: SupportedLocale;
  defaultCurrency?: SupportedCurrency;
  allowedClientRegions?: AllowedClientRegion[];
  enabledModules?: AgencyModule[];
  whiteLabelEnabled?: boolean;
}

export interface UpdateAgencyProfileInput {
  agencyName?: string;
  brandName?: string;
  logoUrl?: string;
  accentColor?: string;
  supportEmail?: string;
  defaultLocale?: SupportedLocale;
  defaultCurrency?: SupportedCurrency;
  allowedClientRegions?: AllowedClientRegion[];
  enabledModules?: AgencyModule[];
  whiteLabelEnabled?: boolean;
}

export interface JurisdictionDefaults {
  countryCode?: string;
  businessDomain?: string;
}

export interface CreateClientWorkspaceInput {
  clientName: string;
  industry?: string;
  countryCode?: string;
  region?: string;
  jurisdictionDefaults?: JurisdictionDefaults;
  enabledAgents?: string[];
  enabledModules?: AgencyModule[];
  status?: ClientWorkspaceStatus;
}

export interface UpdateClientWorkspaceInput {
  clientName?: string;
  industry?: string;
  countryCode?: string;
  region?: string;
  jurisdictionDefaults?: JurisdictionDefaults;
  enabledAgents?: string[];
  enabledModules?: AgencyModule[];
  status?: ClientWorkspaceStatus;
}

export interface FeatureFlagsInput {
  runtime?: boolean;
  memory?: boolean;
  tools?: boolean;
  integrations?: boolean;
  financeAgent?: boolean;
  salesAgent?: boolean;
  supportAgent?: boolean;
  reporting?: boolean;
}

export interface AgencyProfileView {
  id: string;
  tenantId: string;
  agencyName: string;
  brandName: string;
  logoUrl: string | null;
  accentColor: string | null;
  supportEmail: string | null;
  defaultLocale: string;
  defaultCurrency: string;
  allowedClientRegions: string[];
  enabledModules: AgencyModule[];
  whiteLabelEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientWorkspaceView {
  id: string;
  tenantId: string;
  agencyOrgId: string;
  clientName: string;
  industry: string | null;
  countryCode: string;
  region: string | null;
  jurisdictionDefaults: JurisdictionDefaults;
  enabledAgents: string[];
  enabledModules: string[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlagsView {
  id: string;
  tenantId: string;
  orgId: string;
  clientWorkspaceId: string | null;
  runtime: boolean;
  memory: boolean;
  tools: boolean;
  integrations: boolean;
  financeAgent: boolean;
  salesAgent: boolean;
  supportAgent: boolean;
  reporting: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --- Error hierarchy ---

export class AgencyError extends Error {}
export class InvalidAgencyContextError extends AgencyError {}
export class AgencyProfileNotFoundError extends AgencyError {}
export class AgencyProfileAlreadyExistsError extends AgencyError {}
export class ClientWorkspaceNotFoundError extends AgencyError {}
export class UnauthorizedAgencyAccessError extends AgencyError {}
export class MalformedAgencyConfigError extends AgencyError {}
export class InvalidLocaleError extends AgencyError {}
export class InvalidCurrencyError extends AgencyError {}
export class InvalidClientRegionError extends AgencyError {}
export class InvalidModuleError extends AgencyError {}
export class InvalidWorkspaceStatusError extends AgencyError {}

/**
 * Jurisdiction / Compliance Configuration Foundation types (E9 Jurisdiction).
 *
 * ARCHITECTURE RULE: The finance/CA agent must NEVER assume one country by default.
 * It must always require an explicit jurisdiction context OR receive a safe generic
 * fallback (GLOBAL) with a compliance disclaimer attached. Fail closed on missing
 * or invalid jurisdiction.
 *
 * No live tax law logic here. All rules are config-driven and versioned.
 * No government filing integrations. No paid APIs. No hardcoded tax calculations.
 */

export const COUNTRY_CODES = ["IN", "US", "CA", "GB", "GLOBAL"] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export const BUSINESS_DOMAINS = [
  "accounting",
  "bookkeeping",
  "tax_prep",
  "payroll",
  "invoicing",
  "compliance",
  "financial_reporting",
] as const;
export type BusinessDomain = (typeof BUSINESS_DOMAINS)[number];

/**
 * Immutable jurisdiction profile snapshot stored alongside each config record.
 * All fields config-driven; no live tax rates or law logic.
 */
export interface JurisdictionProfile {
  countryCode: CountryCode;
  countryName: string;
  currency: string;
  /** ISO 4217 currency code (e.g. "INR", "USD", "CAD", "GBP"). */
  currencyCode: string;
  /** Fiscal year start as MM-DD (e.g. "04-01" for India, "01-01" for US). */
  fiscalYearStart: string;
  /** Fiscal year end as MM-DD. */
  fiscalYearEnd: string;
  /** Labels for tax identifiers (e.g. {primary:"PAN", employer:"TAN", gst:"GSTIN"}). */
  taxIdentifierLabels: Record<string, string>;
  /** Safe compliance disclaimer the CA agent must surface to users. */
  complianceDisclaimer: string;
  /** Supported document types for this jurisdiction. */
  documentTypes: string[];
  /** Reporting period labels (e.g. ["Q1","Q2","Q3","Q4"] or ["Annual"]). */
  reportingPeriods: string[];
  /** Names of actions that require human approval under this jurisdiction. */
  approvalRequirements: string[];
  /** Data retention class (e.g. "7-year", "10-year", "5-year"). */
  dataRetentionClass: string;
  /** Agent capability keys permitted in this jurisdiction. */
  allowedAgentCapabilities: string[];
  /** Action keys forbidden in this jurisdiction. */
  restrictedActions: string[];
}

export interface JurisdictionContext {
  tenantId: string;
  orgId: string;
  actorId: string;
}

export interface CreateJurisdictionConfigInput {
  countryCode: CountryCode;
  /** Optional sub-national region/state/province (e.g. "CA-ON", "US-CA", "IN-MH"). */
  region?: string | null;
  businessDomain: BusinessDomain;
  /** Optional overrides merged on top of the base country profile. */
  profileOverrides?: Partial<JurisdictionProfile>;
}

export interface JurisdictionConfigView {
  id: string;
  tenantId: string;
  orgId: string;
  countryCode: CountryCode;
  region: string | null;
  businessDomain: BusinessDomain;
  version: number;
  profile: JurisdictionProfile;
  active: boolean;
  createdAt: Date;
}

export interface AgentJurisdictionBindingView {
  id: string;
  tenantId: string;
  orgId: string;
  agentId: string;
  jurisdictionConfigId: string;
  createdAt: Date;
}

export interface TaskJurisdictionRefView {
  id: string;
  tenantId: string;
  orgId: string;
  taskId: string;
  jurisdictionConfigId: string;
  createdAt: Date;
}

export class JurisdictionError extends Error {}
export class InvalidJurisdictionContextError extends JurisdictionError {}
export class JurisdictionConfigNotFoundError extends JurisdictionError {}
export class InvalidCountryCodeError extends JurisdictionError {}
export class InvalidBusinessDomainError extends JurisdictionError {}
export class UnauthorizedJurisdictionAccessError extends JurisdictionError {}
export class MalformedJurisdictionConfigError extends JurisdictionError {}

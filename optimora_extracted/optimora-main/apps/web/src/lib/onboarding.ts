/** Onboarding wizard state types and constants. */

export const STEPS = [
  "agency-profile",
  "branding",
  "client-workspace",
  "jurisdiction",
  "modules",
  "plan",
  "review",
] as const;
export type OnboardingStep = (typeof STEPS)[number];

export interface AgencyProfileData {
  agencyName: string;
  supportEmail: string;
}

export interface BrandingData {
  brandName: string;
  accentColor: string;
  logoUrl: string;
  whiteLabelEnabled: boolean;
}

export interface ClientWorkspaceData {
  clientName: string;
  industry: string;
}

export interface JurisdictionData {
  countryCode: string;
  region: string;
  allowedClientRegions: string[];
}

export interface ModulesData {
  enabledModules: string[];
  enabledAgents: string[];
}

export interface PlanData {
  planKey: string;
}

export interface OnboardingState {
  agencyProfile: AgencyProfileData;
  branding: BrandingData;
  clientWorkspace: ClientWorkspaceData;
  jurisdiction: JurisdictionData;
  modules: ModulesData;
  plan: PlanData;
}

export const INITIAL_STATE: OnboardingState = {
  agencyProfile: { agencyName: "", supportEmail: "" },
  branding: { brandName: "", accentColor: "#4f46e5", logoUrl: "", whiteLabelEnabled: false },
  clientWorkspace: { clientName: "", industry: "" },
  jurisdiction: { countryCode: "GLOBAL", region: "", allowedClientRegions: ["GLOBAL"] },
  modules: { enabledModules: ["runtime", "memory"], enabledAgents: [] },
  plan: { planKey: "growth" },
};

export const JURISDICTION_OPTIONS = [
  { code: "IN",     label: "India",          locale: "en-IN", currency: "INR", region: "IN" },
  { code: "US",     label: "United States",  locale: "en-US", currency: "USD", region: "US" },
  { code: "CA",     label: "Canada",         locale: "en-CA", currency: "CAD", region: "CA" },
  { code: "GB",     label: "United Kingdom", locale: "en-GB", currency: "GBP", region: "GB" },
  { code: "AU",     label: "Australia",      locale: "en-US", currency: "AUD", region: "AU" },
  { code: "GLOBAL", label: "Global (generic — uses safe jurisdiction fallback)", locale: "en-US", currency: "USD", region: "GLOBAL" },
] as const;

export const MODULE_OPTIONS = [
  { key: "runtime",      label: "Runtime",      description: "Core agent execution engine." },
  { key: "memory",       label: "Memory",       description: "Long-term agent memory and context." },
  { key: "tools",        label: "Tools",        description: "Tool invocation and governance." },
  { key: "integrations", label: "Integrations", description: "External connector integrations." },
  { key: "financeAgent", label: "Finance Agent", description: "AI-assisted financial analysis. Always requires explicit jurisdiction context — never assumes a single country. A safe generic disclaimer is used when jurisdiction is 'GLOBAL'." },
  { key: "salesAgent",   label: "Sales Agent",  description: "AI-assisted sales and CRM workflows." },
  { key: "supportAgent", label: "Support Agent", description: "AI-assisted customer support." },
  { key: "reporting",    label: "Reporting",    description: "Usage and outcome reporting." },
] as const;

export const PLAN_OPTIONS = [
  { key: "free",       label: "Free",       price: "$0/mo",   description: "1 workspace, 2 agents, 100 tasks/mo." },
  { key: "starter",    label: "Starter",    price: "$49/mo",  description: "5 workspaces, 10 agents." },
  { key: "growth",     label: "Growth",     price: "$149/mo", description: "25 workspaces, 50 agents, Finance + Reporting." },
  { key: "agency",     label: "Agency",     price: "$399/mo", description: "Unlimited workspaces, white-label, all modules." },
  { key: "enterprise", label: "Enterprise", price: "Custom",  description: "Unlimited everything. Dedicated support." },
] as const;

export const INDUSTRIES = [
  "Financial Services", "Accounting & Tax", "Legal", "Healthcare",
  "Real Estate", "E-commerce", "Technology", "Consulting", "Other",
];

/** Validate agency profile step — returns error string or null */
export function validateAgencyProfile(d: AgencyProfileData): string | null {
  if (!d.agencyName.trim()) return "Agency name is required.";
  if (d.agencyName.trim().length < 2) return "Agency name must be at least 2 characters.";
  if (d.supportEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.supportEmail)) return "Invalid support email.";
  return null;
}

/** Validate branding step */
export function validateBranding(d: BrandingData): string | null {
  if (!d.brandName.trim()) return "Brand name is required.";
  if (d.accentColor && !/^#[0-9a-fA-F]{6}$/.test(d.accentColor)) return "Accent color must be a valid hex color (e.g. #4f46e5).";
  return null;
}

/** Validate client workspace step */
export function validateClientWorkspace(d: ClientWorkspaceData): string | null {
  if (!d.clientName.trim()) return "Client workspace name is required.";
  return null;
}

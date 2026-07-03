/**
 * Industry Pack icon registry (T-26.1).
 * Single source of truth for icon metadata used across:
 *   - Onboarding industry selector
 *   - Run Agent agent cards
 *   - Dashboard module cards
 *   - Industry Pack catalog
 *
 * Design system rules:
 *   - All icon containers: h-10 w-10, rounded-xl
 *   - Icon size: h-5 w-5 (20px), stroke-width 1.5
 *   - Fill style: none (outline/stroke only) — matches Lucide defaults
 *   - Background: light tinted (bg-{color}-50 or bg-{color}-100)
 *   - Icon color: text-{color}-600 (readable, not saturated)
 *   - No emoji. No gradient blocks. Accent gradients in container bg only when specified.
 *   - Orange and purple: accent use only (never primary)
 *   - Semantic color logic: finances=emerald, legal=slate, health=rose,
 *     operations=amber, sales=brand/indigo, support=sky, research=violet,
 *     marketing=pink, ecommerce=cyan, real-estate=teal, recruitment=orange(light), warehouse=stone
 */

export type IndustryKey =
  | "financial-services"
  | "accounting-tax"
  | "legal"
  | "healthcare"
  | "real-estate"
  | "e-commerce"
  | "technology"
  | "consulting"
  | "sales"
  | "support"
  | "research"
  | "marketing-agency"
  | "operations"
  | "recruitment"
  | "warehouse"
  | "other";

export interface IndustryIconMeta {
  key: IndustryKey;
  label: string;
  /** Lucide icon name — must be imported separately */
  lucideIcon: string;
  /** Tailwind bg class for the icon container */
  bgClass: string;
  /** Tailwind text class for the icon */
  iconClass: string;
  /** Short description used in UI tooltips / aria-label */
  description: string;
}

export const INDUSTRY_ICON_REGISTRY: IndustryIconMeta[] = [
  {
    key: "financial-services",
    label: "Financial Services",
    lucideIcon: "TrendingUp",
    bgClass: "bg-emerald-50",
    iconClass: "text-emerald-600",
    description: "Investment, banking, and wealth management",
  },
  {
    key: "accounting-tax",
    label: "Accounting & Tax",
    lucideIcon: "Calculator",
    bgClass: "bg-emerald-50",
    iconClass: "text-emerald-700",
    description: "Accounting, bookkeeping, GST/VAT, tax compliance",
  },
  {
    key: "legal",
    label: "Legal",
    lucideIcon: "Scale",
    bgClass: "bg-slate-100",
    iconClass: "text-slate-600",
    description: "Law firms, compliance, contracts",
  },
  {
    key: "healthcare",
    label: "Healthcare",
    lucideIcon: "HeartPulse",
    bgClass: "bg-rose-50",
    iconClass: "text-rose-600",
    description: "Clinics, hospitals, medical practices",
  },
  {
    key: "real-estate",
    label: "Real Estate",
    lucideIcon: "Building2",
    bgClass: "bg-teal-50",
    iconClass: "text-teal-600",
    description: "Property, lettings, and mortgage agencies",
  },
  {
    key: "e-commerce",
    label: "E-commerce",
    lucideIcon: "ShoppingBag",
    bgClass: "bg-cyan-50",
    iconClass: "text-cyan-600",
    description: "Online retail, DTC brands, marketplaces",
  },
  {
    key: "technology",
    label: "Technology",
    lucideIcon: "Cpu",
    bgClass: "bg-indigo-50",
    iconClass: "text-indigo-600",
    description: "SaaS, software, and tech companies",
  },
  {
    key: "consulting",
    label: "Consulting",
    lucideIcon: "Lightbulb",
    bgClass: "bg-amber-50",
    iconClass: "text-amber-600",
    description: "Management consulting and advisory",
  },
  {
    key: "sales",
    label: "Sales",
    lucideIcon: "Target",
    bgClass: "bg-indigo-50",
    iconClass: "text-indigo-600",
    description: "Sales development, CRM, pipeline management",
  },
  {
    key: "support",
    label: "Support",
    lucideIcon: "MessageCircle",
    bgClass: "bg-sky-50",
    iconClass: "text-sky-600",
    description: "Customer support and ticket management",
  },
  {
    key: "research",
    label: "Research",
    lucideIcon: "Microscope",
    bgClass: "bg-violet-50",
    iconClass: "text-violet-600",
    description: "Market research, analysis, and intelligence",
  },
  {
    key: "marketing-agency",
    label: "Marketing Agency",
    lucideIcon: "Megaphone",
    bgClass: "bg-pink-50",
    iconClass: "text-pink-600",
    description: "Digital marketing, content, and growth",
  },
  {
    key: "operations",
    label: "Operations",
    lucideIcon: "Settings2",
    bgClass: "bg-amber-50",
    iconClass: "text-amber-700",
    description: "Process automation and business operations",
  },
  {
    key: "recruitment",
    label: "Recruitment",
    lucideIcon: "Users",
    bgClass: "bg-orange-50",
    iconClass: "text-orange-600",
    description: "Talent acquisition and HR agencies",
  },
  {
    key: "warehouse",
    label: "Warehouse & Logistics",
    lucideIcon: "Warehouse",
    bgClass: "bg-stone-100",
    iconClass: "text-stone-600",
    description: "Supply chain, warehousing, and distribution",
  },
  {
    key: "other",
    label: "Other",
    lucideIcon: "Briefcase",
    bgClass: "bg-gray-100",
    iconClass: "text-gray-500",
    description: "General business use",
  },
];

/** Agent-role icon mapping — used in agent cards, run panel, sidebar */
export type AgentRoleKey = "sales" | "support" | "finance-ca" | "research" | "default";

export interface AgentIconMeta {
  key: AgentRoleKey;
  lucideIcon: string;
  bgClass: string;
  iconClass: string;
  label: string;
}

export const AGENT_ICON_REGISTRY: AgentIconMeta[] = [
  {
    key: "sales",
    lucideIcon: "Target",
    bgClass: "bg-indigo-50",
    iconClass: "text-indigo-600",
    label: "Sales Agent",
  },
  {
    key: "support",
    lucideIcon: "MessageCircle",
    bgClass: "bg-sky-50",
    iconClass: "text-sky-600",
    label: "Support Agent",
  },
  {
    key: "finance-ca",
    lucideIcon: "Calculator",
    bgClass: "bg-emerald-50",
    iconClass: "text-emerald-700",
    label: "Finance / CA Agent",
  },
  {
    key: "research",
    lucideIcon: "Microscope",
    bgClass: "bg-violet-50",
    iconClass: "text-violet-600",
    label: "Research Agent",
  },
  {
    key: "default",
    lucideIcon: "Bot",
    bgClass: "bg-gray-100",
    iconClass: "text-gray-500",
    label: "Agent",
  },
];

/** Lookup helpers */
export function getIndustryMeta(key: string): IndustryIconMeta {
  return INDUSTRY_ICON_REGISTRY.find((i) => i.key === key) ?? INDUSTRY_ICON_REGISTRY.find((i) => i.key === "other")!;
}

export function getAgentIconMeta(key: string): AgentIconMeta {
  return AGENT_ICON_REGISTRY.find((a) => a.key === key) ?? AGENT_ICON_REGISTRY.find((a) => a.key === "default")!;
}

/** Map free-text industry labels to registry keys (for onboarding selector) */
export const INDUSTRY_LABEL_TO_KEY: Record<string, IndustryKey> = {
  "Financial Services": "financial-services",
  "Accounting & Tax": "accounting-tax",
  "Legal": "legal",
  "Healthcare": "healthcare",
  "Real Estate": "real-estate",
  "E-commerce": "e-commerce",
  "Technology": "technology",
  "Consulting": "consulting",
  "Sales": "sales",
  "Support": "support",
  "Research": "research",
  "Marketing Agency": "marketing-agency",
  "Operations": "operations",
  "Recruitment": "recruitment",
  "Warehouse & Logistics": "warehouse",
  "Other": "other",
};

export const AGENT_DEMO_KEY_TO_ROLE: Record<string, AgentRoleKey> = {
  "sales-agent": "sales",
  "support-agent": "support",
  "finance-ca-agent": "finance-ca",
  "research-agent": "research",
};

import { AppSidebar } from "@/components/ui/app-sidebar";
import {
  Search, Filter, Plus, Package, Zap, LayoutTemplate, Star,
  ChevronDown, CheckCircle2, BarChart2, Users,
  TrendingUp, ShoppingCart, Building2,
  Scale, Settings2, Palette, Megaphone,
  ExternalLink, X,
} from "lucide-react";

export const metadata = {
  title: "Industry Packs — Optimora",
  description: "Pre-built automations, templates, and integrations tailored to your industry.",
};

// ── Data ──────────────────────────────────────────────────────────────────────
const STATS = [
  { label: "Active Packs", value: "12", icon: Package, iconBg: "bg-purple-50", iconColor: "text-[#7C3AED]" },
  { label: "Automations Running", value: "86", icon: Zap, iconBg: "bg-orange-50", iconColor: "text-orange-600" },
  { label: "Templates", value: "142", icon: LayoutTemplate, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
  { label: "Team Usage", value: "78%", icon: Users, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
];

const PACKS = [
  {
    id: "finance",
    icon: BarChart2,
    gradient: "from-blue-500 to-indigo-600",
    title: "Finance & CA",
    desc: "GST filing, invoice processing, ledger reconciliation, and audit trails.",
    status: "Installed",
    statusColor: "status-active",
    automations: 18,
    category: "Finance",
    active: true,
    rating: 4.9,
    templates: 24,
    integrations: 8,
  },
  {
    id: "marketing",
    icon: Megaphone,
    gradient: "from-pink-500 to-rose-600",
    title: "Marketing Agency",
    desc: "Campaign management, client reporting, and lead nurturing workflows.",
    status: "Popular",
    statusColor: "status-running",
    automations: 22,
    category: "Marketing",
    rating: 4.8,
    templates: 31,
    integrations: 12,
  },
  {
    id: "content",
    icon: Palette,
    gradient: "from-purple-500 to-violet-600",
    title: "Content Creation",
    desc: "AI-powered content generation, scheduling, and distribution pipelines.",
    status: "New",
    statusColor: "rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600",
    automations: 14,
    category: "Content",
    rating: 4.7,
    templates: 18,
    integrations: 9,
  },
  {
    id: "sales",
    icon: TrendingUp,
    gradient: "from-orange-500 to-amber-500",
    title: "Sales",
    desc: "Lead qualification, CRM sync, follow-up sequences, and pipeline management.",
    status: "Installed",
    statusColor: "status-active",
    automations: 20,
    category: "Sales",
    rating: 4.9,
    templates: 28,
    integrations: 10,
  },
  {
    id: "hr",
    icon: Users,
    gradient: "from-teal-500 to-emerald-500",
    title: "HR",
    desc: "Onboarding automation, leave management, payroll prep, and compliance checks.",
    status: "Available",
    statusColor: "status-inactive",
    automations: 12,
    category: "HR",
    rating: 4.6,
    templates: 16,
    integrations: 6,
  },
  {
    id: "ecommerce",
    icon: ShoppingCart,
    gradient: "from-rose-500 to-pink-600",
    title: "E-commerce",
    desc: "Order management, inventory sync, customer support, and return workflows.",
    status: "Popular",
    statusColor: "status-running",
    automations: 25,
    category: "E-commerce",
    rating: 4.8,
    templates: 35,
    integrations: 15,
  },
  {
    id: "warehouse",
    icon: Building2,
    gradient: "from-slate-500 to-gray-600",
    title: "Warehouse",
    desc: "Inventory tracking, shipment scheduling, supplier communication, and QC workflows.",
    status: "Available",
    statusColor: "status-inactive",
    automations: 10,
    category: "Warehouse",
    rating: 4.5,
    templates: 14,
    integrations: 5,
  },
  {
    id: "legal",
    icon: Scale,
    gradient: "from-amber-500 to-yellow-500",
    title: "Legal",
    desc: "Contract review, deadline tracking, document generation, and compliance monitoring.",
    status: "New",
    statusColor: "rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600",
    automations: 8,
    category: "Legal",
    rating: 4.7,
    templates: 12,
    integrations: 4,
  },
  {
    id: "operations",
    icon: Settings2,
    gradient: "from-sky-500 to-blue-600",
    title: "Operations",
    desc: "SOP automation, vendor management, task routing, and approval workflows.",
    status: "Installed",
    statusColor: "status-active",
    automations: 16,
    category: "Operations",
    rating: 4.8,
    templates: 22,
    integrations: 9,
  },
];

const FINANCE_AUTOMATIONS = [
  "GST Return Filing — Auto-fetch and file returns",
  "Invoice Processing — Extract, validate, post to ledger",
  "Bank Reconciliation — Match statements automatically",
  "TDS Compliance — Calculate, deduct, and file TDS",
  "Expense Categorization — AI-powered classification",
  "Audit Trail Generation — Create comprehensive logs",
];

const FINANCE_POPULAR = [
  { name: "GST Return Filing", runs: "2.1K runs/mo", time: "4.2h saved" },
  { name: "Invoice OCR + Posting", runs: "1.8K runs/mo", time: "6.1h saved" },
  { name: "Bank Reconciliation", runs: "950 runs/mo", time: "3.5h saved" },
];

// ── Pack Card ─────────────────────────────────────────────────────────────────
function PackCard({ pack, isSelected }: { pack: typeof PACKS[0]; isSelected?: boolean }) {
  const Icon = pack.icon;
  return (
    <div
      className={`op-card p-4 cursor-pointer hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-200 ${
        isSelected ? "ring-2 ring-[#7C3AED] ring-offset-1" : ""
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${pack.gradient}`}
        >
          <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-bold text-[#0F1020] truncate">{pack.title}</h3>
          </div>
          <span
            className={
              pack.statusColor.startsWith("status-")
                ? pack.statusColor
                : "rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600"
            }
          >
            {pack.status}
          </span>
        </div>
      </div>
      <p className="text-[12px] text-[#6B7280] leading-relaxed mb-3">{pack.desc}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Zap className="h-3.5 w-3.5 text-orange-500" />
          <span className="text-[11px] font-semibold text-[#6B7280]">{pack.automations} automations</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="text-[11px] text-[#6B7280]">{pack.rating}</span>
        </div>
      </div>
    </div>
  );
}

// ── Right Detail Panel ────────────────────────────────────────────────────────
function FinanceDetailPanel() {
  return (
    <div className="w-72 flex-shrink-0 border-l border-[#EAEAF2] bg-white flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-[#EAEAF2]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <BarChart2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#0F1020]">Finance & CA</p>
            <span className="status-active">Installed</span>
          </div>
        </div>
        <X className="h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Description */}
        <p className="text-[12px] text-[#6B7280] leading-relaxed">
          Complete financial automation suite for CA firms and finance teams. Handles GST, invoicing, reconciliation, and compliance.
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Automations", value: "18" },
            { label: "Templates", value: "24" },
            { label: "Integrations", value: "8" },
            { label: "Rating", value: "4.9 ★" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-[#FBFAFF] border border-[#EAEAF2] p-2.5 text-center">
              <p className="text-base font-bold text-[#0F1020]">{s.value}</p>
              <p className="text-[10px] text-[#6B7280]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Included automations */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
            Included
          </p>
          <ul className="space-y-1.5">
            {FINANCE_AUTOMATIONS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[12px] text-[#6B7280]">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Popular automations */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
            Popular Automations
          </p>
          <div className="space-y-2">
            {FINANCE_POPULAR.map((a) => (
              <div key={a.name} className="rounded-xl border border-[#EAEAF2] p-2.5">
                <p className="text-[12px] font-semibold text-[#0F1020] mb-0.5">{a.name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">{a.runs}</span>
                  <span className="text-[10px] font-semibold text-emerald-600">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="border-t border-[#EAEAF2] p-4 space-y-2">
        <button
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)" }}
        >
          Open Pack
        </button>
        <button className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#EAEAF2] py-2.5 text-sm font-medium text-[#6B7280] hover:bg-gray-50 transition-colors">
          <ExternalLink className="h-3.5 w-3.5" />
          View Documentation
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function IndustryPacksPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#FBFAFF]">
      <AppSidebar variant="default" activeItem="Industry Packs" />

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          {/* Top bar */}
          <div className="sticky top-0 z-10 border-b border-[#EAEAF2] bg-white/95 backdrop-blur-sm px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[#0F1020]">Industry Packs</h1>
                <p className="text-sm text-[#6B7280] mt-0.5">
                  Pre-built automations, templates, and integrations tailored to your industry.
                </p>
              </div>
              <button
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)" }}
              >
                <Plus className="h-4 w-4" />
                Create Custom Pack
              </button>
            </div>

            {/* Search + Filter */}
            <div className="flex items-center gap-3 mt-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search industry packs..."
                  className="op-input pl-9"
                />
              </div>
              <button className="flex items-center gap-2 rounded-xl border border-[#EAEAF2] bg-white px-4 py-2.5 text-sm font-medium text-[#6B7280] hover:bg-gray-50 transition-colors">
                <Filter className="h-4 w-4" />
                All Industries
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {STATS.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="op-card p-4 flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
                      <Icon className={`h-5 w-5 ${s.iconColor}`} strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#0F1020]">{s.value}</p>
                      <p className="text-[11px] text-[#6B7280] font-medium">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-[#EAEAF2]">
              {["All Packs", "Popular", "New", "Installed"].map((tab, i) => (
                <button
                  key={tab}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    i === 0
                      ? "border-[#7C3AED] text-[#7C3AED]"
                      : "border-transparent text-[#6B7280] hover:text-[#0F1020]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PACKS.map((pack) => (
                <PackCard key={pack.id} pack={pack} isSelected={pack.id === "finance"} />
              ))}
            </div>
          </div>
        </div>

        {/* Right detail panel */}
        <FinanceDetailPanel />
      </div>
    </div>
  );
}

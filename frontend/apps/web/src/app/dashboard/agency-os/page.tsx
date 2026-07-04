import {
  Users, Globe, BarChart3,
  DollarSign, Copy, Palette, ShieldCheck,
  CheckCircle2, Info, ArrowRight, Building2,
  TrendingUp, Package, Zap, Star, FileText,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { DemoBanner } from "@/components/ui/demo-banner";

const FEATURES = [
  {
    icon: Palette,
    title: "White-label branding",
    description: "Replace Optimora branding with your agency name, logo, and accent color. Clients see your brand — not ours.",
    status: "demo",
  },
  {
    icon: Users,
    title: "Client workspaces",
    description: "Each client gets an isolated workspace with their own agents, workflows, and data. Full tenant separation.",
    status: "demo",
  },
  {
    icon: Copy,
    title: "Pack reselling",
    description: "Resell any of the 13 industry packs to your clients. Set your own pricing on top of Optimora. Keep 100% of markup.",
    status: "demo",
  },
  {
    icon: BarChart3,
    title: "Client ROI reports",
    description: "Auto-generate branded ROI reports showing hours saved and value delivered — ready to send to clients monthly.",
    status: "demo",
  },
  {
    icon: Globe,
    title: "Client portal",
    description: "Give clients a read-only portal to see their agent activity and results — fully white-labelled under your domain.",
    status: "custom_setup",
  },
  {
    icon: ShieldCheck,
    title: "Agency admin controls",
    description: "Manage all client workspaces from a single admin view. Pause, configure, or add agents for any client.",
    status: "demo",
  },
];

const STATUS_COLORS: Record<string, string> = {
  demo: "bg-amber-100 text-amber-700",
  custom_setup: "bg-purple-100 text-purple-700",
  ready: "bg-emerald-100 text-emerald-700",
  requires_integration: "bg-blue-100 text-blue-700",
};
const STATUS_LABELS: Record<string, string> = {
  demo: "Sample Preview",
  custom_setup: "Custom Setup Required",
  ready: "Ready",
  requires_integration: "Requires Integration",
};

// Revenue calculator data (INR)
const CALC_ROWS = [
  { clients: 5,  packPrice: 15000, monthly: "₹75,000/mo",    annual: "₹9,00,000/yr" },
  { clients: 10, packPrice: 15000, monthly: "₹1,50,000/mo",  annual: "₹18,00,000/yr" },
  { clients: 20, packPrice: 15000, monthly: "₹3,00,000/mo",  annual: "₹36,00,000/yr" },
  { clients: 50, packPrice: 15000, monthly: "₹7,50,000/mo",  annual: "₹90,00,000/yr" },
];

const PARTNER_BENEFITS = [
  { icon: Star, label: "White-label licence", desc: "Your brand on everything — portal, reports, emails" },
  { icon: Package, label: "13 industry packs", desc: "Resell sales, HR, finance, ops packs at your pricing" },
  { icon: TrendingUp, label: "Recurring revenue", desc: "Monthly retainer model — predictable agency income" },
  { icon: FileText, label: "Client ROI reports", desc: "Auto-generated, branded reports every month" },
  { icon: ShieldCheck, label: "Tenant isolation", desc: "Full data separation — each client sees only their data" },
  { icon: Zap, label: "Instant deployment", desc: "Deploy a pack for a new client in under 10 minutes" },
];

// Sample client ROI report preview
const SAMPLE_ROI = [
  { workflow: "Lead Follow-up", runs: 34, hours: 28, value: "₹42,000" },
  { workflow: "Resume Screening", runs: 67, hours: 24, value: "₹36,000" },
  { workflow: "Client Reporting", runs: 3,  hours: 15, value: "₹22,500" },
  { workflow: "Support Triage", runs: 18, hours: 18, value: "₹27,000" },
];

export default function AgencyOSPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-1">Agency White-label Mode</p>
        <h1 className="text-2xl font-bold text-gray-900">Sell AI automation as your own product</h1>
        <p className="mt-1 text-sm text-gray-500">
          White-label Optimora, deploy industry packs for your clients, and charge your own pricing. Keep 100% of the markup.
        </p>
      </div>

      {/* Demo notice */}
      <DemoBanner
        message="Agency Mode features are shown in Sample Preview. Contact us to enable live white-label mode, client portals, and billing under your agency name."
      />

      {/* Hero positioning */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-7 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-2">Your agency proposition</p>
        <p className="text-xl font-bold leading-snug mb-3">
          &ldquo;We deploy a team of AI agents for your business. Guaranteed to save 30+ hours per week.&rdquo;
        </p>
        <p className="text-sm opacity-80 mb-6">
          You pitch it. You bill it. You keep the relationship. Optimora handles the infrastructure. You keep 100% of the markup.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/onboarding/agency"
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50 transition-colors"
          >
            Set up your agency
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/white-label-agency"
            className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
          >
            Learn more
          </Link>
        </div>
      </div>

      {/* Partner benefits */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Agency partner benefits</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PARTNER_BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.label} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                  <Icon className="h-4 w-4 text-indigo-600" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{b.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Features grid */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">What agency mode includes</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                    <Icon className="h-4 w-4 text-indigo-600" strokeWidth={1.75} />
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_COLORS[f.status])}>
                    {STATUS_LABELS[f.status]}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">{f.title}</h3>
                <p className="mt-1 text-xs text-gray-500">{f.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* How agencies resell industry packs */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">How to resell industry packs</h2>
        <div className="space-y-3">
          {[
            { step: 1, title: "Pick the right pack for your client", desc: "Choose from 13 industry packs — Sales, HR, Finance, Operations, Support, Real Estate, and more.", tag: "Ready" },
            { step: 2, title: "White-label the platform", desc: "Set your agency name, logo, and color scheme. Clients see your brand — not Optimora.", tag: "Sample Preview" },
            { step: 3, title: "Set up an isolated client workspace", desc: "Each client gets their own agents, workflows, and data — fully separated from other clients.", tag: "Sample Preview" },
            { step: 4, title: "Connect client's integrations", desc: "Wire up the client's CRM, email, or calendar. All integration requirements are shown upfront.", tag: "Requires Integration" },
            { step: 5, title: "Deploy and deliver ROI reports", desc: "Agents run, results accumulate. Auto-generate branded monthly ROI reports to justify your retainer.", tag: "Sample Preview" },
            { step: 6, title: "Scale — add more clients, more packs", desc: "Track your recurring revenue with the revenue calculator. Scale to 50+ clients without adding headcount.", tag: "Ready" },
          ].map((s) => {
            const tagColor = s.tag === "Ready" ? "bg-emerald-100 text-emerald-700"
              : s.tag === "Requires Integration" ? "bg-blue-100 text-blue-700"
              : "bg-amber-100 text-amber-700";
            return (
              <div key={s.step} className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  {s.step}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold", tagColor)}>{s.tag}</span>
                  </div>
                  <p className="text-xs text-gray-500">{s.desc}</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5 ml-auto" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue calculator */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-gray-900">Agency revenue calculator</h2>
          <span className="ml-2 text-xs text-gray-400">Based on ₹15,000/mo per client pack</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Active clients</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Pack price/mo</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Monthly revenue</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Annual revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {CALC_ROWS.map((row) => (
              <tr key={row.clients} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-semibold text-gray-900">{row.clients} clients</td>
                <td className="px-5 py-3 text-gray-600 text-right">₹{row.packPrice.toLocaleString()}</td>
                <td className="px-5 py-3 text-emerald-700 font-bold text-right">{row.monthly}</td>
                <td className="px-5 py-3 text-indigo-700 font-semibold text-right">{row.annual}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-3 bg-emerald-50 border-t border-emerald-100">
          <p className="text-xs text-emerald-800">
            <span className="font-semibold">Note:</span> Set your own pricing. Many agencies charge ₹20k–₹50k/mo for managed AI automation.
            Numbers above use ₹15k/mo as a conservative baseline.
          </p>
        </div>
      </div>

      {/* Sample client ROI report */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-gray-900">Sample client ROI report</h2>
          <span className="ml-auto rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold">Sample Data</span>
        </div>

        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">Apex Realty Pvt. Ltd.</p>
              <p className="text-xs text-gray-500">Real Estate Industry Pack · June 2026</p>
            </div>
            <span className="rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-xs font-semibold">Powered by Your Agency Name</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Workflow</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Runs</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Hours saved</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Est. value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {SAMPLE_ROI.map((row) => (
                <tr key={row.workflow} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-900 font-medium">{row.workflow}</td>
                  <td className="px-5 py-3 text-gray-600 text-right">{row.runs}</td>
                  <td className="px-5 py-3 text-gray-600 text-right">{row.hours}h</td>
                  <td className="px-5 py-3 text-emerald-700 font-semibold text-right">{row.value}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-emerald-50">
                <td className="px-5 py-3 text-sm font-bold text-gray-900">Total</td>
                <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right">122</td>
                <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right">85h</td>
                <td className="px-5 py-3 text-sm font-bold text-emerald-700 text-right">₹1,27,500</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            This report is auto-generated. Salary cost estimated at ₹1,500/hr. ROI figures are for demo purposes.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/onboarding/agency"
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
        >
          <Building2 className="h-4 w-4" />
          Set up your agency
        </Link>
        <Link
          href="/white-label-agency"
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Info className="h-4 w-4" />
          White-label overview
        </Link>
      </div>
    </div>
  );
}

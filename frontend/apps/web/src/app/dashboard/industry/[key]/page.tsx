import { getIndustryDashboard, getIndustryDeploymentState, getIndustryPackByKey } from "@/lib/automation-data";
import { statusLabel } from "@/lib/os-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";
import {
  Target, Flame, CalendarCheck, CheckCircle2, RotateCcw,
  Building2, BarChart2, Send, TrendingUp, Star,
  ShoppingCart, MessageCircle, FileText, UserCheck,
  Briefcase, ShieldAlert, Inbox, CreditCard, Truck,
  AlertTriangle, FileCheck, Bell, TrendingDown,
  RefreshCw, Home, Users, GraduationCap, Stethoscope, Layers,
  ChevronRight, ArrowLeft, Clock, Zap, Factory, MapPin,
  UtensilsCrossed, Heart, User, Link2, Package, AlertCircle, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/ui/demo-banner";
import { deployPackAction } from "../../packs/actions";

const ICON_MAP: Record<string, React.ElementType> = {
  Target, Flame, CalendarCheck, CheckCircle2, RotateCcw,
  Building2, BarChart2, Send, TrendingUp, Star,
  ShoppingCart, MessageCircle, FileText, UserCheck,
  Briefcase, ShieldAlert, Inbox, CreditCard, Truck,
  AlertTriangle, FileCheck, Bell, TrendingDown,
  RefreshCw, Home, Users, GraduationCap, Stethoscope, Layers,
  Clock, Factory, MapPin, UtensilsCrossed, Heart,
};

const PACK_ICON_MAP: Record<string, React.ElementType> = {
  Building2, Home, Users, GraduationCap, ShoppingCart,
  Stethoscope, Truck, Layers, CreditCard, Briefcase,
  UtensilsCrossed, Factory, MapPin,
};

const METRIC_COLOR_MAP: Record<string, { bg: string; icon: string }> = {
  indigo:  { bg: "bg-indigo-50",  icon: "text-indigo-600" },
  teal:    { bg: "bg-teal-50",    icon: "text-teal-600" },
  violet:  { bg: "bg-violet-50",  icon: "text-violet-600" },
  sky:     { bg: "bg-sky-50",     icon: "text-sky-600" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600" },
  orange:  { bg: "bg-orange-50",  icon: "text-orange-600" },
  rose:    { bg: "bg-rose-50",    icon: "text-rose-600" },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-600" },
  slate:   { bg: "bg-slate-50",   icon: "text-slate-600" },
  gray:    { bg: "bg-gray-50",    icon: "text-gray-600" },
  zinc:    { bg: "bg-zinc-50",    icon: "text-zinc-600" },
  pink:    { bg: "bg-pink-50",    icon: "text-pink-600" },
  teal2:   { bg: "bg-teal-50",    icon: "text-teal-600" },
  red:     { bg: "bg-red-50",     icon: "text-red-600" },
};

const PACK_COLOR_MAP: Record<string, { bg: string; icon: string; badge: string; hero: string; border: string }> = {
  indigo:  { bg: "bg-indigo-50",  icon: "text-indigo-600",  badge: "bg-indigo-600",  hero: "from-indigo-600 to-indigo-800",  border: "border-indigo-200" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", badge: "bg-emerald-600", hero: "from-emerald-600 to-emerald-800", border: "border-emerald-200" },
  violet:  { bg: "bg-violet-50",  icon: "text-violet-600",  badge: "bg-violet-600",  hero: "from-violet-600 to-violet-800",  border: "border-violet-200" },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-600",   badge: "bg-amber-600",   hero: "from-amber-500 to-amber-700",   border: "border-amber-200" },
  orange:  { bg: "bg-orange-50",  icon: "text-orange-600",  badge: "bg-orange-600",  hero: "from-orange-500 to-orange-700", border: "border-orange-200" },
  rose:    { bg: "bg-rose-50",    icon: "text-rose-600",    badge: "bg-rose-600",    hero: "from-rose-600 to-rose-800",    border: "border-rose-200" },
  sky:     { bg: "bg-sky-50",     icon: "text-sky-600",     badge: "bg-sky-600",     hero: "from-sky-600 to-sky-800",     border: "border-sky-200" },
  teal:    { bg: "bg-teal-50",    icon: "text-teal-600",    badge: "bg-teal-600",    hero: "from-teal-600 to-teal-800",   border: "border-teal-200" },
  slate:   { bg: "bg-slate-50",   icon: "text-slate-600",   badge: "bg-slate-700",   hero: "from-slate-600 to-slate-900",  border: "border-slate-300" },
  gray:    { bg: "bg-gray-50",    icon: "text-gray-600",    badge: "bg-gray-700",    hero: "from-gray-700 to-gray-900",   border: "border-gray-300" },
  zinc:    { bg: "bg-zinc-50",    icon: "text-zinc-600",    badge: "bg-zinc-700",    hero: "from-zinc-600 to-zinc-900",   border: "border-zinc-300" },
  pink:    { bg: "bg-pink-50",    icon: "text-pink-600",    badge: "bg-pink-600",    hero: "from-pink-600 to-pink-800",   border: "border-pink-200" },
};

const INTEGRATION_STATUS_MAP: Record<string, { badge: string; label: string }> = {
  "WhatsApp": { badge: "bg-purple-100 text-purple-700", label: "Custom Setup Required" },
  "LinkedIn": { badge: "bg-purple-100 text-purple-700", label: "Custom Setup Required" },
  "Shopify": { badge: "bg-purple-100 text-purple-700", label: "Custom Setup Required" },
  "ATS": { badge: "bg-blue-100 text-blue-700", label: "Requires Integration" },
  "CRM": { badge: "bg-blue-100 text-blue-700", label: "Requires Integration" },
  "Email": { badge: "bg-blue-100 text-blue-700", label: "Requires Integration" },
  "Google": { badge: "bg-blue-100 text-blue-700", label: "Requires Integration" },
  "CSV": { badge: "bg-emerald-100 text-emerald-700", label: "Available Now" },
  "Webhook": { badge: "bg-emerald-100 text-emerald-700", label: "Available Now" },
};

function getIntegrationStyle(name: string) {
  for (const [key, val] of Object.entries(INTEGRATION_STATUS_MAP)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return { badge: "bg-blue-100 text-blue-700", label: "Requires Integration" };
}

// Sample activity feed for pack demo (business name: Acme Pvt. Ltd.)
const DEMO_ACTIVITY = [
  { agent: "Lead Follow-up Agent", action: "followed up with 23 property leads", time: "2 min ago", status: "completed" },
  { agent: "Report Agent", action: "generated daily sales pipeline summary", time: "8 min ago", status: "completed" },
  { agent: "Outreach Agent", action: "drafted 5 prospect emails — awaiting approval", time: "15 min ago", status: "pending_approval" },
];

export default async function IndustryDashboardPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const session = await requireSession();
  const ctx = getAutomationContextFromSession(session);
  const [dash, pack, deploymentState] = await Promise.all([
    getIndustryDashboard(key),
    getIndustryPackByKey(key),
    getIndustryDeploymentState(ctx, key),
  ]);

  if (!dash || !pack) notFound();

  const PackIcon = PACK_ICON_MAP[pack.icon] ?? Building2;
  const pc = PACK_COLOR_MAP[pack.color] ?? PACK_COLOR_MAP.indigo;

  // Business outcomes bullets parsed from the string
  const outcomeBullets = [
    pack.businessOutcome,
    `Save ${pack.hoursSaved}+ hours per week across your team`,
    `Deploy in minutes — not months`,
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/packs" className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Industry Packs
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
        <span className="text-gray-900 font-medium">{pack.name}</span>
      </div>

      {/* Demo banner */}
      <DemoBanner message={deploymentState.deployed
        ? `"${pack.name} Pack" is deployed for this workspace with ${deploymentState.deployedWorkflowCount} workflow records.`
        : `"${pack.name} Pack" is running in Demo Mode for Acme Operations Ltd. All metrics are illustrative. Connect integrations to see live data.`
      } />

      {/* Hero — gradient with pack identity */}
      <div className={cn("rounded-2xl bg-gradient-to-br p-6 text-white", pc.hero)}>
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <PackIcon className="h-8 w-8 text-white" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Industry Pack</p>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                {statusLabel(pack.status)}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold">{pack.name} Industry Pack</h1>
            <p className="mt-1 text-base font-medium opacity-90">{pack.headline}</p>
            <p className="mt-1.5 text-sm opacity-70 italic">{pack.forWho}</p>
          </div>
        </div>

        {/* Key stats */}
        <div className="mt-6 flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-1.5 opacity-80">
            <Clock className="h-4 w-4" />
            <span className="font-bold text-white">{pack.hoursSaved}h</span>/week saved
          </div>
          <div className="flex items-center gap-1.5 opacity-80">
            <Zap className="h-4 w-4" />
            <span className="font-bold text-white">{pack.agents.length}</span> AI agents
          </div>
          <div className="flex items-center gap-1.5 opacity-80">
            <BarChart2 className="h-4 w-4" />
            <span className="font-bold text-white">{pack.workflows.length}</span> workflows
          </div>
          <div className="flex items-center gap-1.5 opacity-80">
            <Package className="h-4 w-4" />
            <span className="font-bold text-white">{pack.integrations.length}</span> integrations
          </div>
          <div className="flex items-center gap-1.5 opacity-80">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-bold text-white">{deploymentState.deployed ? "Deployed" : "Not deployed"}</span>
            {deploymentState.deployed ? `${deploymentState.deployedWorkflowCount} workflows` : "current workspace"}
          </div>
        </div>

        {/* CTA in hero */}
        <div className="mt-6 flex flex-wrap gap-3">
          <form action={deployPackAction}>
            <input type="hidden" name="packKey" value={pack.key} />
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-50 transition-colors shadow"
            >
              <Zap className="h-4 w-4 text-indigo-600" />
              {deploymentState.deployed ? "Redeploy Pack" : "Deploy Pack"}
            </button>
          </form>
          <Link
            href="/dashboard/workflows"
            className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
          >
            Browse workflows
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Who this is for + Business outcomes */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-bold text-gray-900">Who this pack is for</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{pack.forWho}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-gray-900">Business outcomes</h2>
          </div>
          <ul className="space-y-2">
            {outcomeBullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-gray-600">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500 mt-0.5" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ROI estimate */}
      <div className={cn("rounded-2xl border p-5", pc.bg, pc.border)}>
        <div className="flex items-center gap-2 mb-2">
          <Zap className={cn("h-4 w-4", pc.icon)} />
          <h2 className={cn("text-sm font-bold", pc.icon)}>ROI Estimate</h2>
          <span className="ml-auto rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold">Demo Estimate</span>
        </div>
        <p className={cn("text-sm font-medium leading-relaxed", pc.icon)}>{pack.roiEstimate}</p>
      </div>

      {/* KPI Metrics */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Live Dashboard Metrics</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {dash.metrics.map((m) => {
            const Icon = ICON_MAP[m.icon] ?? Target;
            const c = METRIC_COLOR_MAP[m.color] ?? METRIC_COLOR_MAP.indigo;
            return (
              <div key={m.label} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl mb-3", c.bg)}>
                  <Icon className={cn("h-4 w-4", c.icon)} strokeWidth={1.75} />
                </div>
                <p className="text-xl font-bold text-gray-900">{m.value}</p>
                <p className="text-xs font-medium text-gray-700 mt-0.5">{m.label}</p>
                {m.trend && <p className="text-[10px] text-gray-400 mt-0.5">{m.trend}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Workflows + Agents */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Workflows */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-bold text-gray-900">Workflows included</h3>
            <span className="ml-auto text-xs text-gray-400">{pack.workflows.length} total</span>
          </div>
          <div className="space-y-1.5">
            {pack.workflows.map((w, i) => (
              <div key={w} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                <span className={cn("flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white", pc.badge)}>
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700 flex-1 min-w-0">{w}</span>
                <Link href="/dashboard/workflows" className="text-[10px] text-indigo-600 hover:underline whitespace-nowrap flex-shrink-0">
                  View →
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Agents */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-bold text-gray-900">AI agents in this pack</h3>
            <span className="ml-auto text-xs text-gray-400">{pack.agents.length} agents</span>
          </div>
          <div className="space-y-1.5">
            {pack.agents.map((a) => (
              <div key={a} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                <div className={cn("h-2 w-2 rounded-full flex-shrink-0", pc.badge)} />
                <span className="text-sm text-gray-700 flex-1">{a}</span>
                <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[9px] font-bold flex-shrink-0">
                  Demo
                </span>
              </div>
            ))}
          </div>
          <Link href="/dashboard/agent-library" className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
            View full agent library <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Integration requirements */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-bold text-gray-900">Required integrations</h2>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {pack.integrations.map((intg) => {
            const style = getIntegrationStyle(intg);
            return (
              <div key={intg} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                <span className="text-sm text-gray-700">{intg}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", style.badge)}>
                  {style.label}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-gray-400">
          No external data is sent without your explicit setup and confirmation. Demo Mode uses sample data only.
        </p>
      </div>

      {/* Approval checkpoints notice */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-bold text-amber-900">Approval checkpoints in this pack</h2>
          <span className="rounded-full bg-amber-200 text-amber-800 px-2 py-0.5 text-[10px] font-bold ml-auto">Manual Approval Required</span>
        </div>
        <div className="space-y-2 text-xs text-amber-800">
          <p>• All outbound messages (emails, follow-ups) require your approval before sending</p>
          <p>• CRM updates pause for human review when confidence score is below threshold</p>
          <p>• Financial outputs (invoices, reminders) are always reviewed before delivery</p>
        </div>
        <p className="mt-3 text-xs text-amber-700 border-t border-amber-200 pt-2">
          Agents with approval checkpoints will pause and notify you before taking any external action.
        </p>
      </div>

      {/* Sample activity feed */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Sample activity feed</h2>
          <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold">Demo Data</span>
        </div>
        <div className="divide-y divide-gray-100">
          {DEMO_ACTIVITY.map((item, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <div className={cn("h-2 w-2 rounded-full flex-shrink-0", item.status === "completed" ? "bg-emerald-400" : "bg-amber-400")} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700">
                  <span className="font-semibold">{item.agent}</span> {item.action}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {item.status === "pending_approval" && (
                  <span className="rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[9px] font-bold">
                    Awaiting Approval
                  </span>
                )}
                <span className="text-[11px] text-gray-400">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <Link href="/dashboard/activity" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
            View full activity feed <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Sample output */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-bold text-blue-900">Sample weekly output</h2>
          <span className="ml-auto rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold">Demo Data</span>
        </div>
        <p className="text-sm text-blue-800 italic">&ldquo;{pack.sampleOutput}&rdquo;</p>
      </div>

      {/* Final CTA */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-2">Ready to deploy?</p>
        <h2 className="text-lg font-bold mb-1">Deploy the {pack.name} Pack</h2>
        <p className="text-sm opacity-70 mb-5">
          Start in Demo Mode — no integrations required. Your agents run on sample data until you&apos;re ready to go live.
        </p>
        <div className="flex flex-wrap gap-3">
          <form action={deployPackAction}>
            <input type="hidden" name="packKey" value={pack.key} />
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <Zap className="h-4 w-4 text-indigo-600" />
              {deploymentState.deployed ? "Redeploy Pack" : "Deploy Pack"}
            </button>
          </form>
          <Link
            href="/dashboard/integrations"
            className="flex items-center gap-2 rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <Link2 className="h-4 w-4" />
            Set up integrations
          </Link>
          <Link
            href="/dashboard/packs"
            className="flex items-center gap-2 rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all packs
          </Link>
        </div>
      </div>
    </div>
  );
}

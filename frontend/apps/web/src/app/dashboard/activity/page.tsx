import { listActivityLogs } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";
import {
  Home, ShoppingCart, Building2, Truck, Stethoscope, Layers,
  CreditCard, GraduationCap, Users, Factory, Briefcase,
  UtensilsCrossed, MapPin, RotateCcw, RefreshCw,
  CheckCircle2, AlertCircle, Loader2, Clock,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { DemoBanner } from "@/components/ui/demo-banner";
import { getTenantContext } from "@/lib/auth";

const ICON_MAP: Record<string, React.ElementType> = {
  Home, ShoppingCart, Building2, Truck, Stethoscope, Layers,
  CreditCard, GraduationCap, Users, Factory, Briefcase,
  UtensilsCrossed, MapPin, RotateCcw, RefreshCw,
};

const INDUSTRY_COLOR_MAP: Record<string, { bg: string; icon: string }> = {
  "Real Estate":   { bg: "bg-emerald-50", icon: "text-emerald-600" },
  "Ecommerce":     { bg: "bg-orange-50",  icon: "text-orange-600" },
  "Agency":        { bg: "bg-indigo-50",  icon: "text-indigo-600" },
  "Logistics":     { bg: "bg-sky-50",     icon: "text-sky-600" },
  "Clinics":       { bg: "bg-rose-50",    icon: "text-rose-600" },
  "SaaS / B2B":   { bg: "bg-teal-50",    icon: "text-teal-600" },
  "Finance":       { bg: "bg-slate-50",   icon: "text-slate-600" },
  "Education":     { bg: "bg-amber-50",   icon: "text-amber-600" },
  "HR":            { bg: "bg-violet-50",  icon: "text-violet-600" },
  "Manufacturing": { bg: "bg-zinc-50",    icon: "text-zinc-600" },
  "Legal":         { bg: "bg-gray-50",    icon: "text-gray-600" },
  "Restaurants":   { bg: "bg-rose-50",    icon: "text-rose-600" },
  "Local Services":{ bg: "bg-pink-50",    icon: "text-pink-600" },
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  completed:        { icon: CheckCircle2, label: "Completed",        className: "text-emerald-600" },
  in_progress:      { icon: Loader2,      label: "In progress",      className: "text-blue-600" },
  pending_approval: { icon: AlertCircle,  label: "Awaiting approval", className: "text-amber-600" },
  failed:           { icon: AlertCircle,  label: "Failed",           className: "text-red-600" },
};

export default async function ActivityPage() {
  const session = await requireSession();
  const activity = await listActivityLogs(getAutomationContextFromSession(session), 50);
  const { agencyName } = getTenantContext();
  const total = activity.reduce((s, a) => s + a.count, 0);
  const completed = activity.filter((a) => a.status === "completed").length;
  const pending = activity.filter((a) => a.status === "pending_approval").length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-1">AI Activity Feed</p>
        <h1 className="text-2xl font-bold text-gray-900">Your agents have been busy — across every industry</h1>
        <p className="mt-1 text-sm text-gray-500">
          Live log of agent actions. Every line represents real work automated — no manual effort.
        </p>
      </div>

      <DemoBanner
        businessName={agencyName}
        message={`Showing sample activity for "${agencyName}" until agents are connected to live systems.`}
      />

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Actions today", value: total.toLocaleString(), sub: "by AI agents", color: "indigo" },
          { label: "Workflows completed", value: completed, sub: "in last 4 hours", color: "emerald" },
          { label: "Pending approval", value: pending, sub: "awaiting your review", color: "amber" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs font-medium text-gray-700 mt-0.5">{s.label}</p>
            <p className="text-[11px] text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Feed */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Recent activity</h2>
          <span className="ml-auto text-xs text-gray-400">Backed by activity_logs</span>
        </div>

        <div className="divide-y divide-gray-100">
          {activity.map((item) => {
            const Icon = ICON_MAP[item.agentIcon] ?? RefreshCw;
            const c = INDUSTRY_COLOR_MAP[item.industry] ?? { bg: "bg-gray-50", icon: "text-gray-600" };
            const sc = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.completed;
            const StatusIcon = sc.icon;
            return (
              <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                {/* Agent icon */}
                <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", c.bg)}>
                  <Icon className={cn("h-4 w-4", c.icon)} strokeWidth={1.75} />
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold text-gray-900">{item.agent}</span>
                    {" "}{item.action}{" "}
                    <span className="font-semibold text-gray-900">{item.count.toLocaleString()} {item.unit}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium mr-1.5", c.bg, c.icon)}>{item.industry}</span>
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1.5 text-xs">
                  <StatusIcon className={cn("h-3.5 w-3.5", sc.className)} />
                  <span className={cn("font-medium hidden sm:inline", sc.className)}>
                    {sc.label}
                  </span>
                </div>

                {/* Time */}
                <span className="text-xs text-gray-400 flex-shrink-0 text-right">
                  {item.timeAgo}
                </span>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 text-center">
            Showing last {activity.length} actions · External sends require connected integrations and approvals
          </p>
        </div>
      </div>
    </div>
  );
}

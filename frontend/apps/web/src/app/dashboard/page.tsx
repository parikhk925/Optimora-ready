import Link from "next/link";
import { fetchOverview } from "@/lib/data";
import { getRoiSummary, listActivityLogs, listAgentDefinitions, listIndustryPacks, listWorkflowTemplates } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";
import {
  Bot, Package, GitBranch, Zap, TrendingUp, Activity, Building2,
  ChevronRight, Clock,
} from "lucide-react";
import { cn } from "@/lib/cn";

export default async function OverviewPage() {
  const session = await requireSession();
  const ctx = getAutomationContextFromSession(session);
  const [res, industryPacks, agents, workflows, activity, roi] = await Promise.all([
    fetchOverview(),
    listIndustryPacks(),
    listAgentDefinitions(),
    listWorkflowTemplates(),
    listActivityLogs(ctx, 5),
    getRoiSummary(ctx),
  ]);

  const quickLinks = [
    { label: "Industry Packs", href: "/dashboard/packs", icon: Package, color: "bg-indigo-50 text-indigo-600", desc: `${industryPacks.length} packs · Deploy in minutes` },
    { label: "Agent Library", href: "/dashboard/agent-library", icon: Bot, color: "bg-violet-50 text-violet-600", desc: `${agents.length} agents ready to deploy` },
    { label: "Workflows", href: "/dashboard/workflows", icon: GitBranch, color: "bg-teal-50 text-teal-600", desc: `${workflows.length} templates` },
    { label: "Activity Feed", href: "/dashboard/activity", icon: Activity, color: "bg-orange-50 text-orange-600", desc: "See what agents are doing" },
    { label: "ROI Dashboard", href: "/dashboard/roi", icon: TrendingUp, color: "bg-emerald-50 text-emerald-600", desc: "Hours saved & cost avoided" },
    { label: "Agency Mode", href: "/dashboard/agency-os", icon: Building2, color: "bg-rose-50 text-rose-600", desc: "White-label & resell packs" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-1">Optimora AI Automation OS</p>
        <h1 className="text-2xl font-bold text-gray-900">Automate your business with a team of AI agents</h1>
        <p className="mt-1 text-sm text-gray-500">
          Deploy industry-specific AI agent teams. Pick a pack, configure once, run forever.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {quickLinks.map((q) => {
          const Icon = q.icon;
          return (
            <Link
              key={q.href}
              href={q.href}
              className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-4 hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl mb-3", q.color)}>
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <p className="text-xs font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{q.label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{q.desc}</p>
            </Link>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Industry Pack Marketplace</h2>
          <Link href="/dashboard/packs" className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
            View all {industryPacks.length} packs <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {industryPacks.slice(0, 4).map((pack) => (
            <Link
              key={pack.key}
              href={pack.dashboardHref}
              className="group rounded-xl border border-gray-200 bg-white p-4 hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{pack.name}</p>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{pack.headline}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{pack.hoursSaved}h/wk saved</span>
                <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{pack.agents.length} agents</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Recent agent activity</h2>
            <Link href="/dashboard/activity" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {activity.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate">
                    <span className="font-medium">{item.agent}</span> {item.action} {item.count} {item.unit}
                  </p>
                  <p className="text-[11px] text-gray-400">{item.industry}</p>
                </div>
                <span className="text-[11px] text-gray-400 flex-shrink-0">{item.timeAgo}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">ROI this month</h2>
            <Link href="/dashboard/roi" className="text-xs text-indigo-600 hover:underline">Full report</Link>
          </div>
          <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-gray-100">
            {roi.metrics.slice(0, 4).map((m) => (
              <div key={m.label} className="px-5 py-4">
                <p className="text-xl font-bold text-gray-900">{m.value}</p>
                <p className="text-xs font-medium text-gray-600 mt-0.5">{m.label}</p>
                <p className="text-[11px] text-gray-400">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {res.status === "ok" && (
        <details className="group">
          <summary className="flex cursor-pointer items-center gap-2 text-xs text-gray-400 hover:text-gray-600 select-none">
            <ChevronRight className="h-3.5 w-3.5 group-open:rotate-90 transition-transform" />
            Platform module status
          </summary>
          <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                "Runtime", "Memory", "Tools", "Integrations",
                "Approvals", "Audit", "Jurisdiction", "Billing",
              ].map((mod) => (
                <div key={mod} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  <span className="text-sm text-gray-600">{mod}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">ready</span>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

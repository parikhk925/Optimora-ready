import { listAgentDefinitions } from "@/lib/automation-data";
import { statusLabel, statusColor } from "@/lib/os-data";
import {
  Target, Send, RefreshCw, Database, CalendarCheck,
  FileSearch, BarChart2, MessageCircle, ClipboardList,
  Heart, Settings2, CheckCircle2, AlertCircle,
  CreditCard, ShoppingCart, TrendingDown, FileText, Star, Truck,
} from "lucide-react";
import { cn } from "@/lib/cn";

const ICON_MAP: Record<string, React.ElementType> = {
  Target, Send, RefreshCw, Database, CalendarCheck,
  FileSearch, BarChart2, MessageCircle, ClipboardList, Heart, Settings2,
  CreditCard, ShoppingCart, TrendingDown, FileText, Star, Truck,
};

const COLOR_MAP: Record<string, { bg: string; icon: string; border: string }> = {
  indigo:  { bg: "bg-indigo-50",  icon: "text-indigo-600",  border: "border-indigo-100" },
  violet:  { bg: "bg-violet-50",  icon: "text-violet-600",  border: "border-violet-100" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-100" },
  sky:     { bg: "bg-sky-50",     icon: "text-sky-600",     border: "border-sky-100" },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-600",   border: "border-amber-100" },
  rose:    { bg: "bg-rose-50",    icon: "text-rose-600",    border: "border-rose-100" },
  teal:    { bg: "bg-teal-50",    icon: "text-teal-600",    border: "border-teal-100" },
  orange:  { bg: "bg-orange-50",  icon: "text-orange-600",  border: "border-orange-100" },
  slate:   { bg: "bg-slate-50",   icon: "text-slate-600",   border: "border-slate-200" },
  pink:    { bg: "bg-pink-50",    icon: "text-pink-600",    border: "border-pink-100" },
  gray:    { bg: "bg-gray-50",    icon: "text-gray-600",    border: "border-gray-200" },
};

export default async function AgentLibraryPage() {
  const AGENT_LIBRARY = await listAgentDefinitions();
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-1">Agent Library</p>
        <h1 className="text-2xl font-bold text-gray-900">{AGENT_LIBRARY.length} AI agents. Each built to own a specific job.</h1>
        <p className="mt-1 text-sm text-gray-500">
          Agents are the workers. Workflows are the processes. Together they automate your business across 13 industries.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {AGENT_LIBRARY.map((agent) => {
          const Icon = ICON_MAP[agent.icon] ?? Target;
          const c = COLOR_MAP[agent.color] ?? COLOR_MAP.indigo;
          const industries = (agent as unknown as { industries?: string[] }).industries ?? [];
          return (
            <div key={agent.key} className={cn("rounded-2xl border bg-white shadow-sm", c.border)}>
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0", c.bg)}>
                      <Icon className={cn("h-5 w-5", c.icon)} strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{agent.name}</h3>
                      <p className="text-xs text-gray-500">{agent.tagline}</p>
                    </div>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ml-2", statusColor(agent.status))}>
                    {statusLabel(agent.status)}
                  </span>
                </div>

                <p className="text-xs text-gray-500 mb-4">{agent.what}</p>

                {/* Inputs / Outputs */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Inputs</p>
                    <ul className="space-y-1">
                      {agent.inputs.map((inp) => (
                        <li key={inp} className="text-xs text-gray-600 flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-gray-300 flex-shrink-0" />
                          {inp}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Outputs</p>
                    <ul className="space-y-1">
                      {agent.outputs.slice(0, 4).map((o) => (
                        <li key={o} className="text-xs text-gray-600 flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-emerald-400 flex-shrink-0" />
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Flags */}
                <div className="flex flex-wrap gap-2">
                  {agent.approvalRequired && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium text-amber-700">
                      <AlertCircle className="h-3 w-3" /> Approval required
                    </span>
                  )}
                  {!agent.integrationRequired && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> No integration needed
                    </span>
                  )}
                  {agent.integrations.length > 0 && (
                    <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-medium text-sky-700">
                      {agent.integrations.slice(0, 2).join(", ")}{agent.integrations.length > 2 ? ` +${agent.integrations.length - 2}` : ""}
                    </span>
                  )}
                </div>

                {/* Industries */}
                {industries.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Used in industries</p>
                    <div className="flex flex-wrap gap-1">
                      {industries.map((ind) => (
                        <span key={ind} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-600 font-medium">{ind}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Compatible workflows */}
              <div className="border-t border-gray-100 px-5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Used in workflows</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.workflows.map((w) => (
                    <span key={w} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{w}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

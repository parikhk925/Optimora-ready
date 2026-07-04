import { listWorkflowTemplates } from "@/lib/automation-data";
import { statusLabel, statusColor } from "@/lib/os-data";
import {
  TrendingUp, RotateCcw, FileSearch, CalendarCheck, BarChart2,
  MessageCircle, ShoppingCart, Calendar, CreditCard, FileText, Building2,
  User, Zap, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { deployWorkflowAction } from "./actions";
import { DemoBanner } from "@/components/ui/demo-banner";

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp, RotateCcw, FileSearch, CalendarCheck, BarChart2,
  MessageCircle, ShoppingCart, Calendar, CreditCard, FileText, Building2,
};

const COLOR_MAP: Record<string, { bg: string; icon: string; border: string; step: string }> = {
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-600", border: "border-indigo-100", step: "bg-indigo-600" },
  rose: { bg: "bg-rose-50", icon: "text-rose-600", border: "border-rose-100", step: "bg-rose-500" },
  violet: { bg: "bg-violet-50", icon: "text-violet-600", border: "border-violet-100", step: "bg-violet-600" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", border: "border-amber-100", step: "bg-amber-500" },
  teal: { bg: "bg-teal-50", icon: "text-teal-600", border: "border-teal-100", step: "bg-teal-600" },
  orange: { bg: "bg-orange-50", icon: "text-orange-600", border: "border-orange-100", step: "bg-orange-500" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-100", step: "bg-emerald-600" },
  sky: { bg: "bg-sky-50", icon: "text-sky-600", border: "border-sky-100", step: "bg-sky-500" },
  slate: { bg: "bg-slate-50", icon: "text-slate-600", border: "border-slate-200", step: "bg-slate-600" },
};

export default async function WorkflowsPage() {
  const WORKFLOW_TEMPLATES = await listWorkflowTemplates();
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-1">Workflow Template Library</p>
        <h1 className="text-2xl font-bold text-gray-900">{WORKFLOW_TEMPLATES.length} automation workflows. Pick one, deploy in minutes.</h1>
        <p className="mt-1 text-sm text-gray-500">
          Each workflow runs a team of AI agents through a real business process — with human approval checkpoints where needed.
        </p>
      </div>

      <DemoBanner message="Workflows below run on sample data until you connect the integrations they need to go live." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {WORKFLOW_TEMPLATES.map((wf) => {
          const Icon = ICON_MAP[wf.icon] ?? TrendingUp;
          const c = COLOR_MAP[wf.color] ?? COLOR_MAP.indigo;
          return (
            <div key={wf.key} className={cn("rounded-2xl border bg-white shadow-sm", c.border)}>
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0", c.bg)}>
                      <Icon className={cn("h-5 w-5", c.icon)} strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{wf.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Trigger: {wf.trigger}</p>
                    </div>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ml-2", statusColor(wf.status))}>
                    {statusLabel(wf.status)}
                  </span>
                </div>

                {/* Steps */}
                <div className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Steps</p>
                  <div className="space-y-2">
                    {wf.steps.map((step) => (
                      <div key={step.step} className="flex items-start gap-2.5">
                        <div className={cn("flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white mt-0.5", c.step)}>
                          {step.step}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700">{step.label}</p>
                          <p className="text-[10px] text-gray-400">{step.agent}</p>
                        </div>
                        {step.humanCheckpoint && (
                          <span className="flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 whitespace-nowrap">
                            <User className="h-2.5 w-2.5" /> Approval
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sample output */}
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Sample output</p>
                  <p className="text-xs text-gray-600 italic">{wf.sampleOutput}</p>
                </div>

                {/* ROI */}
                <div className={cn("rounded-xl p-3", c.bg)}>
                  <div className="flex items-start gap-2">
                    <Zap className={cn("h-3.5 w-3.5 flex-shrink-0 mt-0.5", c.icon)} />
                    <p className={cn("text-xs font-medium", c.icon.replace("text-", "text-").replace("600", "800"))}>{wf.roiEstimate}</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-4">
                {wf.requiredIntegrations.length > 0 && (
                  <div className="text-xs text-gray-500 flex-1 min-w-0 truncate">
                    <span className="font-medium text-gray-700">Needs: </span>
                    {wf.requiredIntegrations.join(", ")}
                  </div>
                )}
                <Link
                  href={`/dashboard/workflows/${wf.key}`}
                  className="ml-auto flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
                >
                  View details <ArrowRight className="h-3 w-3" />
                </Link>
                <form action={deployWorkflowAction}>
                  <input type="hidden" name="templateKey" value={wf.key} />
                  <input type="hidden" name="name" value={wf.name} />
                  <button
                    type="submit"
                    className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
                  >
                    Deploy Workflow
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

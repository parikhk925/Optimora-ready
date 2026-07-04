import { listWorkflowTemplates } from "@/lib/automation-data";
import { statusLabel, statusColor } from "@/lib/os-data";
import {
  TrendingUp, RotateCcw, FileSearch, CalendarCheck, BarChart2,
  MessageCircle, ShoppingCart, Calendar, CreditCard, FileText, Building2,
  User, Zap, ChevronRight, ArrowLeft, AlertCircle,
  GitBranch, Link2, Package, UserCheck, LifeBuoy, Megaphone,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/ui/demo-banner";
import { RunWorkflowButton } from "@/components/dashboard/run-workflow-button";

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp, RotateCcw, FileSearch, CalendarCheck, BarChart2,
  MessageCircle, ShoppingCart, Calendar, CreditCard, FileText, Building2,
  UserCheck, LifeBuoy, Megaphone,
};

const COLOR_MAP: Record<string, { bg: string; icon: string; border: string; step: string; hero: string }> = {
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-600", border: "border-indigo-200", step: "bg-indigo-600", hero: "from-indigo-600 to-indigo-700" },
  rose: { bg: "bg-rose-50", icon: "text-rose-600", border: "border-rose-200", step: "bg-rose-500", hero: "from-rose-600 to-rose-700" },
  violet: { bg: "bg-violet-50", icon: "text-violet-600", border: "border-violet-200", step: "bg-violet-600", hero: "from-violet-600 to-violet-700" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", border: "border-amber-200", step: "bg-amber-500", hero: "from-amber-500 to-amber-600" },
  teal: { bg: "bg-teal-50", icon: "text-teal-600", border: "border-teal-200", step: "bg-teal-600", hero: "from-teal-600 to-teal-700" },
  orange: { bg: "bg-orange-50", icon: "text-orange-600", border: "border-orange-200", step: "bg-orange-500", hero: "from-orange-500 to-orange-600" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-200", step: "bg-emerald-600", hero: "from-emerald-600 to-emerald-700" },
  sky: { bg: "bg-sky-50", icon: "text-sky-600", border: "border-sky-200", step: "bg-sky-500", hero: "from-sky-600 to-sky-700" },
  slate: { bg: "bg-slate-50", icon: "text-slate-600", border: "border-slate-200", step: "bg-slate-600", hero: "from-slate-600 to-slate-700" },
};

const INTEGRATION_STATUS: Record<string, { badge: string; label: string }> = {
  "CRM": { badge: "bg-blue-100 text-blue-700", label: "Requires Integration" },
  "Email": { badge: "bg-blue-100 text-blue-700", label: "Requires Integration" },
  "Google Calendar": { badge: "bg-blue-100 text-blue-700", label: "Requires Integration" },
  "Google Sheets": { badge: "bg-blue-100 text-blue-700", label: "Requires Integration" },
  "WhatsApp Business": { badge: "bg-purple-100 text-purple-700", label: "Custom Setup Required" },
  "LinkedIn (official API)": { badge: "bg-purple-100 text-purple-700", label: "Custom Setup Required" },
  "Webhook": { badge: "bg-emerald-100 text-emerald-700", label: "Available Now" },
  "CSV Upload": { badge: "bg-emerald-100 text-emerald-700", label: "Available Now" },
};

function getIntegrationStyle(name: string) {
  for (const [key, val] of Object.entries(INTEGRATION_STATUS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return { badge: "bg-gray-100 text-gray-700", label: "Requires Integration" };
}

export default async function WorkflowDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const workflows = await listWorkflowTemplates();
  const wf = workflows.find((w) => w.key === key);

  if (!wf) notFound();

  const Icon = ICON_MAP[wf.icon] ?? TrendingUp;
  const c = COLOR_MAP[wf.color] ?? COLOR_MAP.indigo;
  const approvalSteps = wf.steps.filter((s) => s.humanCheckpoint);
  const agentsUsed = [...new Set(wf.steps.map((s) => s.agent))];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/workflows" className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Workflows
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
        <span className="text-gray-900 font-medium">{wf.name}</span>
      </div>

      {/* Demo banner */}
      <DemoBanner
        variant="demo"
        message={`"${wf.name}" is running in Sample Preview. All steps execute on sample data. Connect required integrations to run on live data.`}
      />

      {/* Hero */}
      <div className={cn("rounded-2xl bg-gradient-to-br p-6 text-white", c.hero)}>
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Icon className="h-7 w-7 text-white" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Workflow Template</p>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold bg-white/20 text-white")}>
                {statusLabel(wf.status)}
              </span>
            </div>
            <h1 className="text-xl font-bold">{wf.name}</h1>
            <p className="mt-1 text-sm opacity-80">Trigger: {wf.trigger}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-1.5 opacity-80">
            <GitBranch className="h-4 w-4" />
            <span className="font-bold text-white">{wf.steps.length}</span> steps
          </div>
          <div className="flex items-center gap-1.5 opacity-80">
            <User className="h-4 w-4" />
            <span className="font-bold text-white">{approvalSteps.length}</span> approval checkpoints
          </div>
          <div className="flex items-center gap-1.5 opacity-80">
            <Package className="h-4 w-4" />
            <span className="font-bold text-white">{agentsUsed.length}</span> agents involved
          </div>
        </div>
      </div>

      {/* ROI */}
      <div className={cn("rounded-xl border p-4 flex items-start gap-3", c.bg, c.border)}>
        <Zap className={cn("h-4 w-4 flex-shrink-0 mt-0.5", c.icon)} />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-0.5">ROI Tracked</p>
          <p className={cn("text-sm font-semibold", c.icon)}>{wf.roiEstimate}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Step-by-step automation */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Step-by-step automation</h2>
          <p className="text-xs text-gray-400 mb-4">Each step runs in sequence. Human approval pauses the workflow.</p>

          <div className="space-y-3">
            {wf.steps.map((step, i) => (
              <div key={step.step} className="relative">
                {i < wf.steps.length - 1 && (
                  <div className="absolute left-[10px] top-6 h-full w-px bg-gray-200" />
                )}
                <div className="flex items-start gap-3">
                  <div className={cn("flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white mt-0.5", c.step)}>
                    {step.step}
                  </div>
                  <div className="flex-1 min-w-0 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{step.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-indigo-400" />
                          {step.agent}
                        </p>
                      </div>
                      {step.humanCheckpoint && (
                        <span className="flex items-center gap-1 flex-shrink-0 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] font-semibold text-amber-700 whitespace-nowrap">
                          <User className="h-2.5 w-2.5" />
                          Manual Approval Required
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agents + Integrations */}
        <div className="space-y-4">
          {/* Agents */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Agents involved</h2>
            <div className="space-y-2">
              {agentsUsed.map((agent) => {
                const isApproval = wf.steps.some((s) => s.agent === agent && s.humanCheckpoint);
                return (
                  <div key={agent} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                    <div className={cn("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg", c.bg)}>
                      <User className={cn("h-3.5 w-3.5", c.icon)} />
                    </div>
                    <span className="text-sm text-gray-700 flex-1">{agent}</span>
                    {isApproval ? (
                      <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[9px] font-bold">
                        Approval
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[9px] font-bold">
                        Auto
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Approval checkpoints */}
          {approvalSteps.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-bold text-amber-900">Approval checkpoints</h2>
              </div>
              <div className="space-y-2">
                {approvalSteps.map((step) => (
                  <div key={step.step} className="flex items-start gap-2 text-xs text-amber-800">
                    <span className="font-bold">Step {step.step}:</span>
                    <span>{step.label} — pauses for human review before continuing</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-amber-700 border-t border-amber-200 pt-2">
                No outbound action is taken until you explicitly approve it.
              </p>
            </div>
          )}

          {/* Integrations */}
          {wf.requiredIntegrations.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="h-4 w-4 text-gray-500" />
                <h2 className="text-sm font-bold text-gray-900">Integration requirements</h2>
              </div>
              <div className="space-y-2">
                {wf.requiredIntegrations.map((intg) => {
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
            </div>
          )}
        </div>
      </div>

      {/* Sample output */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-bold text-blue-900">Sample output</h2>
          <span className="ml-auto rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold">Sample Data</span>
        </div>
        <p className="text-sm text-blue-800 italic">&ldquo;{wf.sampleOutput}&rdquo;</p>
        <p className="mt-2 text-xs text-blue-600">This output is generated from sample data. Connect integrations to produce real outputs.</p>
      </div>

      {/* Deployment CTA */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-sm font-bold text-gray-900">Deployment status</h2>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", statusColor(wf.status))}>
            {statusLabel(wf.status)}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {wf.status === "demo"
            ? "This workflow is ready to deploy now. It runs on sample data until you connect the integrations it needs."
            : wf.status === "requires_integration"
              ? "This workflow requires connecting at least one external integration before it can run on live data."
              : "This workflow requires custom setup. Contact us to configure it for your environment."}
        </p>
        <div className="flex flex-wrap gap-3">
          <RunWorkflowButton templateKey={wf.key} />
          <Link
            href="/dashboard/run"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <Zap className="h-4 w-4" />
            Deploy Workflow
          </Link>
          <Link
            href="/dashboard/integrations"
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Link2 className="h-4 w-4" />
            Set up integrations
          </Link>
          <Link
            href="/dashboard/workflows"
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all workflows
          </Link>
        </div>
      </div>
    </div>
  );
}

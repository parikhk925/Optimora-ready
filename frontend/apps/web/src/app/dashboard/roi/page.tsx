import { getRoiSummary } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";
import { getTenantContext } from "@/lib/auth";
import {
  Clock, Zap, Banknote, RotateCcw, CheckCircle2,
  TrendingUp, CalendarCheck, CreditCard, BarChart2, FileText,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { DemoBanner } from "@/components/ui/demo-banner";

const ICON_MAP: Record<string, React.ElementType> = {
  Clock, Zap, Banknote, RotateCcw, CheckCircle2, TrendingUp, CalendarCheck, CreditCard, BarChart2, FileText,
};

const COLOR_MAP: Record<string, { bg: string; icon: string; ring: string }> = {
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-600", ring: "ring-indigo-200" },
  violet: { bg: "bg-violet-50", icon: "text-violet-600", ring: "ring-violet-200" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", ring: "ring-emerald-200" },
  rose: { bg: "bg-rose-50", icon: "text-rose-600", ring: "ring-rose-200" },
  teal: { bg: "bg-teal-50", icon: "text-teal-600", ring: "ring-teal-200" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", ring: "ring-amber-200" },
  sky: { bg: "bg-sky-50", icon: "text-sky-600", ring: "ring-sky-200" },
  slate: { bg: "bg-slate-50", icon: "text-slate-600", ring: "ring-slate-200" },
};

export default async function ROIPage() {
  const session = await requireSession();
  const roi = await getRoiSummary(getAutomationContextFromSession(session));
  const { agencyName } = getTenantContext();
  const totalRuns = roi.breakdown.reduce((s, r) => s + r.runs, 0);
  const totalHours = roi.breakdown.reduce((s, r) => s + r.hoursAvoided, 0);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-1">ROI Dashboard</p>
        <h1 className="text-2xl font-bold text-gray-900">The business case for AI agents</h1>
        <p className="mt-1 text-sm text-gray-500">
          Estimated impact for {agencyName} based on workflow activity and industry benchmarks.
        </p>
      </div>

      <DemoBanner
        businessName={agencyName}
        message={`ROI figures below are sample estimates for "${agencyName}" based on industry benchmarks. Real figures appear once agents are connected to live systems.`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {roi.metrics.map((m) => {
          const Icon = ICON_MAP[m.icon] ?? TrendingUp;
          const c = COLOR_MAP[m.color] ?? COLOR_MAP.indigo;
          return (
            <div key={m.label} className={cn("rounded-2xl border bg-white p-5 ring-1", c.ring)}>
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl mb-3", c.bg)}>
                <Icon className={cn("h-5 w-5", c.icon)} strokeWidth={1.75} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{m.value}</p>
              <p className="text-sm font-medium text-gray-700 mt-0.5">{m.label}</p>
              <p className="text-xs text-gray-400">{m.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Automation breakdown by workflow</h2>
          <p className="text-xs text-gray-400 mt-0.5">Stored in workflow_roi_snapshots and grouped by deployed workflow.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Workflow</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Runs</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Hours avoided</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Est. cost saved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roi.breakdown.map((row) => (
                <tr key={row.workflow} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-900 font-medium">{row.workflow}</td>
                  <td className="px-5 py-3 text-gray-600 text-right">{row.runs}</td>
                  <td className="px-5 py-3 text-gray-600 text-right">{row.hoursAvoided}h</td>
                  <td className="px-5 py-3 text-emerald-700 font-semibold text-right">{row.estValue}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td className="px-5 py-3 text-sm font-bold text-gray-900">Total</td>
                <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right">{totalRuns}</td>
                <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right">{totalHours}h</td>
                <td className="px-5 py-3 text-sm font-bold text-emerald-700 text-right">
                  ₹{Math.round(roi.salaryCostSaved).toLocaleString("en-IN")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

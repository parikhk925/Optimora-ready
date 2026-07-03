import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, XCircle, AlertTriangle, PauseCircle, Ban } from "lucide-react";
import { getWorkflowRunDetail, listPendingApprovals } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";
import { StatusBadge } from "@/components/ui/status-badge";
import { RunControls } from "@/components/dashboard/run-controls";
import { ApprovalActions } from "@/components/dashboard/approval-actions";
import { cn } from "@/lib/cn";

const STEP_ICON: Record<string, React.ElementType> = {
  completed: CheckCircle2,
  failed: XCircle,
  waiting_for_approval: PauseCircle,
  running: Clock,
  pending: Clock,
  skipped: AlertTriangle,
  cancelled: Ban,
};

export default async function WorkflowRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const ctx = getAutomationContextFromSession(session);
  const run = await getWorkflowRunDetail(ctx, id);
  if (!run) notFound();

  const pendingApprovals = await listPendingApprovals(ctx);
  const runApproval = pendingApprovals.find((a) => a.runId === id);

  return (
    <div className="space-y-6" data-testid="workflow-run-detail">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/workflows/runs" className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Workflow Runs
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-bold text-gray-900">{run.workflowName}</h1>
              <StatusBadge status={run.status} />
            </div>
            <p className="text-xs text-gray-500">
              Run <code className="text-gray-400">{run.id}</code> · trigger: {run.triggerType} · version {run.workflowVersion}
            </p>
          </div>
          <RunControls runId={run.id} status={run.status} />
        </div>

        {run.outputSummary && (
          <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{run.outputSummary}</p>
        )}
        {run.errorMessage && (
          <p data-testid="run-error-message" className="mt-3 text-sm text-red-700 bg-red-50 rounded-lg p-3">{run.errorMessage}</p>
        )}

        {run.status === "waiting_for_approval" && runApproval && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900 mb-1">Approval required</p>
            <p className="text-xs text-amber-700 mb-3">{runApproval.description}</p>
            <ApprovalActions approvalId={runApproval.id} />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Step-by-step execution</h2>
        <div className="space-y-3" data-testid="run-steps-list">
          {run.steps.map((step) => {
            const Icon = STEP_ICON[step.status] ?? Clock;
            return (
              <div key={step.id} data-testid={`run-step-${step.stepNumber}`} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0",
                      step.status === "completed" ? "text-emerald-500" :
                      step.status === "failed" ? "text-red-500" :
                      step.status === "waiting_for_approval" ? "text-amber-500" :
                      step.status === "skipped" || step.status === "cancelled" ? "text-gray-400" : "text-gray-400")}
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{step.stepNumber}. {step.label}</p>
                      <p className="text-[11px] text-gray-400">{step.stepType} · agent: {step.agentKey}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {step.durationMs !== null && <span className="text-[11px] text-gray-400">{step.durationMs}ms</span>}
                    {step.retryCount > 0 && <span className="text-[11px] text-amber-600">retries: {step.retryCount}</span>}
                    <StatusBadge status={step.status} />
                  </div>
                </div>
                {step.status === "failed" && step.error != null && (
                  <pre data-testid={`run-step-${step.stepNumber}-error`} className="mt-2 overflow-x-auto rounded-lg bg-red-50 p-2 text-[11px] text-red-700">
                    {JSON.stringify(step.error, null, 2)}
                  </pre>
                )}
                {step.outputData != null && Object.keys(step.outputData as object).length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[11px] text-gray-400">View output JSON</summary>
                    <pre data-testid={`run-step-${step.stepNumber}-output`} className="mt-1 overflow-x-auto rounded-lg bg-gray-50 p-2 text-[11px] text-gray-600">
                      {JSON.stringify(step.outputData, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Execution logs</h2>
        <div className="space-y-1.5 font-mono text-[11px]" data-testid="run-logs-list">
          {run.logs.length === 0 && <p className="text-gray-400">No logs yet.</p>}
          {run.logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2">
              <span className="text-gray-300 flex-shrink-0">{new Date(log.createdAt).toLocaleTimeString()}</span>
              <span className={cn("uppercase font-bold flex-shrink-0",
                log.level === "error" ? "text-red-500" : log.level === "warn" ? "text-amber-500" : "text-gray-400")}
              >
                {log.level}
              </span>
              <span className="text-gray-700">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

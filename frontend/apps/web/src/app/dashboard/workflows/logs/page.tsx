import Link from "next/link";
import { listExecutionLogs } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";
import { ModulePage } from "@/components/dashboard/module-page";
import { EmptyState } from "@/components/ui/data-states";
import { ScrollText } from "lucide-react";
import { cn } from "@/lib/cn";

export default async function ExecutionLogsPage() {
  const session = await requireSession();
  const ctx = getAutomationContextFromSession(session);
  const logs = await listExecutionLogs(ctx, { limit: 150 });

  return (
    <ModulePage
      title="Execution Logs"
      description="Real, per-step execution log stream written by the workflow engine as runs execute."
    >
      {logs.length === 0 ? (
        <EmptyState icon={ScrollText} message="No execution logs yet. Run a workflow to generate logs." />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-1.5 font-mono text-[11px]" data-testid="execution-logs-list">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 border-b border-gray-50 py-1 last:border-0">
              <span className="text-gray-300 flex-shrink-0 w-16">{new Date(log.createdAt).toLocaleTimeString()}</span>
              <span className={cn("uppercase font-bold flex-shrink-0 w-10",
                log.level === "error" ? "text-red-500" : log.level === "warn" ? "text-amber-500" : "text-gray-400")}
              >
                {log.level}
              </span>
              <span className="text-gray-700 flex-1">{log.message}</span>
              <Link href={`/dashboard/workflows/runs/${log.workflowRunId}`} className="text-indigo-500 hover:underline flex-shrink-0">
                view run
              </Link>
            </div>
          ))}
        </div>
      )}
    </ModulePage>
  );
}

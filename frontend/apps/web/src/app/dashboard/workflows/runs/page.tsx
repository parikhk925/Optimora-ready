import Link from "next/link";
import { listWorkflowRuns } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";
import { ModulePage } from "@/components/dashboard/module-page";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/data-states";
import { Play } from "lucide-react";

export default async function WorkflowRunsPage() {
  const session = await requireSession();
  const ctx = getAutomationContextFromSession(session);
  const runs = await listWorkflowRuns(ctx, 50);

  return (
    <ModulePage
      title="Workflow Runs"
      description="Real Automation OS workflow runs — created by clicking Run Workflow on a workflow detail page."
    >
      {runs.length === 0 ? (
        <EmptyState icon={Play} message="No workflow runs yet. Open a workflow and click Run Workflow to start one." />
      ) : (
        <DataTable
          columns={[
            {
              key: "workflow",
              header: "Workflow",
              render: (r) => (
                <Link data-testid={`run-row-${r.id}`} href={`/dashboard/workflows/runs/${r.id}`} className="font-medium text-indigo-600 hover:underline">
                  {r.workflowName}
                </Link>
              ),
            },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "trigger", header: "Trigger", render: (r) => <span className="text-xs text-gray-500">{r.triggerType ?? "manual"}</span> },
            { key: "started", header: "Started", render: (r) => (r.startedAt ? new Date(r.startedAt).toLocaleString() : "—") },
            { key: "id", header: "Run ID", render: (r) => <code className="text-xs text-gray-400">{r.id.slice(0, 8)}</code> },
          ]}
          rows={runs}
          rowKey={(r) => r.id}
        />
      )}
    </ModulePage>
  );
}

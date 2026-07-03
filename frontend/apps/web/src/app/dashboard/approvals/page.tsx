import Link from "next/link";
import { listPendingApprovals } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";
import { ModulePage } from "@/components/dashboard/module-page";
import { EmptyState } from "@/components/ui/data-states";
import { ApprovalActions } from "@/components/dashboard/approval-actions";
import { ShieldCheck } from "lucide-react";

export default async function ApprovalsPage() {
  const session = await requireSession();
  const ctx = getAutomationContextFromSession(session);
  const approvals = await listPendingApprovals(ctx);

  return (
    <ModulePage
      title="Approvals"
      description="Real pending approvals from workflow runs. Approving resumes the run from the next step; rejecting stops it."
    >
      {approvals.length === 0 ? (
        <EmptyState icon={ShieldCheck} message="No pending approvals. Run a workflow with an approval step to see one here." />
      ) : (
        <div className="space-y-3" data-testid="approvals-list">
          {approvals.map((approval) => (
            <div key={approval.id} data-testid={`approval-card-${approval.id}`} className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{approval.description}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Agent: {approval.agentKey} ·{" "}
                    <Link href={`/dashboard/workflows/runs/${approval.runId}`} className="text-indigo-600 hover:underline">
                      view run
                    </Link>
                  </p>
                </div>
                <ApprovalActions approvalId={approval.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </ModulePage>
  );
}

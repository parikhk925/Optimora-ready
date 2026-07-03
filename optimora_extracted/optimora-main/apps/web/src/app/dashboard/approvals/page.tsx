import { ModulePage } from "@/components/dashboard/module-page";
import { EmptyState } from "@/components/ui/data-states";
import { ShieldCheck } from "lucide-react";

/**
 * Approvals are action-oriented (approve/reject), not just read-only.
 * Read is scoped via the Public API (approvals:write scope required for decisions).
 * Listing pending approvals requires admin session auth not yet wired.
 * Renders with demo state until admin session is available.
 */
export default function ApprovalsPage() {
  return (
    <ModulePage
      title="Approvals"
      description="Human-in-the-loop approval requests from agents. Decisions require approvals:write scope."
      live={false}
    >
      <EmptyState icon={ShieldCheck} message="Approval listing requires admin session auth — available in next phase." />
    </ModulePage>
  );
}

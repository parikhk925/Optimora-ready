import { fetchAuditLogs } from "@/lib/data";
import { ModulePage } from "@/components/dashboard/module-page";
import { DataTable } from "@/components/ui/data-table";
import { ErrorState, EmptyState } from "@/components/ui/data-states";
import { ScrollText } from "lucide-react";

export default async function AuditPage() {
  const res = await fetchAuditLogs();

  return (
    <ModulePage
      title="Audit Logs"
      description="Immutable audit trail of agent actions, policy decisions, and admin changes."
      live={res.status === "ok" ? res.live : undefined}
    >
      {res.status === "error" ? (
        <ErrorState message={res.message} />
      ) : res.data.length === 0 ? (
        <EmptyState icon={ScrollText} message="No audit events found." />
      ) : (
        <DataTable
          columns={[
            { key: "action", header: "Action", render: (r) => <code className="text-xs">{r.action}</code> },
            { key: "actor", header: "Actor", render: (r) => <code className="text-xs">{r.actor}</code> },
            { key: "resource", header: "Resource", render: (r) => r.resourceType },
            { key: "created", header: "When", render: (r) => new Date(r.createdAt).toLocaleString() },
          ]}
          rows={res.data}
          rowKey={(r) => r.id}
        />
      )}
    </ModulePage>
  );
}

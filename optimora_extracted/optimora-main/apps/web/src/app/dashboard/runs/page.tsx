import { fetchRuns } from "@/lib/data";
import { ModulePage } from "@/components/dashboard/module-page";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorState, EmptyState } from "@/components/ui/data-states";
import { Play } from "lucide-react";

export default async function RunsPage() {
  const res = await fetchRuns();

  return (
    <ModulePage
      title="Runtime Runs"
      description="Live and historical agent execution runs."
      live={res.status === "ok" ? res.live : undefined}
    >
      {res.status === "error" ? (
        <ErrorState message={res.message} />
      ) : res.data.length === 0 ? (
        <EmptyState icon={Play} message="No runs found." />
      ) : (
        <DataTable
          columns={[
            { key: "id", header: "Run ID", render: (r) => <code className="text-xs">{r.id}</code> },
            { key: "agent", header: "Agent", render: (r) => <code className="text-xs">{r.agentId}</code> },
            { key: "provider", header: "Provider", render: (r) => r.modelProvider },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "created", header: "Started", render: (r) => new Date(r.createdAt).toLocaleDateString() },
          ]}
          rows={res.data}
          rowKey={(r) => r.id}
        />
      )}
    </ModulePage>
  );
}

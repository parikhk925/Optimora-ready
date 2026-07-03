import { fetchAgents } from "@/lib/data";
import { ModulePage } from "@/components/dashboard/module-page";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorState, EmptyState } from "@/components/ui/data-states";
import { Bot } from "lucide-react";

export default async function AgentsPage() {
  const res = await fetchAgents();

  return (
    <ModulePage
      title="Agents"
      description="Agent definitions deployed in your workspaces."
      live={res.status === "ok" ? res.live : undefined}
    >
      {res.status === "error" ? (
        <ErrorState message={res.message} />
      ) : res.data.length === 0 ? (
        <EmptyState icon={Bot} message="No agents deployed yet." />
      ) : (
        <DataTable
          columns={[
            { key: "id", header: "Agent ID", render: (r) => <code className="text-xs">{r.agentId}</code> },
            { key: "provider", header: "Model Provider", render: (r) => r.modelProvider },
            { key: "version", header: "Version", render: (r) => `v${r.agentVersion}` },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "created", header: "Created", render: (r) => new Date(r.createdAt).toLocaleDateString() },
          ]}
          rows={res.data}
          rowKey={(r) => r.agentId}
        />
      )}
    </ModulePage>
  );
}

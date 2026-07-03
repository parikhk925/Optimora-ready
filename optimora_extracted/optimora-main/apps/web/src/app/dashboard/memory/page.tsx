import { fetchMemory } from "@/lib/data";
import { ModulePage } from "@/components/dashboard/module-page";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorState, EmptyState } from "@/components/ui/data-states";
import { Brain } from "lucide-react";

export default async function MemoryPage() {
  const res = await fetchMemory();

  return (
    <ModulePage
      title="Memory"
      description="Long-term agent memory records, facts, and context entries."
      live={res.status === "ok" ? res.live : undefined}
    >
      {res.status === "error" ? (
        <ErrorState message={res.message} />
      ) : res.data.length === 0 ? (
        <EmptyState icon={Brain} message="No memory records found." />
      ) : (
        <DataTable
          columns={[
            { key: "id", header: "ID", render: (r) => <code className="text-xs">{r.id}</code> },
            { key: "agent", header: "Agent", render: (r) => <code className="text-xs">{r.agentId}</code> },
            { key: "type", header: "Type", render: (r) => r.type },
            { key: "importance", header: "Importance", render: (r) => r.importance.toFixed(2) },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "created", header: "Created", render: (r) => new Date(r.createdAt).toLocaleDateString() },
          ]}
          rows={res.data}
          rowKey={(r) => r.id}
        />
      )}
    </ModulePage>
  );
}

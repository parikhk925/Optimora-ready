import { fetchTools } from "@/lib/data";
import { ModulePage } from "@/components/dashboard/module-page";
import { DataTable } from "@/components/ui/data-table";
import { ErrorState, EmptyState } from "@/components/ui/data-states";
import { Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function ToolsPage() {
  const res = await fetchTools();

  return (
    <ModulePage
      title="Tools"
      description="Tools available to agents. Entitlement-gated by plan."
      live={res.status === "ok" ? res.live : undefined}
    >
      {res.status === "error" ? (
        <ErrorState message={res.message} />
      ) : res.data.length === 0 ? (
        <EmptyState icon={Wrench} message="No tools registered. Tools entitlement required." />
      ) : (
        <DataTable
          columns={[
            { key: "name", header: "Tool Name", render: (r) => <code className="font-mono text-sm">{r.name}</code> },
            { key: "status", header: "Status", render: () => <Badge variant="success">available</Badge> },
          ]}
          rows={res.data}
          rowKey={(r) => r.name}
        />
      )}
    </ModulePage>
  );
}

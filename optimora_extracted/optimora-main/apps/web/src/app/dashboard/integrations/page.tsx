import { listWorkspaceIntegrations } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";
import { ModulePage } from "@/components/dashboard/module-page";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/data-states";
import { Plug } from "lucide-react";

export default async function IntegrationsPage() {
  const session = await requireSession();
  const integrations = await listWorkspaceIntegrations(getAutomationContextFromSession(session));

  return (
    <ModulePage
      title="Integrations"
      description="Workspace integration requirements and connection status. External actions stay blocked until connected."
      live={integrations.some((integration) => integration.status === "connected")}
    >
      {integrations.length === 0 ? (
        <EmptyState icon={Plug} message="No integration definitions available." />
      ) : (
        <DataTable
          columns={[
            { key: "name", header: "Integration", render: (r) => <span className="text-sm font-medium">{r.name}</span> },
            { key: "category", header: "Category", render: (r) => <span className="text-sm text-gray-600">{r.category}</span> },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "description", header: "Notes", render: (r) => <span className="text-sm text-gray-500">{r.description}</span> },
          ]}
          rows={integrations}
          rowKey={(r) => r.key}
        />
      )}
    </ModulePage>
  );
}

import { fetchJurisdictions } from "@/lib/data";
import { ModulePage } from "@/components/dashboard/module-page";
import { DataTable } from "@/components/ui/data-table";
import { ErrorState, EmptyState } from "@/components/ui/data-states";
import { Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function JurisdictionPage() {
  const res = await fetchJurisdictions();

  return (
    <ModulePage
      title="Jurisdiction & Compliance"
      description="Jurisdiction contexts and data residency configuration per workspace."
      live={res.status === "ok" ? res.live : undefined}
    >
      {res.status === "error" ? (
        <ErrorState message={res.message} />
      ) : res.data.length === 0 ? (
        <EmptyState icon={Globe} message="No jurisdiction configurations found." />
      ) : (
        <DataTable
          columns={[
            { key: "code", header: "Code", render: (r) => <Badge variant="muted">{r.code}</Badge> },
            { key: "label", header: "Jurisdiction", render: (r) => r.label },
            { key: "residency", header: "Data Residency", render: (r) => <code className="text-xs">{r.dataResidency}</code> },
          ]}
          rows={res.data}
          rowKey={(r) => r.id}
        />
      )}
    </ModulePage>
  );
}

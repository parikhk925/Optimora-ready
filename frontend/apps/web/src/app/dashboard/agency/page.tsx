import { fetchAgencyProfile } from "@/lib/data";
import { ModulePage } from "@/components/dashboard/module-page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/data-states";

export default async function AgencyPage() {
  const res = await fetchAgencyProfile();

  return (
    <ModulePage
      title="Agency & White-label Settings"
      description="Agency profile, client workspaces, locales, currencies, and branding."
      live={res.status === "ok" ? res.live : undefined}
    >
      {res.status === "error" ? (
        <ErrorState message={res.message} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-gray-700">Profile</h2></CardHeader>
            <CardBody className="space-y-3 text-sm">
              <Row label="Agency ID" value={<code className="text-xs">{res.data.id}</code>} />
              <Row label="Name" value={res.data.name} />
              <Row label="Default Locale" value={<Badge variant="muted">{res.data.defaultLocale}</Badge>} />
              <Row label="Default Currency" value={<Badge variant="muted">{res.data.defaultCurrency}</Badge>} />
              <Row label="White-label" value={res.data.whiteLabelEnabled ? <Badge variant="success">Enabled</Badge> : <Badge variant="muted">Disabled</Badge>} />
              <Row label="Custom Domain" value={res.data.customDomainEnabled ? <Badge variant="success">Enabled</Badge> : <Badge variant="muted">Disabled</Badge>} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-gray-700">Enabled Modules</h2></CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {res.data.enabledModules.map((m) => (
                  <Badge key={m} variant="default">{m}</Badge>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </ModulePage>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

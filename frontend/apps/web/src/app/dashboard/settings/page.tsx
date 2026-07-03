import { ModulePage } from "@/components/dashboard/module-page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getTenantContext } from "@/lib/auth";

export default function SettingsPage() {
  const ctx = getTenantContext();

  return (
    <ModulePage
      title="Settings"
      description="API keys, team members, RBAC roles, and workspace configuration."
      live={false}
    >
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-gray-700">Workspace Info</h2></CardHeader>
        <CardBody className="space-y-3 text-sm">
          {[
            ["Tenant ID", ctx.tenantId],
            ["Org ID", ctx.orgId],
            ["Plan", ctx.planKey],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <span className="text-gray-500">{label}</span>
              <code className="text-xs text-gray-700">{value}</code>
            </div>
          ))}
        </CardBody>
      </Card>
      <p className="text-xs text-gray-400">API key management and team members will be available once admin session auth is wired.</p>
    </ModulePage>
  );
}

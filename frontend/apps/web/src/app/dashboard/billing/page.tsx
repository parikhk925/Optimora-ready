import { fetchUsage, fetchPlans } from "@/lib/data";
import { ModulePage } from "@/components/dashboard/module-page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/data-states";
import { getTenantContext } from "@/lib/auth";
import { getUsageSummary, getWorkspaceSubscription, getBillingPlans } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";
import { CheckoutButton } from "@/components/dashboard/checkout-button";

function QuotaRow({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{limit !== null ? `${used.toLocaleString()} / ${limit.toLocaleString()}` : `${used.toLocaleString()} / ∞`}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${pct > 85 ? "bg-red-400" : pct > 65 ? "bg-amber-400" : "bg-brand-500"}`}
          style={{ width: `${limit ? pct : 0}%` }}
        />
      </div>
    </div>
  );
}

export default async function BillingPage() {
  const [usageRes, plansRes] = await Promise.all([fetchUsage(), fetchPlans()]);
  const ctx = getTenantContext();
  const session = await requireSession();
  const automationCtx = getAutomationContextFromSession(session);
  const [automationUsage, subscription, automationPlans] = await Promise.all([
    getUsageSummary(automationCtx),
    getWorkspaceSubscription(automationCtx),
    getBillingPlans(),
  ]);

  if (usageRes.status === "error") return (
    <ModulePage title="Usage & Billing" description="Monitor usage and plan limits." live={false}>
      <ErrorState message={usageRes.message} />
    </ModulePage>
  );

  const { usage, quotas } = usageRes.data;
  const currentPlan = plansRes.status === "ok" ? plansRes.data.find((p) => p.key === ctx.planKey) : null;

  return (
    <ModulePage
      title="Usage & Billing"
      description="Monthly usage, quota consumption, and plan entitlements. No payment data stored."
      live={usageRes.live}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Usage summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">This Month</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                ["Est. Cost", `$${usage.estimatedCostUsd.toFixed(2)}`],
                ["Invocations", usage.invocationCount.toLocaleString()],
                ["Tasks", usage.taskCount.toLocaleString()],
                ["Memory Records", usage.activeMemoryRecords.toLocaleString()],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-lg font-semibold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3 pt-2">
              <QuotaRow label="Monthly Tasks" used={quotas.monthlyTasks.used} limit={quotas.monthlyTasks.limit} />
              <QuotaRow label="Model Spend (USD)" used={quotas.monthlyModelUsageUsd.used} limit={quotas.monthlyModelUsageUsd.limit} />
              <QuotaRow label="Memory Records" used={quotas.memoryRecords.used} limit={quotas.memoryRecords.limit} />
            </div>
          </CardBody>
        </Card>

        {/* Plan card */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Current Plan</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold capitalize text-gray-900">{ctx.planKey}</span>
              <Badge variant="success">active</Badge>
            </div>
            {currentPlan && (
              <div className="space-y-1 text-xs text-gray-500">
                <p>Modules: {currentPlan.limits.enabledModules.join(", ")}</p>
                <p>Seats: {currentPlan.limits.maxSeats ?? "Unlimited"}</p>
                <p>Workspaces: {currentPlan.limits.maxClientWorkspaces ?? "Unlimited"}</p>
                <p>White-label: {currentPlan.limits.whiteLabelEnabled ? "Yes" : "No"}</p>
              </div>
            )}
            <p className="text-[11px] text-gray-400">Payment is managed outside this portal. Contact your account manager to upgrade.</p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5" data-testid="automation-billing-section">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Automation OS Plan &amp; Usage</h2>
            <p className="text-xs text-gray-500">Real usage events recorded by the workflow execution engine this month.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold capitalize text-gray-900">{subscription.planName}</span>
            <Badge variant="success">{subscription.status}</Badge>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mb-4">
          <QuotaRow label="Workflow Runs" used={automationUsage.counts.workflow_run} limit={automationUsage.limits.maxWorkflowRunsPerMonth} />
          <QuotaRow label="AI Agent Runs" used={automationUsage.counts.agent_run} limit={automationUsage.limits.maxAgentRunsPerMonth} />
          <QuotaRow label="Integration Actions" used={automationUsage.counts.integration_action} limit={automationUsage.limits.maxIntegrationActionsPerMonth} />
        </div>

        <div className="flex flex-wrap gap-2 mb-4" data-testid="automation-plan-catalog">
          {automationPlans.map((plan) => (
            <div key={plan.key} className={`rounded-xl border p-3 text-xs ${plan.key === subscription.planKey ? "border-indigo-300 bg-indigo-50" : "border-gray-200"}`}>
              <p className="font-semibold text-gray-900">{plan.name}</p>
              <p className="text-gray-500">${plan.priceMonthlyUsd}/mo</p>
            </div>
          ))}
        </div>

        {subscription.checkoutRequired && <CheckoutButton />}
        <p className="text-[11px] text-gray-400 mt-2">
          Billing is usage-tracking only in this build — real Stripe/Razorpay checkout requires setup (see docs/BILLING_AND_USAGE.md).
        </p>
      </div>
    </ModulePage>
  );
}

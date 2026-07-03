"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  STEPS, INITIAL_STATE, JURISDICTION_OPTIONS, MODULE_OPTIONS, PLAN_OPTIONS,
  validateAgencyProfile, validateBranding, validateClientWorkspace,
  type OnboardingState, type OnboardingStep,
} from "@/lib/onboarding";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IndustryIconFromMeta } from "@/components/ui/industry-icon";
import { INDUSTRY_ICON_REGISTRY } from "@/lib/industry-icons";

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEP_LABELS: Record<OnboardingStep, string> = {
  "agency-profile": "Agency",
  "branding": "Branding",
  "client-workspace": "Workspace",
  "jurisdiction": "Jurisdiction",
  "modules": "Modules",
  "plan": "Plan",
  "review": "Review",
};

function StepIndicator({ current, steps }: { current: number; steps: readonly OnboardingStep[] }) {
  return (
    <div className="mb-8 flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s} className="flex flex-1 items-center">
          <div className={cn(
            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            i < current ? "bg-brand-600 text-white"
              : i === current ? "bg-brand-600 text-white ring-4 ring-brand-100"
              : "bg-gray-200 text-gray-500",
          )}>
            {i < current ? "✓" : i + 1}
          </div>
          <span className={cn("ml-1.5 hidden text-[11px] font-medium sm:block", i <= current ? "text-brand-700" : "text-gray-400")}>
            {STEP_LABELS[s]}
          </span>
          {i < steps.length - 1 && <div className={cn("mx-2 flex-1 h-px", i < current ? "bg-brand-400" : "bg-gray-200")} />}
        </div>
      ))}
    </div>
  );
}

// ─── Input helpers ────────────────────────────────────────────────────────────

function Field({ label, error, children, hint }: { label: string; error?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", autoFocus, disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; autoFocus?: boolean; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      disabled={disabled}
      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
    />
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
    >
      {children}
    </select>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function AgencyProfileStep({ state, setState, error }: { state: OnboardingState; setState: (s: OnboardingState) => void; error: string | null }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Tell us about your agency</h2>
        <p className="mt-1 text-sm text-gray-500">This is how your agency will appear to clients.</p>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Field label="Agency name *">
        <Input
          value={state.agencyProfile.agencyName}
          onChange={(v) => setState({ ...state, agencyProfile: { ...state.agencyProfile, agencyName: v } })}
          placeholder="Acme Financial Agency"
          autoFocus
        />
      </Field>
      <Field label="Support email" hint="Shown to clients for help requests.">
        <Input
          type="email"
          value={state.agencyProfile.supportEmail}
          onChange={(v) => setState({ ...state, agencyProfile: { ...state.agencyProfile, supportEmail: v } })}
          placeholder="support@acme.com"
        />
      </Field>
    </div>
  );
}

function BrandingStep({ state, setState, error }: { state: OnboardingState; setState: (s: OnboardingState) => void; error: string | null }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">White-label branding</h2>
        <p className="mt-1 text-sm text-gray-500">Customise how the portal looks for your clients.</p>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Field label="Brand name *" hint="Shown in the portal header instead of 'Optimora'.">
        <Input
          value={state.branding.brandName}
          onChange={(v) => setState({ ...state, branding: { ...state.branding, brandName: v } })}
          placeholder="Acme AI"
          autoFocus
        />
      </Field>
      <Field label="Accent color" hint="Hex color for buttons and highlights.">
        <div className="flex items-center gap-3">
          <Input
            value={state.branding.accentColor}
            onChange={(v) => setState({ ...state, branding: { ...state.branding, accentColor: v } })}
            placeholder="#4f46e5"
          />
          <div className="h-9 w-9 flex-shrink-0 rounded-lg border border-gray-200" style={{ backgroundColor: state.branding.accentColor || "#4f46e5" }} />
        </div>
      </Field>
      <Field label="Logo URL" hint="Public HTTPS URL of your logo image. Stored as a reference — not uploaded here.">
        <Input
          value={state.branding.logoUrl}
          onChange={(v) => setState({ ...state, branding: { ...state.branding, logoUrl: v } })}
          placeholder="https://acme.com/logo.png"
        />
      </Field>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={state.branding.whiteLabelEnabled}
          onChange={(e) => setState({ ...state, branding: { ...state.branding, whiteLabelEnabled: e.target.checked } })}
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm text-gray-700">Enable white-label mode (hides Optimora branding)</span>
      </label>
    </div>
  );
}

function ClientWorkspaceStep({ state, setState, error }: { state: OnboardingState; setState: (s: OnboardingState) => void; error: string | null }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">First client workspace</h2>
        <p className="mt-1 text-sm text-gray-500">Create the first workspace for a client or internal team.</p>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Field label="Workspace name *">
        <Input
          value={state.clientWorkspace.clientName}
          onChange={(v) => setState({ ...state, clientWorkspace: { ...state.clientWorkspace, clientName: v } })}
          placeholder="Internal Ops"
          autoFocus
        />
      </Field>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Industry <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
        <p className="text-xs text-gray-400 mb-2">Helps configure relevant agent defaults.</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {INDUSTRY_ICON_REGISTRY.filter((i) => i.key !== "other").map((meta) => {
            const selected = state.clientWorkspace.industry === meta.label;
            return (
              <button
                key={meta.key}
                type="button"
                onClick={() => setState({
                  ...state,
                  clientWorkspace: {
                    ...state.clientWorkspace,
                    industry: selected ? "" : meta.label,
                  },
                })}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs transition-colors",
                  selected
                    ? "border-brand-400 bg-brand-50"
                    : "border-gray-200 hover:bg-gray-50",
                )}
              >
                <IndustryIconFromMeta meta={meta} size="sm" />
                <span className={cn("leading-tight", selected ? "text-brand-800 font-medium" : "text-gray-600")}>
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function JurisdictionStep({ state, setState }: { state: OnboardingState; setState: (s: OnboardingState) => void }) {
  const toggle = (code: string) => {
    const existing = state.jurisdiction.allowedClientRegions;
    const next = existing.includes(code) ? existing.filter((c) => c !== code) : [...existing, code];
    setState({ ...state, jurisdiction: { ...state.jurisdiction, allowedClientRegions: next.length ? next : [code] } });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Jurisdiction & data residency</h2>
        <p className="mt-1 text-sm text-gray-500">
          Choose the regions your clients operate in. This sets data residency and compliance context for agents.
        </p>
      </div>
      <Field label="Primary client region">
        <Select
          value={state.jurisdiction.countryCode}
          onChange={(v) => setState({ ...state, jurisdiction: { ...state.jurisdiction, countryCode: v } })}
        >
          {JURISDICTION_OPTIONS.map((j) => (
            <option key={j.code} value={j.code}>{j.label}</option>
          ))}
        </Select>
      </Field>
      <Field label="Allowed client regions" hint="Select all regions your clients may operate in.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {JURISDICTION_OPTIONS.map((j) => {
            const checked = state.jurisdiction.allowedClientRegions.includes(j.code);
            return (
              <label key={j.code} className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                checked ? "border-brand-400 bg-brand-50 text-brand-800" : "border-gray-200 text-gray-600 hover:bg-gray-50",
              )}>
                <input type="checkbox" checked={checked} onChange={() => toggle(j.code)} className="sr-only" />
                <span className={cn("h-3.5 w-3.5 flex-shrink-0 rounded border-2", checked ? "border-brand-500 bg-brand-500" : "border-gray-300")} />
                {j.label.split(" (")[0]}
              </label>
            );
          })}
        </div>
      </Field>
      {state.jurisdiction.countryCode === "GLOBAL" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <strong>Global mode:</strong> Agents will use a safe generic jurisdiction fallback with an explicit disclaimer. No country-specific rules apply. You can switch to a specific jurisdiction later.
        </div>
      )}
    </div>
  );
}

function ModulesStep({ state, setState }: { state: OnboardingState; setState: (s: OnboardingState) => void }) {
  const toggle = (key: string) => {
    const mods = state.modules.enabledModules;
    const next = mods.includes(key) ? mods.filter((m) => m !== key) : [...mods, key];
    // runtime is always required
    const safe = next.includes("runtime") ? next : ["runtime", ...next];
    setState({ ...state, modules: { ...state.modules, enabledModules: safe } });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Enable modules</h2>
        <p className="mt-1 text-sm text-gray-500">Choose which AI capabilities to enable. Runtime is always required.</p>
      </div>
      <div className="space-y-2">
        {MODULE_OPTIONS.map((m) => {
          const checked = state.modules.enabledModules.includes(m.key);
          const locked = m.key === "runtime";
          return (
            <label key={m.key} className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
              checked ? "border-brand-300 bg-brand-50" : "border-gray-200 hover:bg-gray-50",
              locked && "opacity-75 cursor-not-allowed",
            )}>
              <input
                type="checkbox"
                checked={checked}
                disabled={locked}
                onChange={() => !locked && toggle(m.key)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{m.label}</span>
                  {locked && <Badge variant="muted">required</Badge>}
                  {m.key === "financeAgent" && <Badge variant="warning">jurisdiction-aware</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{m.description}</p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function PlanStep({ state, setState }: { state: OnboardingState; setState: (s: OnboardingState) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Choose a plan</h2>
        <p className="mt-1 text-sm text-gray-500">You can change this later. No payment collected here.</p>
      </div>
      <div className="space-y-2">
        {PLAN_OPTIONS.map((p) => {
          const selected = state.plan.planKey === p.key;
          return (
            <label key={p.key} className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
              selected ? "border-brand-400 bg-brand-50" : "border-gray-200 hover:bg-gray-50",
            )}>
              <input
                type="radio"
                name="plan"
                value={p.key}
                checked={selected}
                onChange={() => setState({ ...state, plan: { planKey: p.key } })}
                className="mt-0.5 h-4 w-4 border-gray-300 text-brand-600"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{p.label}</span>
                  <span className="text-sm font-semibold text-brand-700">{p.price}</span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{p.description}</p>
              </div>
            </label>
          );
        })}
      </div>
      <p className="text-xs text-gray-400">Payment and billing setup is handled by your account manager after onboarding.</p>
    </div>
  );
}

function ReviewStep({ state }: { state: OnboardingState }) {
  const jurisdiction = JURISDICTION_OPTIONS.find((j) => j.code === state.jurisdiction.countryCode);
  const plan = PLAN_OPTIONS.find((p) => p.key === state.plan.planKey);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Review your setup</h2>
        <p className="mt-1 text-sm text-gray-500">Confirm everything looks right before we create your agency.</p>
      </div>

      {[
        {
          title: "Agency Profile",
          rows: [
            ["Agency name", state.agencyProfile.agencyName || "—"],
            ["Support email", state.agencyProfile.supportEmail || "—"],
          ],
        },
        {
          title: "Branding",
          rows: [
            ["Brand name", state.branding.brandName || "—"],
            ["Accent color", state.branding.accentColor],
            ["White-label", state.branding.whiteLabelEnabled ? "Enabled" : "Disabled"],
          ],
        },
        {
          title: "Client Workspace",
          rows: [
            ["Name", state.clientWorkspace.clientName || "—"],
            ["Industry", state.clientWorkspace.industry || "—"],
          ],
        },
        {
          title: "Jurisdiction",
          rows: [
            ["Primary region", jurisdiction?.label ?? state.jurisdiction.countryCode],
            ["Allowed regions", state.jurisdiction.allowedClientRegions.join(", ")],
          ],
        },
        {
          title: "Modules",
          rows: [["Enabled", state.modules.enabledModules.join(", ")]],
        },
        {
          title: "Plan",
          rows: [["Selected", `${plan?.label ?? state.plan.planKey} — ${plan?.price ?? ""}`]],
        },
      ].map((section) => (
        <Card key={section.title}>
          <CardHeader className="py-3"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{section.title}</p></CardHeader>
          <CardBody className="py-3 space-y-1">
            {section.rows.map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900 text-right max-w-xs">{value}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentStep = STEPS[stepIndex]!;

  function validateCurrent(): string | null {
    if (currentStep === "agency-profile") return validateAgencyProfile(state.agencyProfile);
    if (currentStep === "branding") return validateBranding(state.branding);
    if (currentStep === "client-workspace") return validateClientWorkspace(state.clientWorkspace);
    return null;
  }

  function next() {
    const err = validateCurrent();
    if (err) { setStepError(err); return; }
    setStepError(null);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function prev() {
    setStepError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // 1. Save agency profile
      const profileRes = await fetch("/api/onboarding/agency-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agencyName: state.agencyProfile.agencyName,
          brandName: state.branding.brandName,
          supportEmail: state.agencyProfile.supportEmail || undefined,
          accentColor: state.branding.accentColor || undefined,
          logoUrl: state.branding.logoUrl || undefined,
          whiteLabelEnabled: state.branding.whiteLabelEnabled,
          defaultLocale: JURISDICTION_OPTIONS.find((j) => j.code === state.jurisdiction.countryCode)?.locale ?? "en-US",
          defaultCurrency: JURISDICTION_OPTIONS.find((j) => j.code === state.jurisdiction.countryCode)?.currency ?? "USD",
          allowedClientRegions: state.jurisdiction.allowedClientRegions,
          enabledModules: state.modules.enabledModules,
        }),
      });
      if (!profileRes.ok) {
        const err = await profileRes.json() as { error?: string; message?: string };
        setSubmitError(err.message ?? err.error ?? "Failed to save agency profile.");
        setSubmitting(false);
        return;
      }

      // 2. Save client workspace
      const wsRes = await fetch("/api/onboarding/client-workspace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientName: state.clientWorkspace.clientName,
          industry: state.clientWorkspace.industry || undefined,
          countryCode: state.jurisdiction.countryCode,
          enabledModules: state.modules.enabledModules,
          enabledAgents: state.modules.enabledAgents,
        }),
      });
      if (!wsRes.ok) {
        const err = await wsRes.json() as { error?: string; message?: string };
        setSubmitError(err.message ?? err.error ?? "Failed to create client workspace.");
        setSubmitting(false);
        return;
      }

      // Done — redirect to dashboard
      router.replace("/dashboard");
    } catch {
      setSubmitError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <div>
      <StepIndicator current={stepIndex} steps={STEPS} />

      <Card>
        <CardBody className="py-6 space-y-6">
          {currentStep === "agency-profile" && <AgencyProfileStep state={state} setState={setState} error={stepError} />}
          {currentStep === "branding" && <BrandingStep state={state} setState={setState} error={stepError} />}
          {currentStep === "client-workspace" && <ClientWorkspaceStep state={state} setState={setState} error={stepError} />}
          {currentStep === "jurisdiction" && <JurisdictionStep state={state} setState={setState} />}
          {currentStep === "modules" && <ModulesStep state={state} setState={setState} />}
          {currentStep === "plan" && <PlanStep state={state} setState={setState} />}
          {currentStep === "review" && <ReviewStep state={state} />}

          {submitError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={prev}
              disabled={stepIndex === 0}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:invisible"
            >
              ← Back
            </button>
            {isLastStep ? (
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {submitting ? "Creating agency…" : "Create agency →"}
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Continue →
              </button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

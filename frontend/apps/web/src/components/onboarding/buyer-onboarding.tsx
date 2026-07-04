"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  ArrowRight, ChevronLeft, CheckCircle2, AlertCircle,
  Zap, Bot, GitBranch, FlaskConical, Users, Building2,
  ShoppingCart, Stethoscope, GraduationCap, Truck,
  CreditCard, Briefcase, UtensilsCrossed, Factory, MapPin,
  Home, Target, Send, BarChart2, MessageCircle, RefreshCw,
  CalendarCheck,
} from "lucide-react";

// ─── Industry config ──────────────────────────────────────────────────────────

interface Industry {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  href: string;
}

const INDUSTRIES: Industry[] = [
  { key: "agency", label: "Agency / Consulting", icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50", href: "/dashboard/industry/agency" },
  { key: "real-estate", label: "Real Estate", icon: Home, color: "text-emerald-600", bg: "bg-emerald-50", href: "/dashboard/industry/real-estate" },
  { key: "hr", label: "HR & Recruitment", icon: Users, color: "text-violet-600", bg: "bg-violet-50", href: "/dashboard/industry/hr" },
  { key: "ecommerce", label: "E-Commerce", icon: ShoppingCart, color: "text-orange-600", bg: "bg-orange-50", href: "/dashboard/industry/e-commerce" },
  { key: "healthcare", label: "Healthcare / Clinics", icon: Stethoscope, color: "text-rose-600", bg: "bg-rose-50", href: "/dashboard/industry/healthcare" },
  { key: "education", label: "Education", icon: GraduationCap, color: "text-amber-600", bg: "bg-amber-50", href: "/dashboard/industry/education" },
  { key: "logistics", label: "Logistics", icon: Truck, color: "text-sky-600", bg: "bg-sky-50", href: "/dashboard/industry/logistics" },
  { key: "finance", label: "Financial Services", icon: CreditCard, color: "text-slate-600", bg: "bg-slate-100", href: "/dashboard/industry/financial-services" },
  { key: "legal", label: "Legal", icon: Briefcase, color: "text-gray-600", bg: "bg-gray-100", href: "/dashboard/industry/legal" },
  { key: "restaurants", label: "Restaurants / F&B", icon: UtensilsCrossed, color: "text-rose-600", bg: "bg-rose-50", href: "/dashboard/industry/restaurants" },
  { key: "manufacturing", label: "Manufacturing", icon: Factory, color: "text-zinc-600", bg: "bg-zinc-100", href: "/dashboard/industry/manufacturing" },
  { key: "local", label: "Local Services", icon: MapPin, color: "text-pink-600", bg: "bg-pink-50", href: "/dashboard/industry/local-services" },
];

// ─── Goal config ──────────────────────────────────────────────────────────────

interface Goal {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  agents: string[];
}

const GOALS: Goal[] = [
  {
    key: "sales", label: "Grow sales & recover leads", description: "Follow up with leads, qualify prospects, revive cold contacts",
    icon: Target,
    agents: ["Prospect Research Agent", "Outreach Agent", "Follow-up Agent"],
  },
  {
    key: "support", label: "Handle customer support", description: "Resolve tickets, draft replies, escalate edge cases",
    icon: MessageCircle,
    agents: ["Support Triage Agent", "Email Reply Agent", "Escalation Agent"],
  },
  {
    key: "operations", label: "Streamline operations", description: "Automate reports, data entry, reminders, and scheduling",
    icon: RefreshCw,
    agents: ["Operations Agent", "Report Agent", "Scheduler Agent"],
  },
  {
    key: "finance", label: "Automate finance & reporting", description: "Reconcile, generate reports, send reminders — jurisdiction-aware",
    icon: BarChart2,
    agents: ["Finance / CA Agent", "Report Agent", "Invoice Reminder Agent"],
  },
  {
    key: "hr", label: "Accelerate hiring", description: "Screen resumes, rank candidates, schedule interviews",
    icon: Users,
    agents: ["Resume Parser Agent", "Candidate Screening Agent", "Interview Scheduler Agent"],
  },
  {
    key: "outreach", label: "Scale outreach & follow-up", description: "Personalised outreach drafts, sequence management, status updates",
    icon: Send,
    agents: ["Outreach Agent", "Follow-up Agent", "Prospect Research Agent"],
  },
];

// ─── Workflow preview config ───────────────────────────────────────────────────

interface WorkflowPreview {
  name: string;
  trigger: string;
  steps: { label: string; agent: string; approval: boolean }[];
  roi: string;
}

const GOAL_WORKFLOWS: Record<string, WorkflowPreview[]> = {
  sales: [
    { name: "Lead Follow-up Sequence", trigger: "New lead in CRM or CSV", steps: [{ label: "Qualify lead", agent: "Prospect Research Agent", approval: false }, { label: "Draft personalised follow-up", agent: "Outreach Agent", approval: true }, { label: "Log to CRM", agent: "CRM Update Agent", approval: false }], roi: "Recover 9+ leads/week, save 8h" },
    { name: "Daily Sales Pipeline Report", trigger: "Every morning at 8 AM", steps: [{ label: "Pull pipeline data", agent: "Operations Agent", approval: false }, { label: "Generate summary report", agent: "Report Agent", approval: false }, { label: "Deliver to inbox", agent: "Email Reply Agent", approval: false }], roi: "Save 2h/day on manual reporting" },
    { name: "Lost Lead Revival", trigger: "No response in 14 days", steps: [{ label: "Identify cold leads", agent: "Prospect Research Agent", approval: false }, { label: "Draft revival message", agent: "Outreach Agent", approval: true }, { label: "Update lead status", agent: "CRM Update Agent", approval: false }], roi: "Recover 15–20% of cold pipeline" },
  ],
  support: [
    { name: "Customer Support Triage", trigger: "Inbound email or ticket", steps: [{ label: "Classify query", agent: "Support Triage Agent", approval: false }, { label: "Draft reply", agent: "Email Reply Agent", approval: true }, { label: "Update ticket status", agent: "Operations Agent", approval: false }], roi: "Handle 80% of tickets without a human" },
    { name: "Escalation Workflow", trigger: "Unresolved ticket > 24h", steps: [{ label: "Detect stale ticket", agent: "Support Triage Agent", approval: false }, { label: "Escalate to human", agent: "Escalation Agent", approval: true }], roi: "Zero missed SLAs" },
    { name: "Daily Support Summary", trigger: "Every evening at 6 PM", steps: [{ label: "Aggregate ticket data", agent: "Operations Agent", approval: false }, { label: "Generate summary", agent: "Report Agent", approval: false }], roi: "Save 1h/day per support manager" },
  ],
  operations: [
    { name: "Daily Business Report", trigger: "Every morning at 7 AM", steps: [{ label: "Collect cross-system data", agent: "Operations Agent", approval: false }, { label: "Generate report", agent: "Report Agent", approval: false }, { label: "Deliver to email", agent: "Email Reply Agent", approval: false }], roi: "Save 15h/month on manual reporting" },
    { name: "Invoice Reminder Sequence", trigger: "Invoice overdue by 7 days", steps: [{ label: "Identify overdue invoices", agent: "Finance / CA Agent", approval: false }, { label: "Draft reminder email", agent: "Email Reply Agent", approval: true }, { label: "Log to accounting", agent: "Operations Agent", approval: false }], roi: "Recover 20–30% faster payments" },
    { name: "Meeting Notes to Actions", trigger: "Meeting transcript uploaded", steps: [{ label: "Parse transcript", agent: "Operations Agent", approval: false }, { label: "Extract action items", agent: "Report Agent", approval: false }, { label: "Send to team", agent: "Email Reply Agent", approval: true }], roi: "Never lose a meeting action item" },
  ],
  finance: [
    { name: "Invoice & Payment Reminders", trigger: "Invoice overdue", steps: [{ label: "Detect overdue invoices", agent: "Finance / CA Agent", approval: false }, { label: "Draft reminder", agent: "Email Reply Agent", approval: true }], roi: "Collect 20% faster" },
    { name: "Daily Finance Report", trigger: "Every morning", steps: [{ label: "Gather financial data", agent: "Finance / CA Agent", approval: false }, { label: "Generate jurisdiction-aware report", agent: "Report Agent", approval: false }], roi: "Save 10h/week on finance ops" },
    { name: "Monthly Reconciliation Summary", trigger: "End of month", steps: [{ label: "Reconcile transactions", agent: "Finance / CA Agent", approval: false }, { label: "Flag discrepancies for review", agent: "Report Agent", approval: true }], roi: "Reduce reconciliation time by 60%" },
  ],
  hr: [
    { name: "Resume Screening Workflow", trigger: "New job applications", steps: [{ label: "Parse resumes", agent: "Resume Parser Agent", approval: false }, { label: "Score & rank candidates", agent: "Candidate Screening Agent", approval: false }, { label: "Present shortlist for approval", agent: "Shortlist Agent", approval: true }], roi: "Cut screening time by 70%" },
    { name: "Interview Scheduling", trigger: "Candidate shortlisted", steps: [{ label: "Find available slots", agent: "Interview Scheduler Agent", approval: false }, { label: "Send interview invite", agent: "Candidate Communication Agent", approval: true }], roi: "Schedule in hours, not days" },
    { name: "Hiring Funnel Report", trigger: "Weekly", steps: [{ label: "Aggregate hiring data", agent: "Operations Agent", approval: false }, { label: "Generate funnel report", agent: "Report Agent", approval: false }], roi: "Track every stage of hiring" },
  ],
  outreach: [
    { name: "Prospect Research Workflow", trigger: "New target list uploaded", steps: [{ label: "Research each prospect", agent: "Prospect Research Agent", approval: false }, { label: "Draft personalised outreach", agent: "Outreach Agent", approval: true }], roi: "3× faster outreach at scale" },
    { name: "Follow-up Sequence", trigger: "No response in 3 days", steps: [{ label: "Identify non-responders", agent: "Prospect Research Agent", approval: false }, { label: "Draft follow-up", agent: "Outreach Agent", approval: true }], roi: "Increase reply rates by 40%" },
    { name: "Campaign Performance Summary", trigger: "Weekly", steps: [{ label: "Aggregate outreach data", agent: "Operations Agent", approval: false }, { label: "Generate campaign report", agent: "Report Agent", approval: false }], roi: "Know what's working in real time" },
  ],
};

// ─── Integration config ───────────────────────────────────────────────────────

const GOAL_INTEGRATIONS: Record<string, { name: string; status: "available" | "requires_integration" | "custom_setup" }[]> = {
  sales: [
    { name: "CSV Upload", status: "available" },
    { name: "CRM (HubSpot / Zoho)", status: "requires_integration" },
    { name: "Email (Gmail / Outlook)", status: "requires_integration" },
    { name: "WhatsApp Business", status: "custom_setup" },
  ],
  support: [
    { name: "CSV Upload", status: "available" },
    { name: "Helpdesk (Freshdesk / Zendesk)", status: "requires_integration" },
    { name: "Email (Gmail / Outlook)", status: "requires_integration" },
  ],
  operations: [
    { name: "CSV Upload", status: "available" },
    { name: "Google Sheets", status: "requires_integration" },
    { name: "Email", status: "requires_integration" },
    { name: "Webhook", status: "available" },
  ],
  finance: [
    { name: "CSV Upload", status: "available" },
    { name: "Accounting Software", status: "requires_integration" },
    { name: "Email", status: "requires_integration" },
  ],
  hr: [
    { name: "CSV Upload", status: "available" },
    { name: "ATS System", status: "requires_integration" },
    { name: "Google Calendar", status: "requires_integration" },
    { name: "LinkedIn (Official API — no scraping)", status: "custom_setup" },
  ],
  outreach: [
    { name: "CSV Upload", status: "available" },
    { name: "CRM (HubSpot / Zoho)", status: "requires_integration" },
    { name: "Email (Gmail / Outlook)", status: "requires_integration" },
  ],
};

const STATUS_STYLES = {
  available: { badge: "bg-emerald-100 text-emerald-700", label: "Available now" },
  requires_integration: { badge: "bg-blue-100 text-blue-700", label: "Requires Integration" },
  custom_setup: { badge: "bg-purple-100 text-purple-700", label: "Custom Setup Required" },
};

// ─── Step components ──────────────────────────────────────────────────────────

function StepIndustry({ selected, onSelect }: { selected: string | null; onSelect: (k: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-1">Step 1 of 6</p>
        <h2 className="text-xl font-bold text-gray-900">Choose your industry</h2>
        <p className="mt-1 text-sm text-gray-500">We&apos;ll configure your AI agent team based on your sector.</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {INDUSTRIES.map((ind) => {
          const Icon = ind.icon;
          const active = selected === ind.key;
          return (
            <button
              key={ind.key}
              type="button"
              onClick={() => onSelect(ind.key)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-3.5 text-center transition-all",
                active
                  ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
              )}
            >
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", ind.bg)}>
                <Icon className={cn("h-5 w-5", ind.color)} strokeWidth={1.75} />
              </div>
              <span className={cn("text-xs font-semibold leading-tight", active ? "text-indigo-800" : "text-gray-700")}>
                {ind.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepGoal({ selected, onSelect }: { selected: string | null; onSelect: (k: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-1">Step 2 of 6</p>
        <h2 className="text-xl font-bold text-gray-900">What&apos;s your primary goal?</h2>
        <p className="mt-1 text-sm text-gray-500">Choose what you want your AI agents to focus on first.</p>
      </div>
      <div className="space-y-2">
        {GOALS.map((goal) => {
          const Icon = goal.icon;
          const active = selected === goal.key;
          return (
            <button
              key={goal.key}
              type="button"
              onClick={() => onSelect(goal.key)}
              className={cn(
                "w-full flex items-start gap-4 rounded-xl border p-4 text-left transition-all",
                active
                  ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
              )}
            >
              <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl", active ? "bg-indigo-600" : "bg-gray-100")}>
                <Icon className={cn("h-5 w-5", active ? "text-white" : "text-gray-500")} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-semibold", active ? "text-indigo-900" : "text-gray-900")}>{goal.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{goal.description}</p>
              </div>
              {active && <CheckCircle2 className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepAgentTeam({ goalKey }: { goalKey: string }) {
  const goal = GOALS.find((g) => g.key === goalKey);
  if (!goal) return null;

  const agentDetails = [
    { role: "Primary Agent", description: "Handles the core task — research, analysis, or processing", badge: "Core", color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
    { role: "Communication Agent", description: "Drafts all outbound messages for human review and approval", badge: "Requires Approval", color: "bg-amber-50 text-amber-600 border-amber-200" },
    { role: "Operations Agent", description: "Logs data, updates records, and coordinates with other tools", badge: "No Approval Needed", color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-1">Step 3 of 6</p>
        <h2 className="text-xl font-bold text-gray-900">Your AI agent team</h2>
        <p className="mt-1 text-sm text-gray-500">
          Three specialist agents, each with a defined role and approval policy.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <FlaskConical className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Sample Preview:</span> Agent team runs on sample data. Connect integrations to work on real data.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {goal.agents.map((agentName, idx) => {
          const detail = agentDetails[idx]!;
          return (
            <div key={agentName} className={cn("rounded-xl border p-4", detail.color)}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70">
                    <Bot className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">{agentName}</p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold border", detail.color)}>
                  {detail.badge}
                </span>
              </div>
              <p className="text-xs text-gray-600">{detail.description}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <p className="text-[10px] font-semibold uppercase text-gray-400">{detail.role}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">
        All sensitive actions (outbound messages, CRM updates) require manual approval before execution.
      </p>
    </div>
  );
}

function StepWorkflows({ goalKey }: { goalKey: string }) {
  const workflows = GOAL_WORKFLOWS[goalKey] ?? [];
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-1">Step 4 of 6</p>
        <h2 className="text-xl font-bold text-gray-900">Workflows included</h2>
        <p className="mt-1 text-sm text-gray-500">
          Each workflow runs your agents through a real business process — step by step, with approval checkpoints.
        </p>
      </div>

      <div className="space-y-3">
        {workflows.map((wf) => (
          <div key={wf.name} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(expanded === wf.name ? null : wf.name)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                  <GitBranch className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{wf.name}</p>
                  <p className="text-xs text-gray-400">Trigger: {wf.trigger}</p>
                </div>
              </div>
              <ChevronLeft className={cn("h-4 w-4 text-gray-400 transition-transform", expanded === wf.name ? "rotate-90" : "-rotate-90")} />
            </button>

            {expanded === wf.name && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
                <div className="space-y-2">
                  {wf.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700">{step.label}</p>
                        <p className="text-[10px] text-gray-400">{step.agent}</p>
                      </div>
                      {step.approval && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 whitespace-nowrap flex items-center gap-1">
                          <AlertCircle className="h-2.5 w-2.5" /> Approval
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2">
                  <Zap className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                  <p className="text-xs font-medium text-emerald-800">{wf.roi}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepIntegrations({ goalKey }: { goalKey: string }) {
  const integrations = GOAL_INTEGRATIONS[goalKey] ?? [];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-1">Step 5 of 6</p>
        <h2 className="text-xl font-bold text-gray-900">Required integrations</h2>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s exactly what your agents need to connect to. Nothing runs externally without your explicit setup.
        </p>
      </div>

      <div className="space-y-2.5">
        {integrations.map((intg) => {
          const style = STATUS_STYLES[intg.status];
          return (
            <div key={intg.name} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-100">
                  <CalendarCheck className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-800">{intg.name}</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", style.badge)}>
                {style.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-xs text-blue-800">
          <span className="font-semibold">Before you go live:</span> Connect your integrations via the Integrations page.
          In Sample Preview, agents use sample data and no external systems are touched.
        </p>
      </div>
    </div>
  );
}

function StepDeploy({ industryKey, goalKey, onGoToDashboard }: { industryKey: string; goalKey: string; onGoToDashboard: () => void }) {
  const industry = INDUSTRIES.find((i) => i.key === industryKey);
  const goal = GOALS.find((g) => g.key === goalKey);
  const Icon = industry?.icon ?? Building2;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-1">Step 6 of 6</p>
        <h2 className="text-xl font-bold text-gray-900">Ready to deploy</h2>
        <p className="mt-1 text-sm text-gray-500">
          Your AI agent team is configured. Choose how you&apos;d like to get started.
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500 mb-3">Your setup</p>
        <div className="flex items-center gap-3 mb-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", industry?.bg ?? "bg-gray-50")}>
            <Icon className={cn("h-5 w-5", industry?.color ?? "text-gray-600")} strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-bold text-indigo-900">{industry?.label ?? "—"}</p>
            <p className="text-xs text-indigo-600">{goal?.label ?? "—"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {goal?.agents.map((a) => (
            <span key={a} className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-200">
              {a}
            </span>
          ))}
        </div>
      </div>

      {/* Demo mode notice */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <FlaskConical className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800 mb-1">Sample Preview — safe to explore</p>
            <p className="text-xs text-amber-700">
              Your first workflow will run on sample data. No emails are sent, no CRM is modified, and no external systems are touched until you explicitly connect them.
            </p>
          </div>
        </div>
      </div>

      {/* CTA options */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onGoToDashboard}
          className="w-full flex items-center justify-between rounded-xl bg-indigo-600 px-5 py-3.5 text-left hover:bg-indigo-700 transition-colors"
        >
          <div>
            <p className="text-sm font-bold text-white">Deploy first workflow →</p>
            <p className="text-xs text-indigo-200 mt-0.5">Start in Sample Preview — no integration needed</p>
          </div>
          <ArrowRight className="h-5 w-5 text-white" />
        </button>

        <a
          href={industry?.href ?? "/dashboard/packs"}
          className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-gray-900">View {industry?.label} industry pack</p>
            <p className="text-xs text-gray-400 mt-0.5">See all workflows, agents, and ROI estimates</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </a>
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEP_LABELS = ["Industry", "Goal", "Agent Team", "Workflows", "Integrations", "Deploy"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-7 flex items-center gap-1">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex flex-1 items-center">
          <div className={cn(
            "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all",
            i < current ? "bg-indigo-600 text-white" :
              i === current ? "bg-indigo-600 text-white ring-4 ring-indigo-100" :
                "bg-gray-200 text-gray-500",
          )}>
            {i < current ? "✓" : i + 1}
          </div>
          <span className={cn("ml-1 hidden text-[10px] font-medium sm:block", i <= current ? "text-indigo-700" : "text-gray-400")}>
            {label}
          </span>
          {i < STEP_LABELS.length - 1 && (
            <div className={cn("mx-1 flex-1 h-px", i < current ? "bg-indigo-400" : "bg-gray-200")} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BuyerOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);

  const canProceed = () => {
    if (step === 0) return industry !== null;
    if (step === 1) return goal !== null;
    return true;
  };

  const next = () => setStep((s) => Math.min(5, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const handleDeploy = () => {
    router.push("/dashboard/run");
  };

  return (
    <div>
      <StepIndicator current={step} />

      <div className="min-h-[420px]">
        {step === 0 && <StepIndustry selected={industry} onSelect={setIndustry} />}
        {step === 1 && <StepGoal selected={goal} onSelect={setGoal} />}
        {step === 2 && goal && <StepAgentTeam goalKey={goal} />}
        {step === 3 && goal && <StepWorkflows goalKey={goal} />}
        {step === 4 && goal && <StepIntegrations goalKey={goal} />}
        {step === 5 && industry && goal && (
          <StepDeploy industryKey={industry} goalKey={goal} onGoToDashboard={handleDeploy} />
        )}
      </div>

      {/* Navigation */}
      {step < 5 && (
        <div className="mt-7 flex items-center justify-between border-t border-gray-100 pt-5">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors",
              step === 0 && "invisible",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <button
            type="button"
            onClick={next}
            disabled={!canProceed()}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all",
              canProceed()
                ? "bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                : "bg-gray-200 text-gray-400 cursor-not-allowed",
            )}
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

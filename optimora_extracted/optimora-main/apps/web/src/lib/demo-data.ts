/**
 * Demo workspace data (T-25.1).
 * Deterministic, safe, no real secrets or real customer data.
 * Used in dev/demo mode by the data adapter and the Run Agent page.
 * All agent/task IDs are stable slugs — safe to hardcode in tests.
 */

// ── Agency + workspace ────────────────────────────────────────────────────────

export const DEMO_AGENCY = {
  id: "demo-agency-001",
  agencyName: "Meridian Consulting Group",
  brandName: "Meridian AI",
  supportEmail: "support@meridian-demo.local",
  accentColor: "#4f46e5",
  whiteLabelEnabled: false,
  defaultLocale: "en-US",
  defaultCurrency: "USD",
  allowedClientRegions: ["US", "CA", "GB", "IN", "GLOBAL"],
  enabledModules: ["runtime", "memory", "tools", "salesAgent", "supportAgent", "financeAgent", "researchAgent"],
};

export const DEMO_WORKSPACES = [
  {
    id: "ws-acme-001",
    clientName: "Acme Corp (US)",
    industry: "Technology",
    countryCode: "US",
    status: "active",
  },
  {
    id: "ws-maple-002",
    clientName: "Maple Financial (CA)",
    industry: "Financial Services",
    countryCode: "CA",
    status: "active",
  },
  {
    id: "ws-thames-003",
    clientName: "Thames Advisory (GB)",
    industry: "Professional Services",
    countryCode: "GB",
    status: "active",
  },
  {
    id: "ws-veda-004",
    clientName: "Veda Partners (IN)",
    industry: "Financial Services",
    countryCode: "IN",
    status: "active",
  },
];

// ── Jurisdictions ─────────────────────────────────────────────────────────────

export const DEMO_JURISDICTIONS = [
  { code: "US", label: "United States", locale: "en-US", currency: "USD", taxSystem: "Federal + State", disclaimer: null },
  { code: "CA", label: "Canada", locale: "en-CA", currency: "CAD", taxSystem: "Federal (CRA) + Provincial", disclaimer: "GST/HST rates vary by province." },
  { code: "GB", label: "United Kingdom", locale: "en-GB", currency: "GBP", taxSystem: "HMRC (VAT + Corporation Tax)", disclaimer: null },
  { code: "IN", label: "India", locale: "en-IN", currency: "INR", taxSystem: "GST + Income Tax (IT Act)", disclaimer: "Rates subject to Finance Act amendments." },
  { code: "GLOBAL", label: "Global (generic)", locale: "en-US", currency: "USD", taxSystem: "N/A", disclaimer: "Generic fallback — no country-specific rules apply. Verify with a local advisor." },
];

// ── Sample agents ─────────────────────────────────────────────────────────────

export const DEMO_AGENTS = [
  {
    agentId: "demo-agent-sales-001",
    key: "sales-agent",
    displayName: "Sales Agent",
    role: "AI sales development representative",
    description: "Qualifies leads, drafts outreach emails, and follows up on pipeline opportunities.",
    status: "active",
    modelProvider: "echo",
    skills: ["lead qualification", "email drafting", "CRM updates", "follow-up scheduling"],
    enabledFor: ["US", "CA", "GB", "IN", "GLOBAL"],
    jurisdictionNote: null,
  },
  {
    agentId: "demo-agent-support-001",
    key: "support-agent",
    displayName: "Support Agent",
    role: "AI customer support specialist",
    description: "Handles tier-1 support tickets, drafts responses, and escalates complex issues.",
    status: "active",
    modelProvider: "echo",
    skills: ["ticket triage", "response drafting", "escalation", "knowledge base lookup"],
    enabledFor: ["US", "CA", "GB", "IN", "GLOBAL"],
    jurisdictionNote: null,
  },
  {
    agentId: "demo-agent-finance-001",
    key: "finance-ca-agent",
    displayName: "Finance / CA Agent",
    role: "AI financial analyst (jurisdiction-aware)",
    description:
      "Performs financial analysis, tax calculations, and compliance summaries. Always requires explicit jurisdiction context — never assumes a country by default. Generic fallback applies when jurisdiction is set to Global.",
    status: "active",
    modelProvider: "echo",
    skills: ["financial analysis", "tax calculation", "compliance summary", "invoice review"],
    enabledFor: ["US", "CA", "GB", "IN", "GLOBAL"],
    jurisdictionNote:
      "This agent requires explicit jurisdiction context before processing any financial or tax task. Output includes a disclaimer when jurisdiction is set to Global.",
  },
  {
    agentId: "demo-agent-research-001",
    key: "research-agent",
    displayName: "Research Agent",
    role: "AI research analyst",
    description: "Summarises documents, synthesises market research, and produces structured briefings.",
    status: "active",
    modelProvider: "echo",
    skills: ["document summarisation", "market research", "competitive analysis", "report writing"],
    enabledFor: ["US", "CA", "GB", "IN", "GLOBAL"],
    jurisdictionNote: null,
  },
];

// ── Sample tasks ──────────────────────────────────────────────────────────────

export const DEMO_TASKS = [
  {
    id: "demo-task-001",
    title: "Follow up with Acme Corp — Q3 renewal",
    agentKey: "sales-agent",
    status: "in_review",
    priority: 2,
    workspace: "Acme Corp (US)",
    jurisdiction: null,
    createdAt: "2026-06-20T09:00:00Z",
  },
  {
    id: "demo-task-002",
    title: "Resolve billing dispute — ticket #4821",
    agentKey: "support-agent",
    status: "done",
    priority: 1,
    workspace: "Thames Advisory (GB)",
    jurisdiction: null,
    createdAt: "2026-06-22T11:00:00Z",
  },
  {
    id: "demo-task-003",
    title: "GST reconciliation — Maple Financial Q2",
    agentKey: "finance-ca-agent",
    status: "in_review",
    priority: 1,
    workspace: "Maple Financial (CA)",
    jurisdiction: "CA",
    createdAt: "2026-06-25T08:30:00Z",
  },
  {
    id: "demo-task-004",
    title: "Market landscape brief — AI in wealth management",
    agentKey: "research-agent",
    status: "done",
    priority: 2,
    workspace: "Veda Partners (IN)",
    jurisdiction: null,
    createdAt: "2026-06-27T14:00:00Z",
  },
  {
    id: "demo-task-005",
    title: "Income Tax Act s.80C eligibility check — Veda Partners",
    agentKey: "finance-ca-agent",
    status: "done",
    priority: 1,
    workspace: "Veda Partners (IN)",
    jurisdiction: "IN",
    createdAt: "2026-06-28T10:00:00Z",
  },
];

// ── Sample runs ───────────────────────────────────────────────────────────────

export const DEMO_RUNS = [
  {
    id: "demo-run-001",
    taskId: "demo-task-001",
    agentKey: "sales-agent",
    status: "succeeded",
    modelProvider: "echo",
    tokensIn: 312,
    tokensOut: 185,
    output: {
      draftEmail: "Hi Sarah, following up on the Q3 renewal proposal we sent last week…",
      nextAction: "Schedule a call for week of 30 June",
      sentimentScore: "Warm — high close probability",
    },
    createdAt: "2026-06-20T09:02:00Z",
  },
  {
    id: "demo-run-002",
    taskId: "demo-task-002",
    agentKey: "support-agent",
    status: "succeeded",
    modelProvider: "echo",
    tokensIn: 198,
    tokensOut: 142,
    output: {
      resolution: "Credit applied to account. Root cause: duplicate invoice in billing cycle.",
      responseEmail: "Dear client, we have applied a credit of £240 to your account…",
      escalationRequired: "No",
    },
    createdAt: "2026-06-22T11:04:00Z",
  },
  {
    id: "demo-run-003",
    taskId: "demo-task-003",
    agentKey: "finance-ca-agent",
    status: "succeeded",
    modelProvider: "echo",
    tokensIn: 441,
    tokensOut: 298,
    output: {
      jurisdiction: "CA — Federal (CRA) + Ontario HST",
      summary: "Net GST/HST payable: CAD 8,412. Input tax credits claimed: CAD 3,217.",
      disclaimer: "This output is generated by an AI model. Verify with a licensed CPA before filing.",
      nextSteps: "Upload to CRA My Business Account by 31 July 2026.",
    },
    createdAt: "2026-06-25T08:36:00Z",
  },
  {
    id: "demo-run-004",
    taskId: "demo-task-004",
    agentKey: "research-agent",
    status: "succeeded",
    modelProvider: "echo",
    tokensIn: 523,
    tokensOut: 374,
    output: {
      executiveSummary:
        "The AI-in-wealth-management space is growing at 28% CAGR. Key players include incumbents with embedded robo-advisory and fintech challengers offering personalised portfolio agents.",
      keyFindings:
        "1. Regulatory clarity is the primary adoption barrier in India and Canada. 2. Client trust requires explainability. 3. Data residency is a differentiator.",
      sources: "Synthesised from public filings, industry reports (2024–2026).",
    },
    createdAt: "2026-06-27T14:08:00Z",
  },
];

// ── Sample audit records ──────────────────────────────────────────────────────

export const DEMO_AUDIT = [
  { id: "audit-001", type: "task.created", actor: "agency-user", resource: "task/demo-task-001", at: "2026-06-20T09:00:00Z" },
  { id: "audit-002", type: "runtime.started", actor: "system", resource: "run/demo-run-001", at: "2026-06-20T09:02:00Z" },
  { id: "audit-003", type: "runtime.succeeded", actor: "system", resource: "run/demo-run-001", at: "2026-06-20T09:02:15Z" },
  { id: "audit-004", type: "task.created", actor: "agency-user", resource: "task/demo-task-003", at: "2026-06-25T08:30:00Z" },
  { id: "audit-005", type: "runtime.started", actor: "system", resource: "run/demo-run-003", at: "2026-06-25T08:36:00Z" },
  { id: "audit-006", type: "runtime.succeeded", actor: "system", resource: "run/demo-run-003", at: "2026-06-25T08:36:42Z" },
];

// ── Run examples for the "Run Agent" page ─────────────────────────────────────

export interface RunExample {
  label: string;
  agentKey: string;
  agentLabel: string;
  title: string;
  goal: string;
  context: string;
  /** If set, the Finance/CA agent jurisdiction picker should be shown */
  jurisdictionRequired?: boolean;
  defaultJurisdiction?: string;
}

export const RUN_EXAMPLES: RunExample[] = [
  {
    label: "Sales — lead follow-up",
    agentKey: "sales-agent",
    agentLabel: "Sales Agent",
    title: "Follow up with Acme Corp — Q3 renewal",
    goal: "Draft a personalised follow-up email to Acme Corp's procurement team regarding their Q3 contract renewal. Proposal was sent 10 days ago. No reply yet.",
    context: "Client: Acme Corp. Contact: Sarah Chen (VP Procurement). Deal value: $48,000/year. Last touchpoint: email on June 18.",
  },
  {
    label: "Support — customer reply",
    agentKey: "support-agent",
    agentLabel: "Support Agent",
    title: "Resolve billing dispute — ticket #4821",
    goal: "Review the billing dispute from Thames Advisory (ticket #4821) and draft a resolution response. A duplicate invoice was charged in May.",
    context: "Client: Thames Advisory Ltd (GB). Invoice #INV-2026-0521 was charged twice. Credit amount: £240. Account is in good standing.",
  },
  {
    label: "Finance/CA — jurisdiction-aware",
    agentKey: "finance-ca-agent",
    agentLabel: "Finance / CA Agent",
    title: "GST reconciliation — Maple Financial Q2",
    goal: "Perform a GST/HST reconciliation for Maple Financial for Q2 2026. Calculate net GST payable and input tax credits.",
    context: "Jurisdiction: Canada (Ontario — HST 13%). Revenue: CAD 210,000. Purchases with ITC: CAD 62,000. Previous ITC balance: CAD 3,217.",
    jurisdictionRequired: true,
    defaultJurisdiction: "CA",
  },
  {
    label: "Research — market brief",
    agentKey: "research-agent",
    agentLabel: "Research Agent",
    title: "Market landscape brief — AI in wealth management",
    goal: "Produce a concise executive briefing on the current state of AI adoption in wealth management. Focus on regulatory landscape, key players, and client trust factors.",
    context: "Audience: C-suite at a mid-size Indian wealth management firm. Timeframe: 2024–2026. Regions of interest: India, Canada, UK.",
  },
];

import Link from "next/link";
import {
  ArrowRight, Bot, Package, GitBranch, ShieldCheck,
  CheckCircle2, ChevronRight, Star, Building2,
  TrendingUp, Activity,
} from "lucide-react";
import { INDUSTRY_ICON_REGISTRY } from "@/lib/industry-icons";
import { IndustryIconFromMeta } from "@/components/ui/industry-icon";

export const metadata = {
  title: "Optimora AI Automation OS — Automate your business with a team of AI agents",
  description:
    "Deploy industry-specific AI agent teams for sales, operations, support, reporting, HR, finance, logistics, and growth. White-label ready for agencies.",
};

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-sm font-bold shadow-sm">O</div>
          <span className="text-sm font-bold text-gray-900">Optimora</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/solutions" className="hidden text-sm text-gray-500 hover:text-gray-900 sm:block">Solutions</Link>
          <Link href="/white-label-agency" className="hidden text-sm text-gray-500 hover:text-gray-900 sm:block">For Agencies</Link>
          <Link href="/dashboard" className="hidden text-sm text-gray-500 hover:text-gray-900 sm:block">Sign in</Link>
          <Link href="/onboarding" className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm">
            Get started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

const MODULES = [
  { icon: Package, label: "Industry Packs", desc: "13 pre-built packs for every sector", color: "bg-indigo-50 text-indigo-600" },
  { icon: Bot, label: "AI Agent Library", desc: "15 specialist agents, each built for a role", color: "bg-violet-50 text-violet-600" },
  { icon: GitBranch, label: "Workflow Templates", desc: "130 automation workflows, step by step", color: "bg-teal-50 text-teal-600" },
  { icon: Activity, label: "Activity Feed", desc: "Live log of every agent action", color: "bg-orange-50 text-orange-600" },
  { icon: TrendingUp, label: "ROI Dashboard", desc: "Hours saved and cost avoided, tracked", color: "bg-emerald-50 text-emerald-600" },
  { icon: Building2, label: "Agency White-label", desc: "Resell packs under your brand", color: "bg-rose-50 text-rose-600" },
];

const HOW_IT_WORKS = [
  { num: "01", title: "Choose your industry pack", body: "Select from 13 industry-specific packs. Each one includes pre-configured agents, workflows, and a dashboard ready to run." },
  { num: "02", title: "Deploy your AI agent team", body: "Your agents are assigned roles — sales, support, finance, HR. Each knows their job, their tools, and their approval rules." },
  { num: "03", title: "Connect your tools (optional)", body: "Wire up CRM, email, calendar, or sheets. Agents work inside your stack. In Demo Mode, they run on sample data with no external connections." },
  { num: "04", title: "Review, approve, and monitor", body: "Every sensitive action requires your approval. Every run is audited. Every output is reviewable. Full transparency, always." },
];

const TRUST_ITEMS = [
  "Demo Mode — no external systems touched without your setup",
  "All outbound actions require human approval",
  "No LinkedIn scraping. No fake integrations.",
  "Jurisdiction-aware for IN, CA, US, GB — explicit disclosure",
  "Full audit trail on every agent action",
  "White-label ready — your brand, your clients",
];

const SHOWCASE_INDUSTRIES = [
  "financial-services", "sales", "support", "research",
  "e-commerce", "operations", "marketing-agency", "real-estate",
  "recruitment", "healthcare", "legal", "warehouse",
] as const;

export default function AIAutomationOSPage() {
  const packs = INDUSTRY_ICON_REGISTRY.filter((i) =>
    (SHOWCASE_INDUSTRIES as readonly string[]).includes(i.key)
  );

  return (
    <div className="min-h-screen bg-white">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-white pt-16 pb-20">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <Star className="h-3 w-3 text-orange-500" />
            AI Automation OS — Built for business owners and agencies
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Automate your business with a{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              team of AI agents
            </span>
          </h1>

          <p className="mt-5 mx-auto max-w-2xl text-lg text-gray-500 leading-relaxed">
            Deploy industry-specific AI agent teams for sales, operations, support, reporting, HR, finance, logistics, and growth. White-label ready for agencies.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:opacity-90 transition-opacity">
              Deploy your first agent team
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/dashboard/packs" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
              Browse industry packs
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="mt-4 text-xs text-gray-400">Demo Mode available · No credit card required · No external sends without your approval</p>

          {/* Stats */}
          <div className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-4 border-t border-gray-100 pt-10">
            {[
              { value: "13", label: "Industry packs" },
              { value: "15", label: "AI agents" },
              { value: "11", label: "Workflow templates" },
              { value: "100%", label: "Human-approved outputs" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-extrabold text-gray-900">{s.value}</p>
                <p className="mt-1 text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform modules */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">Platform</span>
            <h2 className="mt-4 text-3xl font-bold text-gray-900">Everything in the Optimora OS</h2>
            <p className="mt-3 mx-auto max-w-xl text-gray-500">
              Six interconnected modules that make AI automation practical for real businesses.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${m.color}`}>
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{m.label}</h3>
                  <p className="mt-1 text-sm text-gray-500">{m.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Industry packs */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">Industry Packs</span>
            <h2 className="mt-4 text-3xl font-bold text-gray-900">Pre-built for your industry</h2>
            <p className="mt-3 mx-auto max-w-xl text-gray-500">
              Each pack includes role-specific agents, tools, and workflows — configured for your vertical from day one.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {packs.map((meta) => (
              <div
                key={meta.key}
                className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
              >
                <IndustryIconFromMeta meta={meta} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{meta.label}</p>
                  <p className="text-[11px] text-gray-400 leading-snug mt-0.5 truncate">{meta.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/solutions" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
              View all solutions
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">How it works</span>
            <h2 className="mt-4 text-3xl font-bold text-gray-900">From zero to running agents in 4 steps</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.num} className="rounded-2xl border border-gray-200 bg-white p-6">
                <span className="text-3xl font-black text-gray-100">{s.num}</span>
                <h3 className="mt-2 text-base font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / Honesty section */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-8">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-gray-900">Built on honesty</h2>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              We don&apos;t claim magic. Every capability is clearly labelled — Demo Mode, Requires Integration, Custom Setup Required, or Manual Approval Required.
            </p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TRUST_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold mb-3">Your AI workforce starts here</h2>
          <p className="text-gray-400 mb-8">No engineers needed to get started. Pick your industry, deploy your agent team, and let them handle the work.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-500 transition-colors">
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/paid-pilot" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
              Explore paid pilot
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-500">Demo Mode available · No external sends without your approval</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-[10px] font-bold">O</div>
            <span className="text-sm font-semibold text-gray-700">Optimora</span>
          </div>
          <p className="text-xs text-gray-400">© 2026 Optimora. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-gray-400">
            <Link href="/solutions" className="hover:text-gray-600">Solutions</Link>
            <Link href="/white-label-agency" className="hover:text-gray-600">Agencies</Link>
            <Link href="/dashboard" className="hover:text-gray-600">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

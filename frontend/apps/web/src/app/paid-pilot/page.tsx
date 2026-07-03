import Link from "next/link";
import {
  ArrowRight, CheckCircle2, Users, Zap,
  BarChart3, ShieldCheck, Star, ChevronRight, Package,
  CalendarCheck, TrendingUp,
} from "lucide-react";

export const metadata = {
  title: "Paid Pilot Program — Optimora",
  description:
    "Run a paid pilot with Optimora. Get your first industry pack deployed with real integrations in 30 days — with dedicated support and measurable ROI.",
};

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-sm font-bold">O</div>
          <span className="text-sm font-bold text-gray-900">Optimora</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/ai-automation-os" className="hidden text-sm text-gray-500 hover:text-gray-900 sm:block">Platform</Link>
          <Link href="/dashboard" className="hidden text-sm text-gray-500 hover:text-gray-900 sm:block">Sign in</Link>
          <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

const PILOT_INCLUDES = [
  { icon: Package, title: "1 industry pack deployment", desc: "We choose the right pack together and configure it for your business." },
  { icon: Zap, title: "Full integration setup", desc: "We connect your CRM, email, or other tools. You don't do the plumbing." },
  { icon: Users, title: "Dedicated onboarding call", desc: "60-minute setup session with an Optimora specialist." },
  { icon: ShieldCheck, title: "Approval checkpoint review", desc: "We configure all human approval rules to match your risk tolerance." },
  { icon: BarChart3, title: "30-day ROI report", desc: "At end of pilot, you get a detailed report of hours saved and value delivered." },
  { icon: TrendingUp, title: "Success criteria defined upfront", desc: "We agree on measurable outcomes before we start — no ambiguity." },
];

const TIMELINE = [
  { week: "Week 1", title: "Discovery & setup", desc: "Kickoff call, industry pack selection, integration mapping, approval rule design." },
  { week: "Week 2", title: "Integration & testing", desc: "Connect integrations, run test workflows on sample data, review outputs." },
  { week: "Week 3", title: "Go live on real data", desc: "Agents run on your live data with approval checkpoints active. Monitor daily." },
  { week: "Week 4", title: "ROI review & next steps", desc: "Review results against success criteria. Decide on full deployment plan." },
];

const PRICING_NOTES = [
  "Paid pilot pricing discussed on call — varies by pack and integration complexity",
  "Pilot cost credited toward full deployment if you proceed",
  "No recurring commitment required after pilot",
  "Includes all setup, integrations, and support for 30 days",
];

export default function PaidPilotPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-white pt-16 pb-20">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-white to-emerald-50/30" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <Star className="h-3 w-3 text-orange-500" />
            Paid Pilot Program
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Go from demo to{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-emerald-600">
              live in 30 days
            </span>
          </h1>

          <p className="mt-5 mx-auto max-w-2xl text-lg text-gray-500 leading-relaxed">
            A structured paid pilot to deploy your first AI agent team with real integrations, real data, and measurable ROI — with dedicated Optimora support throughout.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-700 transition-colors">
              Apply for a pilot
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/ai-automation-os" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
              See the platform first
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">What&apos;s included</span>
            <h2 className="mt-4 text-3xl font-bold text-gray-900">Everything you need for a successful pilot</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PILOT_INCLUDES.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                    <Icon className="h-5 w-5 text-indigo-600" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">30-day pilot timeline</h2>
            <p className="mt-3 text-gray-500">A structured 4-week plan to go from discovery to live results.</p>
          </div>

          <div className="space-y-4">
            {TIMELINE.map((t, i) => (
              <div key={t.week} className="flex items-start gap-5 rounded-2xl border border-gray-200 bg-white px-6 py-5">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                    {i + 1}
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap">{t.week}</span>
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900">{t.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{t.desc}</p>
                </div>
                <CalendarCheck className="h-5 w-5 text-gray-200 flex-shrink-0 mt-0.5 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing notes */}
      <section className="py-16 bg-indigo-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-2xl border border-indigo-200 bg-white p-7">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Pilot pricing</h2>
            <p className="text-sm text-gray-600 mb-4">
              Pilot pricing is scoped based on your industry pack selection and integration complexity. We discuss on a discovery call and agree on scope before starting.
            </p>
            <ul className="space-y-2 mb-6">
              {PRICING_NOTES.map((note) => (
                <li key={note} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500 mt-0.5" />
                  {note}
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs text-amber-800">
                <span className="font-semibold">Honesty note:</span> We will tell you upfront what can be done in 30 days vs. what requires longer setup.
                No overpromising. Success criteria are agreed before we start.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold mb-3">Ready to go from demo to live?</h2>
          <p className="text-gray-400 mb-8">Apply for a paid pilot and we&apos;ll scope your first deployment together.</p>
          <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-500 transition-colors shadow-lg">
            Apply for a pilot
            <ArrowRight className="h-4 w-4" />
          </Link>
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
            <Link href="/ai-automation-os" className="hover:text-gray-600">Platform</Link>
            <Link href="/white-label-agency" className="hover:text-gray-600">Agencies</Link>
            <Link href="/dashboard" className="hover:text-gray-600">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

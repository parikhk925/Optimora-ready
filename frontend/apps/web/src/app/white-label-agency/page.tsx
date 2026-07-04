import Link from "next/link";
import {
  ArrowRight, Building2, DollarSign, Package, ShieldCheck,
  Star, Globe, Users, BarChart3,
  Palette, ChevronRight,
} from "lucide-react";

export const metadata = {
  title: "White-label AI Automation for Agencies — Optimora",
  description:
    "Resell AI automation packs under your brand. Deploy industry-specific AI agent teams for your clients and keep 100% of the markup.",
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
          <Link href="/solutions" className="hidden text-sm text-gray-500 hover:text-gray-900 sm:block">Solutions</Link>
          <Link href="/dashboard" className="hidden text-sm text-gray-500 hover:text-gray-900 sm:block">Sign in</Link>
          <Link href="/onboarding/agency" className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm">
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}

const CALC_ROWS = [
  { clients: 5,  price: 15000, monthly: "₹75,000", annual: "₹9L" },
  { clients: 10, price: 15000, monthly: "₹1,50,000", annual: "₹18L" },
  { clients: 20, price: 15000, monthly: "₹3,00,000", annual: "₹36L" },
  { clients: 50, price: 15000, monthly: "₹7,50,000", annual: "₹90L" },
];

const WHAT_YOU_GET = [
  { icon: Palette, title: "White-label portal", desc: "Your agency name, logo, and colors on every page clients see" },
  { icon: Users, title: "Client workspaces", desc: "Isolated workspace per client — full data separation, no cross-contamination" },
  { icon: Package, title: "13 industry packs", desc: "Resell any pack: Sales, HR, Finance, Real Estate, Healthcare, Logistics, and more" },
  { icon: BarChart3, title: "Client ROI reports", desc: "Auto-generated, branded monthly reports to justify your retainer" },
  { icon: Globe, title: "Client portal", desc: "Read-only branded portal for clients to see agent activity (Custom Setup Required)" },
  { icon: ShieldCheck, title: "Admin controls", desc: "Manage all clients from one view — pause, configure, and scale" },
];

const HOW_IT_WORKS = [
  { step: 1, title: "Sign up as an agency partner", desc: "Set up your agency profile in 5 minutes. No tech team needed." },
  { step: 2, title: "White-label the platform", desc: "Add your name, logo, and accent color. Clients see your brand." },
  { step: 3, title: "Deploy an industry pack for a client", desc: "Pick the right pack, set up their workspace, deploy in under 10 minutes." },
  { step: 4, title: "Deliver ROI reports monthly", desc: "Auto-generated reports show exactly what agents did and the value delivered." },
  { step: 5, title: "Add more clients. Scale your revenue.", desc: "Every new client adds ₹10k–₹50k/mo to your recurring revenue." },
];

export default function WhiteLabelAgencyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 to-violet-900 pt-20 pb-24 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #818cf8 0%, transparent 60%), radial-gradient(circle at 80% 20%, #a855f7 0%, transparent 50%)" }}
        />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
            <Star className="h-3 w-3 text-yellow-400" />
            For agencies, consultants, and automation resellers
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Sell AI automation<br />
            <span className="text-indigo-300">under your own brand</span>
          </h1>

          <p className="mt-5 mx-auto max-w-2xl text-lg text-indigo-100 leading-relaxed">
            White-label AI automation packs for agencies. Deploy industry-specific AI agent teams for your clients. Keep 100% of the markup.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/onboarding/agency" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-indigo-900 shadow-lg hover:bg-indigo-50 transition-colors">
              Set up your agency
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/dashboard/agency-os" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors">
              View demo
            </Link>
          </div>

          {/* Revenue preview */}
          <div className="mt-12 inline-flex flex-col items-center gap-1">
            <p className="text-indigo-300 text-sm font-medium">20 clients × ₹15,000/mo =</p>
            <p className="text-4xl font-black text-white">₹3,00,000/month</p>
            <p className="text-indigo-300 text-xs">in recurring agency revenue</p>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">Agency mode</span>
            <h2 className="mt-4 text-3xl font-bold text-gray-900">Everything you need to resell AI automation</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {WHAT_YOU_GET.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                    <Icon className="h-5 w-5 text-indigo-600" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-1.5 text-sm text-gray-500">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Revenue calculator */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Revenue potential</span>
            <h2 className="mt-4 text-3xl font-bold text-gray-900">Your recurring revenue, calculated</h2>
            <p className="mt-3 text-gray-500">Based on ₹15,000/mo per client pack. Set your own pricing — many agencies charge ₹20k–₹50k/mo.</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-gray-900">Agency revenue calculator</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Active clients</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Pack price/mo</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Monthly</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Annual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {CALC_ROWS.map((row) => (
                  <tr key={row.clients} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-gray-900">{row.clients} clients</td>
                    <td className="px-5 py-3 text-gray-600 text-right">₹{row.price.toLocaleString()}</td>
                    <td className="px-5 py-3 text-emerald-700 font-bold text-right">{row.monthly}/mo</td>
                    <td className="px-5 py-3 text-indigo-700 font-semibold text-right">{row.annual}/yr</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">How it works for agencies</h2>
          </div>
          <div className="space-y-4">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Honesty section */}
      <section className="py-10 bg-amber-50 border-y border-amber-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">Honesty, upfront</p>
              <p className="text-xs text-amber-800 mt-1">
                Agency Mode features are currently in Sample Preview. Client portals, billing automation, and custom domain setup require Custom Setup.
                All capabilities are clearly labelled — Sample Preview, Requires Integration, or Custom Setup Required. No feature is overstated.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-indigo-900 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold mb-3">Ready to build your agency on AI?</h2>
          <p className="text-indigo-300 mb-8">Set up in 5 minutes. Deploy your first client pack in Sample Preview today.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/onboarding/agency" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-indigo-900 hover:bg-indigo-50 transition-colors shadow-lg">
              <Building2 className="h-4 w-4" />
              Set up your agency
            </Link>
            <Link href="/paid-pilot" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
              Explore paid pilot
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
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
            <Link href="/solutions" className="hover:text-gray-600">Solutions</Link>
            <Link href="/dashboard" className="hover:text-gray-600">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

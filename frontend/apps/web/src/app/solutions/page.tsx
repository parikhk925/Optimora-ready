import Link from "next/link";
import {
  ArrowRight, Star, Clock, Zap, Users, Building2,
  ShoppingCart, Stethoscope, GraduationCap, Truck, CreditCard,
  Briefcase, UtensilsCrossed, Factory, MapPin, Home, TrendingUp,
} from "lucide-react";

export const metadata = {
  title: "Solutions by Industry — Optimora",
  description:
    "Deploy AI agent teams for your industry. Optimora has pre-built packs for sales, HR, finance, operations, real estate, healthcare, logistics, and more.",
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
          <Link href="/white-label-agency" className="hidden text-sm text-gray-500 hover:text-gray-900 sm:block">Agencies</Link>
          <Link href="/dashboard" className="hidden text-sm text-gray-500 hover:text-gray-900 sm:block">Sign in</Link>
          <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

interface SolutionCard {
  key: string;
  name: string;
  icon: React.ElementType;
  color: { bg: string; icon: string; border: string; badge: string };
  headline: string;
  forWho: string;
  outcomes: string[];
  hoursSaved: number;
  agentCount: number;
  status: "demo" | "requires_integration" | "custom_setup";
  href: string;
}

const STATUS_STYLES = {
  demo: { bg: "bg-amber-100", text: "text-amber-700", label: "Demo Mode" },
  requires_integration: { bg: "bg-blue-100", text: "text-blue-700", label: "Requires Integration" },
  custom_setup: { bg: "bg-purple-100", text: "text-purple-700", label: "Custom Setup" },
};

const SOLUTIONS: SolutionCard[] = [
  {
    key: "agency",
    name: "Agency & Consulting",
    icon: Building2,
    color: { bg: "bg-indigo-50", icon: "text-indigo-600", border: "border-indigo-200", badge: "bg-indigo-600" },
    headline: "Turn your agency into an AI automation powerhouse",
    forWho: "Marketing agencies, web agencies, automation consultants",
    outcomes: ["42h/week saved on client ops", "Scale delivery without headcount", "White-label under your brand"],
    hoursSaved: 42, agentCount: 9, status: "demo",
    href: "/dashboard/industry/agency",
  },
  {
    key: "real-estate",
    name: "Real Estate",
    icon: Home,
    color: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-200", badge: "bg-emerald-600" },
    headline: "Never lose a property lead again",
    forWho: "Brokers, builders, property consultants, developers",
    outcomes: ["Recover 9+ leads/week", "Book 11 site visits on autopilot", "Save 35 broker hours/week"],
    hoursSaved: 35, agentCount: 8, status: "demo",
    href: "/dashboard/industry/real-estate",
  },
  {
    key: "hr",
    name: "HR & Recruitment",
    icon: Users,
    color: { bg: "bg-violet-50", icon: "text-violet-600", border: "border-violet-200", badge: "bg-violet-600" },
    headline: "Hire faster with an AI recruitment team",
    forWho: "HR teams, recruiters, staffing agencies",
    outcomes: ["Cut time-to-shortlist by 70%", "Screen 200+ resumes automatically", "Save ₹1.5–3L/month in recruiter hours"],
    hoursSaved: 30, agentCount: 7, status: "demo",
    href: "/dashboard/industry/hr",
  },
  {
    key: "ecommerce",
    name: "E-Commerce",
    icon: ShoppingCart,
    color: { bg: "bg-orange-50", icon: "text-orange-600", border: "border-orange-200", badge: "bg-orange-600" },
    headline: "Automate COD, carts, support, and reviews — at scale",
    forWho: "Shopify stores, D2C brands, marketplaces, COD sellers",
    outcomes: ["Recover ₹48,000+/week in carts", "Confirm 73+ COD orders/day", "Save 45 support hours/week"],
    hoursSaved: 45, agentCount: 8, status: "requires_integration",
    href: "/dashboard/industry/ecommerce",
  },
  {
    key: "healthcare",
    name: "Healthcare & Clinics",
    icon: Stethoscope,
    color: { bg: "bg-rose-50", icon: "text-rose-600", border: "border-rose-200", badge: "bg-rose-600" },
    headline: "Run your clinic with an AI front desk team",
    forWho: "Clinics, dentists, diagnostic centers, wellness centers",
    outcomes: ["Recover 15+ missed appointments/week", "Reduce no-shows by 40%", "Save 28 front-desk hours/week"],
    hoursSaved: 28, agentCount: 8, status: "demo",
    href: "/dashboard/industry/clinic",
  },
  {
    key: "education",
    name: "Education",
    icon: GraduationCap,
    color: { bg: "bg-amber-50", icon: "text-amber-600", border: "border-amber-200", badge: "bg-amber-600" },
    headline: "Convert more student inquiries without hiring more counselors",
    forWho: "Coaching classes, colleges, edtech, course sellers",
    outcomes: ["Handle 5× more inquiries", "Recover 18 drop-offs/week", "Save 25 counselor hours/week"],
    hoursSaved: 25, agentCount: 8, status: "demo",
    href: "/dashboard/industry/education",
  },
  {
    key: "logistics",
    name: "Logistics",
    icon: Truck,
    color: { bg: "bg-sky-50", icon: "text-sky-600", border: "border-sky-200", badge: "bg-sky-600" },
    headline: "Automate tracking, exceptions, docs, and reporting",
    forWho: "Warehouses, logistics firms, 3PL companies",
    outcomes: ["Flag 18 exceptions/day before SLA breach", "Save 38 ops hours/week", "Cut delayed deliveries by 25%"],
    hoursSaved: 38, agentCount: 8, status: "requires_integration",
    href: "/dashboard/industry/logistics",
  },
  {
    key: "finance",
    name: "Finance & Accounting",
    icon: CreditCard,
    color: { bg: "bg-slate-50", icon: "text-slate-600", border: "border-slate-300", badge: "bg-slate-700" },
    headline: "Automate invoice reminders, document collection, and reporting",
    forWho: "Accountants, CA firms, finance teams, tax consultants",
    outcomes: ["Collect invoices 20% faster", "Auto-generate compliance reports", "Save 24 finance hours/week"],
    hoursSaved: 24, agentCount: 7, status: "demo",
    href: "/dashboard/industry/finance",
  },
  {
    key: "legal",
    name: "Legal",
    icon: Briefcase,
    color: { bg: "bg-gray-50", icon: "text-gray-600", border: "border-gray-300", badge: "bg-gray-700" },
    headline: "Automate client intake, research, and billing reminders",
    forWho: "Law firms, solo practitioners, legal ops teams",
    outcomes: ["Faster client intake processing", "Automated billing reminders", "No legal advice generated — human review required"],
    hoursSaved: 20, agentCount: 6, status: "demo",
    href: "/dashboard/industry/legal",
  },
  {
    key: "restaurants",
    name: "Restaurants & F&B",
    icon: UtensilsCrossed,
    color: { bg: "bg-rose-50", icon: "text-rose-600", border: "border-rose-200", badge: "bg-rose-600" },
    headline: "Manage reservations, reviews, and staff comms automatically",
    forWho: "Restaurant chains, cafes, cloud kitchens, F&B groups",
    outcomes: ["Automate reservation confirmations", "Collect and respond to reviews", "Reduce staff coordination load"],
    hoursSaved: 18, agentCount: 5, status: "demo",
    href: "/dashboard/industry/restaurants",
  },
  {
    key: "manufacturing",
    name: "Manufacturing",
    icon: Factory,
    color: { bg: "bg-zinc-50", icon: "text-zinc-600", border: "border-zinc-300", badge: "bg-zinc-700" },
    headline: "Automate production reports, vendor coordination, and alerts",
    forWho: "Factories, manufacturers, production-heavy businesses",
    outcomes: ["Daily production reports automated", "Vendor coordination on autopilot", "SLA breach alerts before they happen"],
    hoursSaved: 30, agentCount: 6, status: "requires_integration",
    href: "/dashboard/industry/manufacturing",
  },
  {
    key: "local",
    name: "Local Services",
    icon: MapPin,
    color: { bg: "bg-pink-50", icon: "text-pink-600", border: "border-pink-200", badge: "bg-pink-600" },
    headline: "Handle bookings, reviews, and follow-ups for local businesses",
    forWho: "Salons, fitness studios, home services, local professionals",
    outcomes: ["Automate appointment reminders", "Collect Google reviews automatically", "Follow up with lapsed customers"],
    hoursSaved: 15, agentCount: 4, status: "demo",
    href: "/dashboard/industry/local",
  },
];

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-white pt-16 pb-16">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <Star className="h-3 w-3 text-orange-500" />
            Solutions by industry
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            AI agent teams for{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              every industry
            </span>
          </h1>

          <p className="mt-5 mx-auto max-w-2xl text-lg text-gray-500 leading-relaxed">
            13 industry packs. Each includes pre-configured agents, workflow templates, and ROI dashboards — ready to deploy in minutes.
          </p>
        </div>
      </section>

      {/* Solutions grid */}
      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {SOLUTIONS.map((sol) => {
              const Icon = sol.icon;
              const statusStyle = STATUS_STYLES[sol.status];
              return (
                <div
                  key={sol.key}
                  className={`flex flex-col rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow ${sol.color.border}`}
                >
                  {/* Top */}
                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${sol.color.bg}`}>
                        <Icon className={`h-6 w-6 ${sol.color.icon}`} strokeWidth={1.75} />
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusStyle.bg} ${statusStyle.text}`}>
                        {statusStyle.label}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-gray-900">{sol.name}</h3>
                    <p className="mt-0.5 text-[13px] font-medium text-gray-700">{sol.headline}</p>
                    <p className="mt-1 text-[11px] text-gray-400 italic">{sol.forWho}</p>

                    {/* Outcomes */}
                    <ul className="mt-4 space-y-1.5">
                      {sol.outcomes.map((o) => (
                        <li key={o} className="flex items-start gap-2 text-xs text-gray-600">
                          <TrendingUp className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${sol.color.icon}`} />
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Stats */}
                  <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="font-bold text-gray-700">{sol.hoursSaved}h</span>/wk saved
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Zap className="h-3.5 w-3.5" />
                      <span className="font-bold text-gray-700">{sol.agentCount}</span> agents
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="p-4 border-t border-gray-100">
                    <Link
                      href={sol.href}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors ${sol.color.badge} hover:opacity-90`}
                    >
                      View {sol.name} Pack
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold mb-3">Don&apos;t see your industry?</h2>
          <p className="text-gray-400 mb-8">
            Contact us for a custom pack. Optimora agents can be configured for any industry with the right workflow design.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-500 transition-colors">
              Start with the closest pack
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/paid-pilot" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
              Apply for custom pilot
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
            <Link href="/white-label-agency" className="hover:text-gray-600">Agencies</Link>
            <Link href="/dashboard" className="hover:text-gray-600">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

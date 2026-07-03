import Link from "next/link";
import {
  ArrowRight, Play, CheckCircle2, Wrench, BarChart3,
  ChevronDown, Bot, Globe,
  Search, Bell, MessageSquare, FileText, Mail,
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "Optimora — AI Agents for Every Business",
  description:
    "Deploy autonomous AI agents that research, qualify, follow up, support customers, process invoices, and run workflows across your entire business — even while your team sleeps.",
};

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  const navLinks = [
    { label: "Platform", hasDropdown: true },
    { label: "Solutions", hasDropdown: true },
    { label: "Resources", hasDropdown: true },
    { label: "Pricing" },
    { label: "Docs" },
    { label: "Enterprise" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-[#EAEAF2] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 select-none">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl font-bold text-white text-sm shadow-sm"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)" }}
          >
            O
          </div>
          <span className="text-sm font-bold text-[#0F1020]">Optimora</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((item) => (
            <button
              key={item.label}
              className="flex items-center gap-0.5 rounded-lg px-3 py-2 text-sm text-[#6B7280] hover:text-[#0F1020] hover:bg-gray-50 transition-colors"
            >
              {item.label}
              {item.hasDropdown && <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
            </button>
          ))}
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-[#6B7280] hover:text-[#0F1020] transition-colors sm:block px-3 py-2"
          >
            Sign in
          </Link>
          <button className="btn-outline text-xs px-4 py-2 rounded-lg">Book a demo</button>
          <Link
            href="/onboarding"
            className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)" }}
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Hero Dashboard Mockup ─────────────────────────────────────────────────────
function HeroDashboardMockup() {
  const agents = [
    {
      label: "Web Research Agent",
      sub: "Scanning 14 sources...",
      icon: Globe,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      dot: "bg-green-400",
      status: "Running",
      statusColor: "status-running",
    },
    {
      label: "Email Follow-up Agent",
      sub: "12 emails queued",
      icon: Mail,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      dot: "bg-green-400",
      status: "Active",
      statusColor: "status-active",
    },
    {
      label: "Invoice Agent",
      sub: "3 invoices processed",
      icon: FileText,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      dot: "bg-green-400",
      status: "Success",
      statusColor: "status-success",
    },
    {
      label: "Support Agent",
      sub: "Ticket #4821 resolved",
      icon: MessageSquare,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
      dot: "bg-green-400",
      status: "Active",
      statusColor: "status-active",
    },
  ];

  return (
    <div className="relative w-full max-w-xl mx-auto lg:mx-0">
      {/* Glow effect */}
      <div
        className="absolute -inset-4 rounded-3xl opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(124,58,237,0.3) 0%, rgba(255,122,61,0.15) 60%, transparent 100%)",
        }}
      />

      {/* Main dashboard card */}
      <div className="relative rounded-2xl border border-[#EAEAF2] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.10)] overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-[#EAEAF2] px-4 py-3">
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
              style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)" }}
            >
              O
            </div>
            <span className="text-xs font-semibold text-[#0F1020]">Optimora</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg bg-[#FBFAFF] border border-[#EAEAF2] px-2.5 py-1">
              <Search className="h-3 w-3 text-gray-400" />
              <span className="text-[11px] text-gray-400">Search...</span>
            </div>
            <Bell className="h-4 w-4 text-gray-400" />
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold">
              OM
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Left mini sidebar */}
          <div className="w-28 flex-shrink-0 border-r border-[#EAEAF2] p-3 space-y-1 bg-[#FAFAFA]">
            {[
              { label: "Overview", active: true },
              { label: "Agents" },
              { label: "Workflows" },
              { label: "Templates" },
              { label: "Analytics" },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-md px-2 py-1.5 text-[10px] font-medium cursor-pointer ${
                  item.active
                    ? "bg-purple-50 text-[#7C3AED] font-semibold"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {item.label}
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 min-w-0">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: "Active Agents", value: "24", color: "text-[#7C3AED]", bg: "bg-purple-50" },
                { label: "Tasks Automated", value: "2.4K", color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Time Saved", value: "128h", color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Success Rate", value: "98.6%", color: "text-orange-600", bg: "bg-orange-50" },
              ].map((stat) => (
                <div key={stat.label} className={`rounded-xl ${stat.bg} px-3 py-2`}>
                  <p className="text-[10px] text-gray-500 font-medium">{stat.label}</p>
                  <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Agents list */}
            <div className="space-y-1.5 mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Recent Runs
              </p>
              {agents.slice(0, 3).map((agent) => {
                const Icon = agent.icon;
                return (
                  <div
                    key={agent.label}
                    className="flex items-center gap-2.5 rounded-xl border border-[#EAEAF2] bg-[#FBFAFF] px-3 py-2"
                  >
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${agent.iconBg}`}>
                      <Icon className={`h-3.5 w-3.5 ${agent.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-[#0F1020] truncate">{agent.label}</p>
                      <p className="text-[10px] text-gray-400 truncate">{agent.sub}</p>
                    </div>
                    <span className={agent.statusColor}>{agent.status}</span>
                  </div>
                );
              })}
            </div>

            {/* Usage trend mini chart */}
            <div className="rounded-xl border border-[#EAEAF2] p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-[#0F1020]">Usage Trend</p>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 rounded-full px-1.5 py-0.5">↑ 24%</span>
              </div>
              {/* SVG chart */}
              <svg viewBox="0 0 200 40" className="w-full h-10">
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon
                  points="4,36 20,30 37,33 54,24 71,27 88,18 105,21 122,14 139,16 156,10 173,12 196,6 196,40 4,40"
                  fill="url(#chartFill)"
                />
                <polyline
                  points="4,36 20,30 37,33 54,24 71,27 88,18 105,21 122,14 139,16 156,10 173,12 196,6"
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="196" cy="6" r="3" fill="#7C3AED" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Floating cards */}
      <div className="absolute -left-8 top-20 rotate-[-3deg] hidden lg:block">
        <div className="rounded-xl border border-[#EAEAF2] bg-white px-3 py-2 shadow-lg w-36">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            <p className="text-[10px] font-semibold text-[#0F1020]">Support Agent</p>
          </div>
          <p className="text-[10px] text-gray-400">Ticket resolved ✓</p>
        </div>
      </div>
      <div className="absolute -right-8 bottom-24 rotate-[3deg] hidden lg:block">
        <div className="rounded-xl border border-[#EAEAF2] bg-white px-3 py-2 shadow-lg w-40">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
            <p className="text-[10px] font-semibold text-[#0F1020]">Invoice Agent</p>
          </div>
          <p className="text-[10px] text-gray-400">Processing 3 invoices...</p>
        </div>
      </div>
    </div>
  );
}

// ── Stats Strip ───────────────────────────────────────────────────────────────
function StatsStrip() {
  const stats = [
    { value: "12K+", label: "Active teams" },
    { value: "2.4M+", label: "Tasks automated" },
    { value: "98.6%", label: "Success rate" },
    { value: "128K+", label: "Hours saved" },
  ];
  return (
    <div className="border-y border-[#EAEAF2] bg-white py-8">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-extrabold text-[#0F1020]">{s.value}</p>
              <p className="mt-0.5 text-sm text-[#6B7280]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Trusted By ────────────────────────────────────────────────────────────────
function TrustedBy() {
  const logos = [
    "Stripe", "Notion", "Linear", "Figma", "Vercel", "Shopify", "HubSpot", "Slack",
  ];
  return (
    <div className="py-10 bg-[#FBFAFF]">
      <div className="mx-auto max-w-[1280px] px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-[#6B7280] mb-6">
          Trusted by fast-moving teams at
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {logos.map((logo) => (
            <div
              key={logo}
              className="text-sm font-bold text-gray-300 tracking-tight hover:text-gray-400 transition-colors"
            >
              {logo}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Feature Cards ─────────────────────────────────────────────────────────────
function FeatureCards() {
  const features = [
    {
      icon: Bot,
      iconBg: "bg-purple-50",
      iconColor: "text-[#7C3AED]",
      badge: "Build",
      title: "Build powerful AI agents",
      desc: "Design agents with natural language, connect them to your data, and deploy them in minutes. No code required.",
      accent: "#7C3AED",
      items: ["Custom agent builder", "Pre-built agent templates", "Multi-agent workflows"],
    },
    {
      icon: Wrench,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
      badge: "Connect",
      title: "Connect your tools",
      desc: "Integrate with 100+ tools including Slack, Salesforce, Google Workspace, QuickBooks, and more.",
      accent: "#FF7A3D",
      items: ["100+ native integrations", "Custom webhook support", "API-first architecture"],
    },
    {
      icon: BarChart3,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      badge: "Monitor",
      title: "Monitor and improve",
      desc: "Real-time dashboards, run logs, and intelligent insights to continuously optimize your AI agents.",
      accent: "#3B82F6",
      items: ["Real-time run monitoring", "Success rate analytics", "Automated alerts"],
    },
  ];

  return (
    <div className="py-20 bg-white">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="text-center mb-14">
          <span className="section-label mb-4 inline-flex">
            <Sparkles className="h-3.5 w-3.5" />
            Everything you need
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-[#0F1020] lg:text-4xl">
            The complete AI automation platform
          </h2>
          <p className="mt-4 text-lg text-[#6B7280] max-w-2xl mx-auto">
            From building to monitoring, Optimora gives you every tool to run your business on autopilot.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="op-card p-6 hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-all duration-300 group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${f.iconBg}`}>
                    <Icon className={`h-5 w-5 ${f.iconColor}`} strokeWidth={1.75} />
                  </div>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{ background: `${f.accent}15`, color: f.accent }}
                  >
                    {f.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#0F1020] mb-2">{f.title}</h3>
                <p className="text-sm text-[#6B7280] mb-4 leading-relaxed">{f.desc}</p>
                <ul className="space-y-2">
                  {f.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-[#6B7280]">
                      <CheckCircle2
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color: f.accent }}
                        strokeWidth={2}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── CTA Section ───────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <div className="py-20 bg-[#FBFAFF]">
      <div className="mx-auto max-w-[1280px] px-6">
        <div
          className="rounded-3xl p-12 text-center text-white relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #8B5CF6 60%, #A855F7 100%)" }}
        >
          {/* Subtle pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-8 h-48 w-48 rounded-full bg-white blur-3xl" />
            <div className="absolute bottom-4 right-8 h-48 w-48 rounded-full bg-orange-400 blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-3xl font-extrabold lg:text-4xl mb-4">
              Start automating your business today
            </h2>
            <p className="text-purple-200 text-lg mb-8 max-w-xl mx-auto">
              Join 12,000+ teams already running on AI agents. No credit card required.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/onboarding"
                className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#7C3AED] hover:bg-purple-50 transition-colors shadow-lg"
              >
                Start building for free
              </Link>
              <button className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors backdrop-blur-sm">
                <Play className="h-4 w-4" />
                Watch demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-[#EAEAF2] bg-white py-12">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)" }}
            >
              O
            </div>
            <span className="text-sm font-bold text-[#0F1020]">Optimora</span>
          </Link>
          <p className="text-xs text-[#6B7280]">© 2025 Optimora Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            {["Privacy", "Terms", "Security"].map((l) => (
              <Link key={l} href="#" className="text-xs text-[#6B7280] hover:text-[#0F1020] transition-colors">
                {l}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#FBFAFF] pt-16 pb-8">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% -5%, rgba(124,58,237,0.10) 0%, transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-start lg:gap-16">
            {/* Left — copy */}
            <div className="flex-1 max-w-xl text-center lg:text-left pt-4">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#DDD6FE] bg-purple-50 px-4 py-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#7C3AED]" />
                <span className="text-xs font-semibold text-[#7C3AED]">
                  AI agents that work while you focus
                </span>
              </div>

              {/* Title */}
              <h1 className="text-4xl font-extrabold leading-tight text-[#0F1020] lg:text-5xl xl:text-[54px]">
                Automate your business with an{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #FF7A3D 100%)",
                  }}
                >
                  army of AI agents
                </span>
              </h1>

              {/* Subtitle */}
              <p className="mt-5 text-lg text-[#6B7280] leading-relaxed max-w-lg">
                Deploy autonomous AI agents that research, qualify, follow up, support
                customers, process invoices, and run workflows across your entire business —
                even while your team sleeps.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3 justify-center lg:justify-start">
                <Link
                  href="/onboarding"
                  className="btn-primary"
                >
                  Start building for free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button className="btn-outline flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7C3AED]">
                    <Play className="h-3 w-3 text-white fill-white" />
                  </div>
                  Watch demo
                </button>
              </div>

              {/* Trust notes */}
              <div className="mt-5 flex flex-wrap items-center gap-5 text-xs text-[#6B7280] justify-center lg:justify-start">
                {["No credit card required", "Free forever plan"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — dashboard mockup */}
            <div className="flex-1 w-full max-w-xl">
              <HeroDashboardMockup />
            </div>
          </div>
        </div>
      </section>

      <StatsStrip />
      <TrustedBy />
      <FeatureCards />
      <CTASection />
      <Footer />
    </div>
  );
}

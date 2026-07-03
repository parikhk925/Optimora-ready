import { Stepper } from "@/components/ui/stepper";
import {
  Clock, Shield, ChevronDown, Star, ArrowRight,
  Globe, Sparkles,
} from "lucide-react";

export const metadata = {
  title: "Agency Onboarding — Optimora",
  description: "Set up your agency workspace in minutes.",
};

const STEPS = [
  { label: "Agency Profile" },
  { label: "Branding" },
  { label: "Client Workspace" },
  { label: "Jurisdiction Setup" },
  { label: "Industry Pack Selection" },
  { label: "Review" },
  { label: "Launch" },
];

const AGENCY_TYPES = [
  { label: "Digital Marketing", active: true },
  { label: "Web Development", active: false },
  { label: "Design", active: true },
  { label: "SEO", active: false },
  { label: "Paid Advertising", active: true },
  { label: "Content Marketing", active: false },
  { label: "Branding", active: true },
  { label: "Other", active: false },
];

const AGENCY_SIZES = [
  { label: "1–5", active: true },
  { label: "6–20", active: false },
  { label: "21–50", active: false },
  { label: "50+", active: false },
];

// ── Live Preview Panel ────────────────────────────────────────────────────────
function LivePreviewPanel() {
  return (
    <div className="w-[340px] flex-shrink-0 border-l border-[#EAEAF2] bg-[#FBFAFF] p-5 flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Live Preview
        </p>

        {/* Agency card preview */}
        <div className="op-card p-4">
          <div className="flex items-start gap-3 mb-3">
            {/* Agency logo */}
            <div
              className="h-12 w-12 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-lg font-bold"
              style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)" }}
            >
              ED
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-[#0F1020]">Elevate Digital Solutions</h3>
              <p className="text-[12px] text-[#6B7280] mt-0.5 leading-snug">
                Growth-focused marketing for modern brands
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {["Digital Marketing", "Design", "Paid Advertising", "Branding"].map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-[#7C3AED] border border-[#DDD6FE] bg-purple-50"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Mini workspace preview */}
          <div className="rounded-xl bg-[#FBFAFF] border border-[#EAEAF2] p-3 mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Workspace
            </p>
            <div className="space-y-1.5">
              {[
                { label: "Active Clients", value: "0", icon: "👤" },
                { label: "Automations", value: "0", icon: "⚡" },
                { label: "Templates", value: "0", icon: "📋" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-[11px] text-[#6B7280]">{row.icon} {row.label}</span>
                  <span className="text-[11px] font-bold text-[#0F1020]">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Client satisfaction floating card */}
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold text-[#0F1020]">4.9/5</span>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-[#0F1020]">Client Satisfaction</p>
              <p className="text-[10px] text-gray-400">Based on 0 reviews</p>
            </div>
          </div>
        </div>

        {/* Info note */}
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
          <p className="text-[11px] font-semibold text-blue-700 mb-0.5">Preview updates live</p>
          <p className="text-[10px] text-blue-600">
            As you fill in your agency details, the profile preview updates in real time.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Form ─────────────────────────────────────────────────────────────────
function AgencyProfileForm() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Progress */}
      <div className="op-card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-bold text-[#0F1020]">Setup Progress</p>
            <p className="text-[11px] text-[#6B7280]">1 of 7 steps completed</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-[#7C3AED]">14%</p>
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: "14%", background: "linear-gradient(90deg, #7C3AED 0%, #A855F7 100%)" }}
          />
        </div>
      </div>

      {/* Form card */}
      <div className="op-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)" }}
          >
            1
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0F1020]">Agency Profile</h2>
            <p className="text-[12px] text-[#6B7280]">Tell us about your agency</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Agency name */}
          <div>
            <label className="block text-sm font-semibold text-[#0F1020] mb-1.5">
              Agency Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              defaultValue="Elevate Digital Solutions"
              className="op-input"
              placeholder="Your agency name"
            />
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-sm font-semibold text-[#0F1020] mb-1.5">
              Tagline
            </label>
            <input
              type="text"
              defaultValue="Growth-focused marketing for modern brands"
              className="op-input"
              placeholder="Short description of your agency"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-semibold text-[#0F1020] mb-1.5">
              Your Role
            </label>
            <div className="relative">
              <select className="op-input appearance-none pr-9">
                <option>Agency Owner</option>
                <option>Operations Manager</option>
                <option>Account Manager</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Agency size */}
          <div>
            <label className="block text-sm font-semibold text-[#0F1020] mb-2">
              Agency Size
            </label>
            <div className="grid grid-cols-4 gap-2">
              {AGENCY_SIZES.map((s) => (
                <div
                  key={s.label}
                  className={`rounded-xl border-2 p-3 text-center cursor-pointer transition-all ${
                    s.active
                      ? "border-[#7C3AED] bg-purple-50"
                      : "border-[#EAEAF2] bg-white hover:border-purple-200"
                  }`}
                >
                  <p className={`text-sm font-bold ${s.active ? "text-[#7C3AED]" : "text-[#6B7280]"}`}>
                    {s.label}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${s.active ? "text-purple-500" : "text-gray-400"}`}>
                    people
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Agency type */}
          <div>
            <label className="block text-sm font-semibold text-[#0F1020] mb-2">
              Agency Type <span className="text-[11px] font-normal text-[#6B7280]">(select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {AGENCY_TYPES.map((type) => (
                <button
                  key={type.label}
                  className={`rounded-full border-2 px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    type.active
                      ? "border-[#7C3AED] bg-purple-50 text-[#7C3AED]"
                      : "border-[#EAEAF2] bg-white text-[#6B7280] hover:border-purple-200"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5 rounded-xl border border-[#EAEAF2] bg-[#FBFAFF] p-3">
              <Clock className="h-4 w-4 text-[#7C3AED] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#0F1020]">Time to complete</p>
                <p className="text-[11px] text-[#6B7280]">Approx. 5–7 minutes</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-[#EAEAF2] bg-[#FBFAFF] p-3">
              <Shield className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#0F1020]">Your data is secure</p>
                <p className="text-[11px] text-[#6B7280]">SOC 2 Type II certified</p>
              </div>
            </div>
          </div>

          {/* Continue */}
          <button
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)" }}
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AgencyOnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      {/* Browser window container */}
      <div
        className="w-full max-w-[1200px] rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.15)]"
        style={{ height: "calc(100vh - 48px)", maxHeight: "820px" }}
      >
        {/* macOS traffic lights bar */}
        <div className="flex items-center gap-2 bg-[#F2F2F2] px-4 py-2.5 border-b border-gray-200">
          <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
          <div className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
          <div className="h-3 w-3 rounded-full bg-[#28C840]" />
          <div className="flex-1 mx-4">
            <div className="mx-auto max-w-xs rounded-md bg-white border border-gray-200 flex items-center justify-center gap-2 px-3 py-1">
              <Globe className="h-3 w-3 text-gray-400" />
              <span className="text-[11px] text-gray-500">app.optimora.ai/agency-onboarding</span>
            </div>
          </div>
        </div>

        {/* App content */}
        <div className="flex h-full bg-[#FBFAFF]" style={{ height: "calc(100% - 40px)" }}>
          {/* Left sidebar */}
          <div className="flex h-full w-52 flex-shrink-0 flex-col border-r border-[#EAEAF2] bg-white">
            <div className="flex h-14 items-center px-4 border-b border-[#EAEAF2]">
              <div className="flex items-center gap-2">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)" }}
                >
                  O
                </div>
                <span className="text-sm font-bold text-[#0F1020]">Optimora</span>
              </div>
            </div>
            <nav className="flex-1 px-3 py-3 space-y-0.5">
              {[
                { label: "Onboarding", active: true },
                { label: "Dashboard" },
                { label: "Clients" },
                { label: "Workspaces" },
                { label: "Templates" },
                { label: "Automations" },
                { label: "Team" },
                { label: "Billing" },
                { label: "Settings" },
              ].map((item) => (
                <div
                  key={item.label}
                  className={item.active ? "nav-item-active" : "nav-item"}
                >
                  <Sparkles className="h-4 w-4" />
                  {item.label}
                </div>
              ))}
            </nav>
            {/* Bottom */}
            <div className="border-t border-[#EAEAF2] p-3 space-y-2">
              <div className="rounded-xl border border-[#EAEAF2] bg-[#FBFAFF] p-3">
                <p className="text-[11px] font-semibold text-[#0F1020] mb-1">Need help?</p>
                <p className="text-[10px] text-gray-500 mb-2">Our team is ready to support you</p>
                <button className="w-full rounded-lg border border-[#EAEAF2] bg-white py-1.5 text-[11px] font-semibold text-[#0F1020]">
                  Schedule a call
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  AM
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#0F1020] truncate">Alex Morgan</p>
                  <p className="text-[10px] text-gray-400">Agency Owner</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <div className="border-b border-[#EAEAF2] bg-white px-6 py-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-xl font-bold text-[#0F1020]">
                    Set up your agency in minutes ✨
                  </h1>
                  <p className="text-sm text-[#6B7280] mt-0.5">
                    We&apos;ll guide you through everything you need to launch successfully.
                  </p>
                </div>
                <button className="btn-outline text-xs px-4 py-2">
                  Save &amp; Exit
                </button>
              </div>

              {/* Stepper */}
              <div className="overflow-x-auto pb-1">
                <div className="min-w-[700px]">
                  <Stepper steps={STEPS} current={0} />
                </div>
              </div>
            </div>

            {/* Content area */}
            <div className="flex flex-1 overflow-hidden">
              <AgencyProfileForm />
              <LivePreviewPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

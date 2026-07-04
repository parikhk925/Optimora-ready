"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Bot, ListTodo, Play, Brain,
  Wrench, Plug, ShieldCheck, BarChart3, ScrollText,
  Globe, Settings, Building2, Zap, Package, GitBranch,
  Activity, TrendingUp, Users, X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useShell } from "@/components/dashboard/dashboard-shell";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },

  { label: "Industry Packs", href: "/dashboard/packs", icon: Package, section: "Automation OS" },
  { label: "Agent Library", href: "/dashboard/agent-library", icon: Bot, section: "Automation OS" },
  { label: "Workflows", href: "/dashboard/workflows", icon: GitBranch, section: "Automation OS" },
  { label: "Workflow Runs", href: "/dashboard/workflows/runs", icon: Play, section: "Automation OS" },
  { label: "Execution Logs", href: "/dashboard/workflows/logs", icon: ScrollText, section: "Automation OS" },
  { label: "Activity Feed", href: "/dashboard/activity", icon: Activity, section: "Automation OS" },
  { label: "ROI Dashboard", href: "/dashboard/roi", icon: TrendingUp, section: "Automation OS" },

  { label: "Run Agent", href: "/dashboard/run", icon: Zap, section: "AI Engine" },
  { label: "Tasks", href: "/dashboard/tasks", icon: ListTodo, section: "AI Engine" },
  { label: "Runs", href: "/dashboard/runs", icon: Play, section: "AI Engine" },
  { label: "Memory", href: "/dashboard/memory", icon: Brain, section: "AI Engine" },

  { label: "Tools", href: "/dashboard/tools", icon: Wrench, section: "Connectors" },
  { label: "Integrations", href: "/dashboard/integrations", icon: Plug, section: "Connectors" },

  { label: "Approvals", href: "/dashboard/approvals", icon: ShieldCheck, section: "Governance" },
  { label: "Audit Logs", href: "/dashboard/audit", icon: ScrollText, section: "Governance" },
  { label: "Jurisdiction", href: "/dashboard/jurisdiction", icon: Globe, section: "Governance" },

  { label: "Agency Mode", href: "/dashboard/agency-os", icon: Users, section: "Account" },
  { label: "Usage & Billing", href: "/dashboard/billing", icon: BarChart3, section: "Account" },
  { label: "Agency Settings", href: "/dashboard/agency", icon: Building2, section: "Account" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, section: "Account" },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  let lastSection = "";

  return (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-white/60 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-bold" style={{ background: "linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)" }}>O</div>
        <div>
          <span className="text-sm font-bold text-[#0F1020]">Optimora</span>
          <p className="text-[10px] text-gray-400 leading-none">AI Automation OS</p>
        </div>
        <button
          type="button"
          onClick={onNavigate}
          className="ml-auto rounded-lg p-1.5 text-gray-400 hover:bg-white/70 lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <div key={item.href}>
              {showSection && (
                <p className="mt-4 mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {item.section}
                </p>
              )}
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(active ? "glass-nav-item-active" : "glass-nav-item")}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>
    </>
  );
}

export function Sidebar() {
  const { mobileNavOpen, setMobileNavOpen } = useShell();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="glass-panel hidden h-full w-64 flex-col border-r lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="glass-panel relative flex h-full w-72 max-w-[85vw] flex-col border-r shadow-2xl">
            <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}

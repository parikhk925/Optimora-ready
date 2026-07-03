"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Bot, ListTodo, Play, Brain,
  Wrench, Plug, ShieldCheck, BarChart3, ScrollText,
  Globe, Settings, Building2, Zap, Package, GitBranch,
  Activity, TrendingUp, Users,
} from "lucide-react";
import { cn } from "@/lib/cn";

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

export function Sidebar() {
  const pathname = usePathname();
  let lastSection = "";

  return (
    <aside className="flex h-full w-60 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white text-sm font-bold">O</div>
        <div>
          <span className="text-sm font-bold text-gray-900">Optimora</span>
          <p className="text-[10px] text-gray-400 leading-none">AI Automation OS</p>
        </div>
      </div>

      {/* Nav */}
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
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

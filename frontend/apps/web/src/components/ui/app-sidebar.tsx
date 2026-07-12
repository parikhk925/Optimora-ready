"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import {
  Home, Zap, LayoutTemplate, Package, Database, Brain,
  BarChart2, Settings, Users, CreditCard, ChevronRight,
  Play, Eye, GitBranch, PlugZap,
  Logs, AlertTriangle, CheckSquare, HardDrive, ChevronDown,
  Sparkles,
} from "lucide-react";

export type AppSidebarVariant = "default" | "command-center" | "agency";

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
  badge?: string | number;
}

interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

interface AppSidebarProps {
  variant?: AppSidebarVariant;
  activeItem?: string;
}

const defaultSections: SidebarSection[] = [
  {
    items: [
      { icon: Home, label: "Home", href: "/" },
      { icon: Zap, label: "Automations", href: "/dashboard/workflows" },
      { icon: LayoutTemplate, label: "Templates", href: "/dashboard/workflows" },
      { icon: Package, label: "Industry Packs", href: "/industry-packs", active: true },
      { icon: Database, label: "Data & Connections", href: "/dashboard/integrations" },
      { icon: Brain, label: "AI Hub", href: "/dashboard/run" },
      { icon: BarChart2, label: "Analytics", href: "/dashboard/roi" },
      { icon: Settings, label: "Settings", href: "/dashboard/settings" },
    ],
  },
];

const commandCenterSections: SidebarSection[] = [
  {
    title: "AUTOMATE",
    items: [
      { icon: Brain, label: "Agents", href: "/dashboard/agents" },
      { icon: GitBranch, label: "Workflows", href: "/dashboard/workflows" },
      { icon: LayoutTemplate, label: "Templates", href: "/dashboard/workflows" },
      { icon: Zap, label: "Triggers", href: "/dashboard/workflows" },
      { icon: PlugZap, label: "Connections", href: "/dashboard/integrations" },
    ],
  },
  {
    title: "OBSERVE",
    items: [
      { icon: Play, label: "Runs", href: "/dashboard/workflows/runs" },
      { icon: Eye, label: "Monitoring", href: "/dashboard/activity" },
      { icon: Logs, label: "Logs", href: "/dashboard/workflows/logs" },
      { icon: AlertTriangle, label: "Alerts", href: "/dashboard/approvals" },
    ],
  },
  {
    title: "MANAGE",
    items: [
      { icon: CheckSquare, label: "Approvals", href: "/dashboard/approvals" },
      { icon: HardDrive, label: "Data", href: "/dashboard/memory" },
      { icon: Settings, label: "Settings", href: "/dashboard/settings" },
      { icon: Users, label: "Members", href: "/dashboard/agency" },
      { icon: CreditCard, label: "Billing", href: "/dashboard/billing" },
    ],
  },
];

const agencySections: SidebarSection[] = [
  {
    items: [
      { icon: BarChart2, label: "Dashboard", href: "/dashboard/agency-os" },
      { icon: Users, label: "Clients", href: "/dashboard/agency" },
      { icon: Package, label: "Workspaces", href: "/dashboard" },
      { icon: LayoutTemplate, label: "Templates", href: "/dashboard/workflows" },
      { icon: Zap, label: "Automations", href: "/dashboard/workflows" },
      { icon: Users, label: "Team", href: "/dashboard/agency" },
      { icon: CreditCard, label: "Billing", href: "/dashboard/billing" },
      { icon: Settings, label: "Settings", href: "/dashboard/settings" },
    ],
  },
];

export function AppSidebar({ variant = "default", activeItem }: AppSidebarProps) {
  const isCommandCenter = variant === "command-center";
  const isAgency = variant === "agency";

  const sections = isCommandCenter
    ? commandCenterSections
    : isAgency
    ? agencySections
    : defaultSections;

  return (
    <aside className="flex h-full w-56 flex-shrink-0 flex-col border-r border-[#EAEAF2] bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-[#EAEAF2]">
        <Logo size="sm" />
      </div>

      {/* Active item highlight (for command center) */}
      {isCommandCenter && (
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#7C3AED] bg-purple-50">
            <Brain className="h-4 w-4" />
            Command Center
          </div>
        </div>
      )}

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {sections.map((section, si) => (
          <div key={si}>
            {section.title && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.active || item.label === activeItem;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={isActive ? "nav-item-active" : "nav-item"}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-[#7C3AED] px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom sections */}
      {!isCommandCenter && !isAgency && (
        <div className="border-t border-[#EAEAF2] p-3 space-y-2">
          {/* Workspace */}
          <div className="rounded-xl border border-[#EAEAF2] bg-[#FBFAFF] p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#0F1020] truncate">Acme Corp</p>
                <p className="text-[10px] text-gray-400">Enterprise Plan</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            </div>
          </div>

          {/* Copilot promo */}
          <div className="rounded-xl bg-gradient-to-br from-purple-50 to-orange-50 border border-purple-100 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <p className="text-xs font-semibold text-purple-900">AI Copilot</p>
            </div>
            <p className="text-[10px] text-purple-700 mb-2">Get intelligent suggestions for your automations</p>
            <Link href="/dashboard/run" className="block w-full rounded-lg bg-[#7C3AED] py-1.5 text-center text-[11px] font-semibold text-white hover:bg-purple-700 transition-colors">
              Try Copilot
            </Link>
          </div>

          {/* User */}
          <div className="flex items-center gap-2 px-1">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              SM
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#0F1020] truncate">Sarah Mitchell</p>
              <p className="text-[10px] text-gray-400 truncate">sarah@acme.com</p>
            </div>
          </div>
        </div>
      )}

      {isCommandCenter && (
        <div className="p-3 space-y-2">
          {/* Upgrade card */}
          <div
            className="rounded-xl p-3 text-white"
            style={{ background: "linear-gradient(135deg, #FF7A3D 0%, #F97316 50%, #7C3AED 100%)" }}
          >
            <p className="text-xs font-bold mb-0.5">Upgrade Plan</p>
            <p className="text-[10px] text-orange-100 mb-2">Unlock more agents, runs, and advanced features.</p>
            <Link href="/dashboard/billing" className="block w-full rounded-lg bg-white/20 py-1.5 text-center text-[11px] font-semibold text-white hover:bg-white/30 transition-colors backdrop-blur-sm">
              View Plans
            </Link>
          </div>
          {/* Collapse */}
          <Link href="/dashboard" className="nav-item w-full">
            <ChevronRight className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      )}

      {isAgency && (
        <div className="border-t border-[#EAEAF2] p-3 space-y-3">
          {/* Help card */}
          <div className="rounded-xl border border-[#EAEAF2] bg-[#FBFAFF] p-3">
            <p className="text-xs font-semibold text-[#0F1020] mb-1">Need help?</p>
            <p className="text-[10px] text-gray-500 mb-2">Our team is here to support you</p>
            <Link href="/paid-pilot" className="block w-full rounded-lg border border-[#EAEAF2] bg-white py-1.5 text-center text-[11px] font-semibold text-[#0F1020] hover:bg-gray-50 transition-colors">
              Schedule a call
            </Link>
          </div>
          {/* User */}
          <div className="flex items-center gap-2 px-1">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              AM
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#0F1020] truncate">Alex Morgan</p>
              <p className="text-[10px] text-gray-400 truncate">Agency Owner</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

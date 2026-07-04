"use client";

import { Bell, ChevronDown, Building2, LogOut, Menu } from "lucide-react";
import { getTenantContext } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/session-context";
import type { ServerSession } from "@/lib/session";
import { useState } from "react";
import { useShell } from "@/components/dashboard/dashboard-shell";

interface TopbarProps {
  initialSession: Pick<ServerSession, "user" | "tenantId" | "dev">;
}

export function Topbar({ initialSession }: TopbarProps) {
  const ctx = getTenantContext();
  const { session, logout } = useSession();
  const { setMobileNavOpen } = useShell();
  const [menuOpen, setMenuOpen] = useState(false);

  // Use live session if loaded, fall back to server-rendered initial
  const activeSession = session ?? initialSession;
  const user = activeSession.user;
  const initial = user.email.charAt(0).toUpperCase();
  const isDevStub = Boolean(activeSession.dev);

  return (
    <header className="glass-panel flex h-16 items-center justify-between border-b px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="rounded-lg p-2 text-gray-500 hover:bg-white/70 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Workspace selector */}
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-white/60 bg-white/50 px-2.5 py-1.5 text-sm hover:bg-white/80 transition-colors sm:px-3"
        >
          <Building2 className="h-4 w-4 text-gray-500" />
          <span className="hidden font-medium text-gray-700 sm:inline">{ctx.agencyName}</span>
          <Badge variant="muted">{isDevStub ? "Local Dev" : ctx.planKey}</Badge>
          <ChevronDown className="hidden h-3.5 w-3.5 text-gray-400 sm:inline" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="relative rounded-lg p-2 text-gray-500 hover:bg-white/70 hover:text-gray-700 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* User avatar + menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white/70 transition-colors sm:px-2"
            aria-label="User menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-semibold" style={{ background: "linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)" }}>
              {initial}
            </div>
            <span className="hidden text-sm text-gray-700 md:block">{user.email}</span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-gray-400 sm:inline" />
          </button>

          {menuOpen && (
            <div className="glass-panel absolute right-0 top-full mt-1 w-44 rounded-xl border py-1 shadow-lg z-50">
              <div className="border-b border-white/60 px-3 py-2">
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-white/70"
              >
                <LogOut className="h-4 w-4 text-gray-400" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

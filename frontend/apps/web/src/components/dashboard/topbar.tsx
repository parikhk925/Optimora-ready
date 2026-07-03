"use client";

import { Bell, ChevronDown, Building2, LogOut } from "lucide-react";
import { getTenantContext } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/session-context";
import type { ServerSession } from "@/lib/session";
import { useState } from "react";

interface TopbarProps {
  initialSession: Pick<ServerSession, "user" | "tenantId" | "demo" | "dev">;
}

export function Topbar({ initialSession }: TopbarProps) {
  const ctx = getTenantContext();
  const { session, logout } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  // Use live session if loaded, fall back to server-rendered initial
  const activeSession = session ?? initialSession;
  const user = activeSession.user;
  const initial = user.email.charAt(0).toUpperCase();
  const isDemoWorkspace = Boolean(activeSession.demo || activeSession.dev);
  const workspaceName = isDemoWorkspace ? "Demo Workspace" : ctx.agencyName;

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Workspace selector */}
      <button
        type="button"
        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
      >
        <Building2 className="h-4 w-4 text-gray-500" />
        <span className="font-medium text-gray-700">{workspaceName}</span>
        <Badge variant="muted">{isDemoWorkspace ? "Demo Mode" : ctx.planKey}</Badge>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* User avatar + menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-50 transition-colors"
            aria-label="User menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-semibold">
              {initial}
            </div>
            <span className="hidden text-sm text-gray-700 sm:block">{user.email}</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-50">
              <div className="border-b border-gray-100 px-3 py-2">
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
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

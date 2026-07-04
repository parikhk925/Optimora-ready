"use client";

import { createContext, useContext, useState } from "react";

interface ShellState {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

const ShellContext = createContext<ShellState | null>(null);

export function useShell(): ShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within DashboardShell");
  return ctx;
}

/** Holds the mobile-nav-open state shared between Sidebar and Topbar. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <ShellContext.Provider value={{ mobileNavOpen, setMobileNavOpen }}>
      <div className="app-shell-bg flex h-screen overflow-hidden">{children}</div>
    </ShellContext.Provider>
  );
}

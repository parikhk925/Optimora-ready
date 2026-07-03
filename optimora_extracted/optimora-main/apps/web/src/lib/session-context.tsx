"use client";

/**
 * Client-side session context.
 * Loads session from /api/auth/session (safe - no tokens returned).
 * Re-exported as a Provider that wraps the dashboard layout.
 */
import { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface ClientSession {
  user: { id: string; email: string };
  tenantId: string;
  orgId?: string;
  demo?: boolean;
  dev?: boolean;
}

interface SessionState {
  session: ClientSession | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  logout: () => Promise<void>;
}

const SessionCtx = createContext<SessionState>({
  session: null,
  loading: true,
  error: null,
  reload: () => undefined,
  logout: async () => undefined,
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) {
        setSession(null);
        if (res.status === 401) setError("unauthenticated");
      } else {
        const data = (await res.json()) as ClientSession;
        setSession(data);
      }
    } catch {
      setError("network_error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    window.location.href = "/login";
  }, []);

  return (
    <SessionCtx.Provider value={{ session, loading, error, reload: fetchSession, logout }}>
      {children}
    </SessionCtx.Provider>
  );
}

export function useSession(): SessionState {
  return useContext(SessionCtx);
}

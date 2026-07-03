"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const CONNECTABLE = new Set(["webhook", "google-sheets", "email", "crm"]);

export function IntegrationActions({ integrationKey, status }: { integrationKey: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!CONNECTABLE.has(integrationKey)) {
    return <span className="text-xs text-gray-400" data-testid={`integration-not-implemented-${integrationKey}`}>Not implemented yet</span>;
  }

  async function call(action: "connect" | "disconnect" | "test") {
    setLoading(action);
    setMessage(null);
    try {
      const res = await fetch(`/api/automation/integrations/${integrationKey}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed to ${action}.`);
      setMessage(data.label ?? (action === "connect" ? "Connected" : action === "disconnect" ? "Disconnected" : "OK"));
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  const connected = status === "connected";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {!connected ? (
          <button
            type="button"
            data-testid={`integration-connect-${integrationKey}`}
            onClick={() => call("connect")}
            disabled={loading !== null}
            className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {loading === "connect" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Connect"}
          </button>
        ) : (
          <button
            type="button"
            data-testid={`integration-disconnect-${integrationKey}`}
            onClick={() => call("disconnect")}
            disabled={loading !== null}
            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            {loading === "disconnect" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Disconnect"}
          </button>
        )}
        <button
          type="button"
          data-testid={`integration-test-${integrationKey}`}
          onClick={() => call("test")}
          disabled={loading !== null}
          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-colors"
        >
          {loading === "test" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test"}
        </button>
      </div>
      {message && <p data-testid={`integration-message-${integrationKey}`} className="text-[11px] text-gray-500 max-w-[220px]">{message}</p>}
    </div>
  );
}

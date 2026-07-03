"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, Loader2, RefreshCw } from "lucide-react";

export function RunControls({ runId, status }: { runId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"cancel" | "retry" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(action: "cancel" | "retry") {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/automation/runs/${runId}/${action}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed to ${action} run.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  const canCancel = status === "queued" || status === "running" || status === "waiting_for_approval";
  const canRetry = status === "failed";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        data-testid="run-refresh-button"
        onClick={() => router.refresh()}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Refresh
      </button>
      {canCancel && (
        <button
          type="button"
          data-testid="run-cancel-button"
          onClick={() => call("cancel")}
          disabled={loading !== null}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 transition-colors"
        >
          {loading === "cancel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
          Cancel run
        </button>
      )}
      {canRetry && (
        <button
          type="button"
          data-testid="run-retry-button"
          onClick={() => call("retry")}
          disabled={loading !== null}
          className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60 transition-colors"
        >
          {loading === "retry" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Retry from failed step
        </button>
      )}
      {error && <p data-testid="run-controls-error" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";

export function RunWorkflowButton({ templateKey }: { templateKey: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const deployRes = await fetch("/api/automation/workflows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateKey }),
      });
      const deployData = await deployRes.json();
      if (!deployRes.ok || !deployData.id) {
        throw new Error(deployData.error ?? "Failed to prepare workflow for running.");
      }

      const runRes = await fetch(`/api/automation/workflows/${deployData.id}/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inputData: {} }),
      });
      const runData = await runRes.json();
      if (!runRes.ok || !runData.id) {
        throw new Error(runData.error ?? "Failed to start workflow run.");
      }

      router.push(`/dashboard/workflows/runs/${runData.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run workflow.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        data-testid="run-workflow-button"
        onClick={handleRun}
        disabled={loading}
        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {loading ? "Starting run..." : "Run Workflow"}
      </button>
      {error && (
        <p data-testid="run-workflow-error" className="text-xs text-red-600 max-w-xs">{error}</p>
      )}
    </div>
  );
}

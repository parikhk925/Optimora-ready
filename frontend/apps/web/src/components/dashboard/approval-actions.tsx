"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

export function ApprovalActions({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<"approve" | "reject" | null>(null);

  async function decide(decision: "approve" | "reject") {
    setLoading(decision);
    setError(null);
    try {
      const res = await fetch(`/api/automation/approvals/${approvalId}/${decision}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed to ${decision} approval.`);
      setResolved(decision);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  if (resolved) {
    return (
      <span data-testid={`approval-resolved-${approvalId}`} className="text-xs font-semibold text-gray-500">
        {resolved === "approve" ? "Approved — run resumed" : "Rejected — run stopped"}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid={`approve-button-${approvalId}`}
          onClick={() => decide("approve")}
          disabled={loading !== null}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
        >
          {loading === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Approve
        </button>
        <button
          type="button"
          data-testid={`reject-button-${approvalId}`}
          onClick={() => decide("reject")}
          disabled={loading !== null}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 transition-colors"
        >
          {loading === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          Reject
        </button>
      </div>
      {error && <p data-testid={`approval-error-${approvalId}`} className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

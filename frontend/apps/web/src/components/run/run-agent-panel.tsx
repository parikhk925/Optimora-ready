"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { RUN_EXAMPLES, DEMO_AGENTS, DEMO_JURISDICTIONS, type RunExample } from "@/lib/demo-data";
import { IndustryIconFromMeta } from "@/components/ui/industry-icon";
import { getAgentIconMeta, AGENT_DEMO_KEY_TO_ROLE } from "@/lib/industry-icons";

// ── Types ────────────────────────────────────────────────────────────────────

interface RunResult {
  taskId: string;
  taskTitle: string;
  runId: string;
  runStatus: "pending" | "running" | "succeeded" | "failed";
  taskStatus: string;
  output: Record<string, unknown>;
  tokensIn: number;
  tokensOut: number;
  modelProvider: string;
  dev?: boolean;
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateRunForm(title: string, goal: string, agentKey: string, needsJurisdiction: boolean, jurisdiction: string): string | null {
  if (!agentKey) return "Select an agent.";
  if (!title.trim()) return "Task title is required.";
  if (title.trim().length < 3) return "Task title must be at least 3 characters.";
  if (!goal.trim()) return "Goal / instruction is required.";
  if (goal.trim().length < 5) return "Goal must be at least 5 characters.";
  if (needsJurisdiction && !jurisdiction) return "Finance/CA agent requires a jurisdiction.";
  return null;
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    succeeded: "bg-green-100 text-green-800",
    in_review: "bg-blue-100 text-blue-800",
    failed: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800",
    running: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-yellow-100 text-yellow-800",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", map[status] ?? "bg-gray-100 text-gray-700")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Example picker ────────────────────────────────────────────────────────────

function ExamplePicker({ onSelect }: { onSelect: (ex: RunExample) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Try an example</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {RUN_EXAMPLES.map((ex) => {
          const iconMeta = getAgentIconMeta(AGENT_DEMO_KEY_TO_ROLE[ex.agentKey] ?? "default");
          return (
            <button
              key={ex.label}
              type="button"
              onClick={() => onSelect(ex)}
              className="flex items-start gap-2.5 rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-left text-xs text-gray-600 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800 transition-colors"
            >
              <IndustryIconFromMeta meta={iconMeta} size="sm" className="flex-shrink-0 mt-0.5" />
              <div>
                <span className="block font-medium leading-snug">{ex.label}</span>
                <span className="block text-gray-400 mt-0.5">{ex.agentLabel}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Result view ───────────────────────────────────────────────────────────────

function ResultView({ result, onReset }: { result: RunResult; onReset: () => void }) {
  return (
    <div className="space-y-4">
      {result.dev && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
          Preview mode — deterministic sample output. No live backend or paid AI calls.
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Task</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">{result.taskTitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <StatusPill status={result.runStatus} />
          <StatusPill status={result.taskStatus} />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        <div className="px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Agent output</p>
          {Object.entries(result.output).map(([key, val]) => (
            <div key={key} className="mb-3 last:mb-0">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{key.replace(/([A-Z])/g, " $1")}</p>
              <p className="text-sm text-gray-800 mt-0.5 leading-relaxed">{String(val)}</p>
            </div>
          ))}
        </div>
        <div className="px-4 py-2.5 flex flex-wrap gap-4 text-xs text-gray-500">
          <span>Run <code className="font-mono text-gray-400">{result.runId.slice(0, 14)}…</code></span>
          <span>Model <span className="font-medium text-gray-700">{result.modelProvider}</span></span>
          <span>In <span className="font-medium text-gray-700">{result.tokensIn} tok</span></span>
          <span>Out <span className="font-medium text-gray-700">{result.tokensOut} tok</span></span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Run another task
        </button>
        <a href="/dashboard/runs" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
          View all runs →
        </a>
        <a href="/dashboard/tasks" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
          View all tasks →
        </a>
      </div>
    </div>
  );
}

// ── Form ─────────────────────────────────────────────────────────────────────

function RunForm({ onResult }: { onResult: (r: RunResult) => void }) {
  const [agentKey, setAgentKey] = useState("");
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedAgent = DEMO_AGENTS.find((a) => a.key === agentKey);
  const needsJurisdiction = agentKey === "finance-ca-agent";

  function applyExample(ex: RunExample) {
    setAgentKey(ex.agentKey);
    setTitle(ex.title);
    setGoal(ex.goal);
    setContext(ex.context);
    if (ex.defaultJurisdiction) setJurisdiction(ex.defaultJurisdiction);
    setFormError(null);
    setSubmitError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateRunForm(title, goal, agentKey, needsJurisdiction, jurisdiction);
    if (err) { setFormError(err); return; }
    setFormError(null);
    setSubmitError(null);
    setSubmitting(true);

    const contextWithJurisdiction = needsJurisdiction && jurisdiction
      ? `Jurisdiction: ${DEMO_JURISDICTIONS.find((j) => j.code === jurisdiction)?.label ?? jurisdiction}. ${context}`
      : context;

    try {
      const res = await fetch("/api/demo/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          goal: goal.trim(),
          context: contextWithJurisdiction.trim(),
        }),
      });
      const data = await res.json() as RunResult & { error?: string; message?: string };
      if (!res.ok) {
        setSubmitError(data.message ?? data.error ?? "Run failed.");
        setSubmitting(false);
        return;
      }
      onResult(data);
    } catch {
      setSubmitError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <ExamplePicker onSelect={applyExample} />
      <hr className="border-gray-100" />

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {/* Agent selector */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Agent <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DEMO_AGENTS.map((agent) => {
              const iconMeta = getAgentIconMeta(AGENT_DEMO_KEY_TO_ROLE[agent.key] ?? "default");
              const selected = agentKey === agent.key;
              return (
                <button
                  key={agent.key}
                  type="button"
                  onClick={() => setAgentKey(agent.key)}
                  className={cn(
                    "flex flex-col gap-2.5 rounded-xl border p-3 text-left text-xs transition-colors",
                    selected
                      ? "border-brand-400 bg-brand-50"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50",
                  )}
                >
                  <IndustryIconFromMeta meta={iconMeta} size="sm" />
                  <div>
                    <span className={cn("block font-semibold text-[13px]", selected ? "text-brand-900" : "text-gray-800")}>{agent.displayName}</span>
                    <span className="block text-gray-400 mt-0.5 leading-snug">{agent.role.split(" ").slice(0, 4).join(" ")}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedAgent?.jurisdictionNote && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <strong>Jurisdiction required:</strong> {selectedAgent.jurisdictionNote}
            </div>
          )}
        </div>

        {/* Jurisdiction picker (finance/CA only) */}
        {needsJurisdiction && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Jurisdiction <span className="text-red-500">*</span>
            </label>
            <select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Select jurisdiction…</option>
              {DEMO_JURISDICTIONS.map((j) => (
                <option key={j.code} value={j.code}>{j.label}</option>
              ))}
            </select>
            {jurisdiction === "GLOBAL" && (
              <p className="text-xs text-amber-700 mt-1">
                Global mode: agent uses a safe generic fallback with an explicit disclaimer. No country-specific rules apply.
              </p>
            )}
            {jurisdiction && jurisdiction !== "GLOBAL" && DEMO_JURISDICTIONS.find((j) => j.code === jurisdiction)?.disclaimer && (
              <p className="text-xs text-gray-500 mt-1">
                {DEMO_JURISDICTIONS.find((j) => j.code === jurisdiction)?.disclaimer}
              </p>
            )}
          </div>
        )}

        {/* Task title */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Task title <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Follow up with Acme Corp — Q3 renewal"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {/* Goal */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Goal / instruction <span className="text-red-500">*</span></label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            placeholder="Describe what you want the agent to do…"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none"
          />
        </div>

        {/* Context */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Context <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={2}
            placeholder="Client name, deal value, prior correspondence, relevant data…"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none"
          />
        </div>

        {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
        {submitError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                Agent working…
              </span>
            ) : "Assign to agent →"}
          </button>
          <p className="text-xs text-gray-400">Echo model · no paid calls · results are instant</p>
        </div>
      </form>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function RunAgentPanel() {
  const [result, setResult] = useState<RunResult | null>(null);

  if (result) {
    return <ResultView result={result} onReset={() => setResult(null)} />;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <RunForm onResult={setResult} />
    </div>
  );
}

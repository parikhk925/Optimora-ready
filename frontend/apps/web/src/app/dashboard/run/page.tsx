import { RunAgentPanel } from "@/components/run/run-agent-panel";

export const metadata = { title: "Run Agent — Optimora" };

export default function RunPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Run Agent</h1>
        <p className="mt-1 text-sm text-gray-500">
          Assign a task to one of your AI agents. Results are returned synchronously in this demo — deterministic, no paid AI calls.
        </p>
      </div>
      <RunAgentPanel />
    </div>
  );
}

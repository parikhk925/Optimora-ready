/**
 * Stub connectors (E9 Integrations). Deterministic, no network calls, no secrets.
 * Represent future real integrations: Slack, GitHub, Google Calendar. The stub
 * invoke() returns fixture data derived from args so tests are deterministic.
 */
import type { Connector, ConnectorCapability, ConnectorDefinition } from "./types.js";

function stubConnector(
  key: string,
  displayName: string,
  caps: string[],
  capabilities: ConnectorCapability[],
  invokeFn: (cap: string, args: Record<string, unknown>) => Record<string, unknown>,
): Connector {
  const definition: ConnectorDefinition = {
    key, displayName, description: `Stub ${displayName} connector.`, caps, available: true,
  };
  return {
    definition,
    capabilities,
    invoke(capName, args) { return invokeFn(capName, args); },
  };
}

export const SLACK_STUB: Connector = stubConnector(
  "slack", "Slack", ["messaging:send", "messaging:read"],
  [
    {
      toolName: "slack.send_message",
      description: "Send a message to a Slack channel (stub).",
      requiredCaps: ["messaging:send"],
      inputSchema: { type: "object", properties: { channel: { type: "string" }, text: { type: "string" } }, required: ["channel", "text"] },
      outputSchema: { type: "object", properties: { ok: { type: "boolean" }, ts: { type: "string" } }, required: ["ok", "ts"] },
    },
    {
      toolName: "slack.list_channels",
      description: "List Slack channels (stub).",
      requiredCaps: ["messaging:read"],
      inputSchema: { type: "object" },
      outputSchema: { type: "object", properties: { channels: { type: "array" } }, required: ["channels"] },
    },
  ],
  (cap, args) => {
    if (cap === "send_message") return { ok: true, ts: `stub-${String(args["channel"])}-${Date.now()}` };
    if (cap === "list_channels") return { channels: ["#general", "#engineering"] };
    return { ok: false, error: "unknown cap" };
  },
);

export const GITHUB_STUB: Connector = stubConnector(
  "github", "GitHub", ["repo:read", "issue:write"],
  [
    {
      toolName: "github.list_issues",
      description: "List GitHub issues (stub).",
      requiredCaps: ["repo:read"],
      inputSchema: { type: "object", properties: { repo: { type: "string" } }, required: ["repo"] },
      outputSchema: { type: "object", properties: { issues: { type: "array" } }, required: ["issues"] },
    },
    {
      toolName: "github.create_issue",
      description: "Create a GitHub issue (stub).",
      requiredCaps: ["issue:write"],
      inputSchema: { type: "object", properties: { repo: { type: "string" }, title: { type: "string" } }, required: ["repo", "title"] },
      outputSchema: { type: "object", properties: { id: { type: "number" }, url: { type: "string" } }, required: ["id", "url"] },
    },
  ],
  (cap, args) => {
    if (cap === "list_issues") return { issues: [{ id: 1, title: "Stub issue" }] };
    if (cap === "create_issue") return { id: 42, url: `https://stub.github/${String(args["repo"])}/42` };
    return {};
  },
);

export const DEFAULT_STUB_CONNECTORS: Connector[] = [SLACK_STUB, GITHUB_STUB];

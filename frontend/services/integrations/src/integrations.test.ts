/**
 * Integration / Connector unit tests (E9 Integrations). No DB, no AI calls.
 * Tests connector registry, stub capability listing, tool-seam wiring, error hierarchy.
 */
import { describe, expect, it } from "vitest";
import { buildDefaultRegistry, ToolRegistry } from "@optimora/tools";
import { ConnectorRegistry } from "./connector-registry.js";
import { registerConnectorTools } from "./tool-seam.js";
import { DEFAULT_STUB_CONNECTORS, GITHUB_STUB, SLACK_STUB } from "./stubs.js";
import {
  CapabilityNotFoundError,
  ConnectorNotFoundError,
  ConnectorUnavailableError,
  IntegrationError,
  InvalidConnectorContextError,
  MalformedConnectorRequestError,
  MissingSecretRefError,
  UnauthorizedConnectorError,
} from "./types.js";

function makeConnectorRegistry(): ConnectorRegistry {
  const r = new ConnectorRegistry();
  for (const c of DEFAULT_STUB_CONNECTORS) r.register(c);
  return r;
}

describe("ConnectorRegistry", () => {
  it("registers and retrieves connectors by key", () => {
    const r = makeConnectorRegistry();
    expect(r.get("slack")?.definition.key).toBe("slack");
    expect(r.get("github")?.definition.key).toBe("github");
    expect(r.get("missing")).toBeUndefined();
  });

  it("availableDefinitions returns only available connectors", () => {
    const r = makeConnectorRegistry();
    const defs = r.availableDefinitions();
    expect(defs.map((d) => d.key)).toContain("slack");
    expect(defs.map((d) => d.key)).toContain("github");
  });

  it("stub connectors list their capabilities", () => {
    expect(SLACK_STUB.capabilities.map((c) => c.toolName)).toContain("slack.send_message");
    expect(GITHUB_STUB.capabilities.map((c) => c.toolName)).toContain("github.list_issues");
  });
});

describe("registerConnectorTools (tool seam)", () => {
  it("registers connector capabilities into a ToolRegistry", () => {
    const cr = makeConnectorRegistry();
    const tr = buildDefaultRegistry();
    registerConnectorTools(cr, tr);
    expect(tr.get("slack.send_message")).toBeDefined();
    expect(tr.get("github.list_issues")).toBeDefined();
    expect(tr.get("github.create_issue")).toBeDefined();
  });

  it("connector tool fn is deterministic (no network)", async () => {
    const cr = makeConnectorRegistry();
    const tr = new ToolRegistry();
    registerConnectorTools(cr, tr);
    const fn = tr.get("slack.list_channels")!.fn;
    const a = await fn({});
    const b = await fn({});
    expect(a).toEqual(b);
  });

  it("connector tool is invocable through tools layer", async () => {
    const cr = makeConnectorRegistry();
    const tr = new ToolRegistry();
    registerConnectorTools(cr, tr);
    const fn = tr.get("github.list_issues")!.fn;
    const out = await fn({ repo: "test/repo" });
    expect((out as { issues: unknown[] }).issues).toBeDefined();
  });
});

describe("Stub connector invoke", () => {
  it("slack.send_message returns ok+ts", async () => {
    const out = await SLACK_STUB.invoke("send_message", { channel: "#dev", text: "hi" }, null);
    expect((out as { ok: boolean }).ok).toBe(true);
    expect(typeof (out as { ts: string }).ts).toBe("string");
  });

  it("github.create_issue returns id+url", async () => {
    const out = await GITHUB_STUB.invoke("create_issue", { repo: "org/repo", title: "Bug" }, null);
    expect(typeof (out as { id: number }).id).toBe("number");
    expect(typeof (out as { url: string }).url).toBe("string");
  });
});

describe("Error hierarchy", () => {
  it("all integration errors extend IntegrationError", () => {
    for (const Cls of [
      InvalidConnectorContextError, ConnectorNotFoundError, ConnectorUnavailableError,
      CapabilityNotFoundError, UnauthorizedConnectorError,
      MalformedConnectorRequestError, MissingSecretRefError,
    ]) {
      expect(new Cls("x")).toBeInstanceOf(IntegrationError);
    }
  });
});

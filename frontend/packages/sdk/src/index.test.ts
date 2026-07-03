import { describe, it, expect } from "vitest";
import { OptomoraClient, SdkError } from "./index.js";

describe("@optimora/sdk", () => {
  it("OptomoraClient is constructable", () => {
    const client = new OptomoraClient({ baseUrl: "http://localhost:3000", apiKey: "opt_test.key" });
    expect(client).toBeInstanceOf(OptomoraClient);
  });

  it("SdkError is an Error subclass with status and code", () => {
    const err = new SdkError(403, "insufficient_scope", "denied");
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(403);
    expect(err.code).toBe("insufficient_scope");
    expect(err.name).toBe("SdkError");
  });

  it("OptomoraClient exposes all expected methods", () => {
    const client = new OptomoraClient({ baseUrl: "http://localhost:3000", apiKey: "opt_test.key" });
    expect(typeof client.listPlans).toBe("function");
    expect(typeof client.listAgents).toBe("function");
    expect(typeof client.createTask).toBe("function");
    expect(typeof client.getTask).toBe("function");
    expect(typeof client.listTasks).toBe("function");
    expect(typeof client.startRun).toBe("function");
    expect(typeof client.createMemory).toBe("function");
    expect(typeof client.listTools).toBe("function");
    expect(typeof client.listIntegrations).toBe("function");
    expect(typeof client.submitApprovalDecision).toBe("function");
    expect(typeof client.getUsage).toBe("function");
    expect(typeof client.checkEntitlement).toBe("function");
    expect(typeof client.checkQuota).toBe("function");
  });
});

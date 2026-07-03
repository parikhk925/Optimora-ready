/**
 * Provider unit tests (T-9.1) — deterministic echo model + tool runner. No DB,
 * no AI calls.
 */
import { describe, expect, it } from "vitest";
import { EchoModelProvider } from "./echo-model.js";
import { StubModelProvider } from "./model-stub.js";
import { DeterministicToolRunner } from "./tool-runner.js";
import { ModelProviderNotImplementedError, UnauthorizedToolError } from "./types.js";

describe("EchoModelProvider", () => {
  it("produces the declared output-schema fields deterministically", () => {
    const res = new EchoModelProvider().complete({
      role: "Writer",
      jobDescription: "write",
      taskTitle: "Brief",
      input: { topic: "x" },
      outputSchema: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"] },
    });
    expect(typeof res.output.summary).toBe("string");
    expect(res.tokensIn).toBeGreaterThan(0);
    expect(res.tokensOut).toBeGreaterThan(0);
    expect(res.toolCalls).toEqual([]);
  });

  it("falls back to a result echo for an open object schema", () => {
    const res = new EchoModelProvider().complete({
      role: "Writer",
      jobDescription: "",
      taskTitle: "T",
      input: { a: 1 },
      outputSchema: { type: "object" },
    });
    expect(res.output.result).toContain("Writer");
    expect(res.output.echo).toEqual({ a: 1 });
  });
});

describe("StubModelProvider", () => {
  it("fails closed (no paid model wired)", () => {
    expect(() =>
      new StubModelProvider().complete({
        role: "r",
        jobDescription: "",
        taskTitle: "t",
        input: {},
        outputSchema: {},
      }),
    ).toThrow(ModelProviderNotImplementedError);
  });
});

describe("DeterministicToolRunner", () => {
  it("runs registered stub tools", () => {
    const r = new DeterministicToolRunner();
    expect(r.run({ name: "echo", args: { x: 1 } }).output).toEqual({ echoed: { x: 1 } });
    expect(r.run({ name: "noop", args: {} }).ok).toBe(true);
  });

  it("fails closed on an unknown tool", () => {
    expect(() => new DeterministicToolRunner().run({ name: "ghost", args: {} })).toThrow(
      UnauthorizedToolError,
    );
  });
});

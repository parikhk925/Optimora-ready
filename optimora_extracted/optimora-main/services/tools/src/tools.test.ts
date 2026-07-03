/**
 * Tool layer unit tests (E9 Tools). No DB, no AI calls.
 * Tests schema validator, registry lookup, and error hierarchy.
 */
import { describe, expect, it } from "vitest";
import { validate } from "./schema-validator.js";
import { buildDefaultRegistry, ToolRegistry } from "./registry.js";
import {
  InvalidToolContextError,
  InvalidToolInputError,
  InvalidToolOutputError,
  MalformedToolRequestError,
  ToolError,
  ToolNotFoundError,
  ToolUnavailableError,
  UnauthorizedToolAccessError,
} from "./types.js";

describe("validate", () => {
  it("passes on empty schema (open)", () => {
    expect(validate({ anything: 1 }, {}).valid).toBe(true);
  });

  it("enforces top-level type", () => {
    const r = validate("hello", { type: "object" });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("expected object");
  });

  it("enforces required fields", () => {
    const r = validate({}, { type: "object", required: ["name"] });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("name");
  });

  it("enforces property types recursively", () => {
    const schema = {
      type: "object",
      properties: { count: { type: "number" } },
    };
    expect(validate({ count: "not-a-number" }, schema).valid).toBe(false);
    expect(validate({ count: 5 }, schema).valid).toBe(true);
  });

  it("passes when required fields are present with correct types", () => {
    const schema = {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    };
    expect(validate({ text: "hello" }, schema).valid).toBe(true);
  });
});

describe("ToolRegistry", () => {
  it("registers and retrieves tools by name", () => {
    const r = new ToolRegistry();
    r.register({ name: "t1", description: "", requiredCaps: [], inputSchema: {}, outputSchema: {}, available: true }, () => ({}));
    expect(r.get("t1")).toBeDefined();
    expect(r.get("missing")).toBeUndefined();
  });

  it("buildDefaultRegistry includes echo, noop, summarize", () => {
    const r = buildDefaultRegistry();
    expect(r.get("echo")?.definition.available).toBe(true);
    expect(r.get("noop")?.definition.available).toBe(true);
    expect(r.get("summarize")?.definition.available).toBe(true);
  });

  it("echo stub is deterministic", async () => {
    const r = buildDefaultRegistry();
    const out = await r.get("echo")!.fn({ x: 1 });
    expect(out).toEqual({ echoed: { x: 1 } });
  });

  it("summarize stub is deterministic", async () => {
    const r = buildDefaultRegistry();
    const out = await r.get("summarize")!.fn({ text: "Hello world" });
    expect((out as { summary: string }).summary).toContain("Hello world");
  });
});

describe("Error hierarchy", () => {
  it("all tool errors extend ToolError", () => {
    for (const Cls of [
      InvalidToolContextError, ToolNotFoundError, ToolUnavailableError,
      InvalidToolInputError, InvalidToolOutputError,
      UnauthorizedToolAccessError, MalformedToolRequestError,
    ]) {
      expect(new Cls("x")).toBeInstanceOf(ToolError);
    }
  });
});

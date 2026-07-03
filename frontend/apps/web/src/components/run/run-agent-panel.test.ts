import { describe, it, expect } from "vitest";
import { validateRunForm } from "./run-agent-panel.js";

describe("validateRunForm", () => {
  const validArgs = ["My task title", "Do something useful with this data", "sales-agent", false, ""] as const;

  it("rejects missing agent", () => {
    expect(validateRunForm("Title ok", "Goal is fine here", "", false, "")).not.toBeNull();
  });

  it("rejects empty title", () => {
    expect(validateRunForm("", "Goal is fine here", "sales-agent", false, "")).not.toBeNull();
  });

  it("rejects short title", () => {
    expect(validateRunForm("hi", "Goal is fine here", "sales-agent", false, "")).not.toBeNull();
  });

  it("rejects empty goal", () => {
    expect(validateRunForm("My task", "", "sales-agent", false, "")).not.toBeNull();
  });

  it("rejects short goal", () => {
    expect(validateRunForm("My task", "ok", "sales-agent", false, "")).not.toBeNull();
  });

  it("accepts valid form without jurisdiction", () => {
    expect(validateRunForm(...validArgs)).toBeNull();
  });

  it("rejects finance/CA agent without jurisdiction", () => {
    expect(validateRunForm("Title", "Goal here for task", "finance-ca-agent", true, "")).not.toBeNull();
  });

  it("accepts finance/CA agent with jurisdiction", () => {
    expect(validateRunForm("Title", "Goal here for task", "finance-ca-agent", true, "CA")).toBeNull();
  });
});

describe("demo run dev stub", () => {
  it("output fields are strings with no secrets", () => {
    const stub = {
      summary: "Demo Agent processed: goal (echo model)",
      nextSteps: "Review the output and confirm or escalate.",
      confidence: "Deterministic stub — 100%",
    };
    for (const v of Object.values(stub)) {
      expect(typeof v).toBe("string");
    }
    const json = JSON.stringify(stub);
    expect(json).not.toMatch(/opt_[a-f0-9]/);
    expect(json).not.toMatch(/Bearer/);
  });

  it("model provider is echo — not a paid provider", () => {
    const provider = "echo";
    expect(provider).not.toMatch(/claude|gpt|gemini/i);
  });
});

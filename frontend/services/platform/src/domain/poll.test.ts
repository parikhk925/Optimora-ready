import { describe, it, expect } from "vitest";
import { pollUntilSettled } from "./poll.js";
import type { DomainStatus } from "./provider.js";

const noSleep = async (): Promise<void> => {};

describe("pollUntilSettled", () => {
  it("returns active once the check settles, counting attempts", async () => {
    let calls = 0;
    const check = async (): Promise<DomainStatus> => (++calls < 3 ? "pending" : "active");
    const res = await pollUntilSettled(check, { maxAttempts: 5, delayMs: 1, sleep: noSleep });
    expect(res).toEqual({ status: "active", attempts: 3 });
  });

  it("returns failed immediately on a failed check", async () => {
    const res = await pollUntilSettled(async () => "failed", {
      maxAttempts: 5,
      delayMs: 1,
      sleep: noSleep,
    });
    expect(res).toEqual({ status: "failed", attempts: 1 });
  });

  it("gives up as pending after exhausting attempts", async () => {
    const res = await pollUntilSettled(async () => "pending", {
      maxAttempts: 4,
      delayMs: 1,
      sleep: noSleep,
    });
    expect(res).toEqual({ status: "pending", attempts: 4 });
  });
});

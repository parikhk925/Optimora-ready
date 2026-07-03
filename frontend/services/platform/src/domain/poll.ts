/**
 * Durable-ish verification poll loop (T-1.7).
 *
 * Polls a verification check with bounded attempts and linear backoff until the
 * domain is active/failed or attempts are exhausted. The `sleep` dependency is
 * injectable so tests run instantly. In Phase 2 (T-7.1) a Temporal workflow will
 * own this retry/backoff (durable across restarts); the shape is kept identical
 * so the swap is mechanical.
 */
import type { DomainStatus } from "./provider.js";

export interface PollOptions {
  maxAttempts?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export interface PollResult {
  status: DomainStatus;
  attempts: number;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function pollUntilSettled(
  check: () => Promise<DomainStatus>,
  options: PollOptions = {},
): Promise<PollResult> {
  const maxAttempts = options.maxAttempts ?? 10;
  const delayMs = options.delayMs ?? 5000;
  const sleep = options.sleep ?? defaultSleep;

  let status: DomainStatus = "pending";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    status = await check();
    if (status === "active" || status === "failed") {
      return { status, attempts: attempt };
    }
    if (attempt < maxAttempts) await sleep(delayMs);
  }
  return { status, attempts: maxAttempts };
}

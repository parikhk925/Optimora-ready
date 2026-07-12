import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

async function loadVerifier() {
  return import("./webhook-signature.js");
}

describe("webhook signature verification", () => {
  it("fails closed in production when no signing secret is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBHOOK_SIGNING_SECRET", undefined);
    vi.stubEnv("WEBHOOK_ALLOW_UNSIGNED", undefined);
    vi.stubEnv("DEMO_MODE", undefined);
    vi.stubEnv("STAGING_DEMO_LOGIN", undefined);

    const { verifyWebhookSignature } = await loadVerifier();
    expect(verifyWebhookSignature("{}", null)).toEqual({ ok: false, reason: "missing_secret" });
  });

  it("allows unsigned webhooks in local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WEBHOOK_SIGNING_SECRET", undefined);

    const { verifyWebhookSignature } = await loadVerifier();
    expect(verifyWebhookSignature("{}", null)).toEqual({ ok: true });
  });

  it("allows unsigned webhooks only when explicitly enabled in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBHOOK_SIGNING_SECRET", undefined);
    vi.stubEnv("WEBHOOK_ALLOW_UNSIGNED", "true");

    const { verifyWebhookSignature } = await loadVerifier();
    expect(verifyWebhookSignature("{}", null)).toEqual({ ok: true });
  });

  it("accepts a valid HMAC signature", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBHOOK_SIGNING_SECRET", "test-secret");
    const body = JSON.stringify({ event: "lead.created" });
    const signature = createHmac("sha256", "test-secret").update(body).digest("hex");

    const { verifyWebhookSignature } = await loadVerifier();
    expect(verifyWebhookSignature(body, signature)).toEqual({ ok: true });
  });

  it("accepts a valid sha256-prefixed HMAC signature", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBHOOK_SIGNING_SECRET", "test-secret");
    const body = JSON.stringify({ event: "lead.created" });
    const signature = createHmac("sha256", "test-secret").update(body).digest("hex");

    const { verifyWebhookSignature } = await loadVerifier();
    expect(verifyWebhookSignature(body, `sha256=${signature}`)).toEqual({ ok: true });
  });

  it("rejects invalid signatures", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBHOOK_SIGNING_SECRET", "test-secret");

    const { verifyWebhookSignature } = await loadVerifier();
    expect(verifyWebhookSignature("{}", "sha256=bad")).toEqual({ ok: false, reason: "invalid_signature" });
  });
});

import { createHmac, timingSafeEqual } from "node:crypto";

export type WebhookSignatureResult =
  | { ok: true }
  | { ok: false; reason: "missing_secret" | "missing_signature" | "invalid_signature" };

function isExplicitlyUnsignedWebhookMode(): boolean {
  return (
    process.env.WEBHOOK_ALLOW_UNSIGNED === "true" ||
    process.env.DEMO_MODE === "true" ||
    process.env.STAGING_DEMO_LOGIN === "true"
  );
}

export function canAcceptUnsignedWebhook(): boolean {
  return process.env.NODE_ENV !== "production" || isExplicitlyUnsignedWebhookMode();
}

function normalizeSignature(signatureHeader: string): string {
  const trimmed = signatureHeader.trim();
  return trimmed.startsWith("sha256=") ? trimmed.slice("sha256=".length) : trimmed;
}

function safeCompare(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "hex");
  const rightBytes = Buffer.from(right, "hex");
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): WebhookSignatureResult {
  const secret = process.env.WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    return canAcceptUnsignedWebhook() ? { ok: true } : { ok: false, reason: "missing_secret" };
  }
  if (!signatureHeader) return { ok: false, reason: "missing_signature" };

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = normalizeSignature(signatureHeader);
  if (!/^[a-f0-9]{64}$/i.test(provided)) return { ok: false, reason: "invalid_signature" };

  try {
    return safeCompare(expected, provided.toLowerCase()) ? { ok: true } : { ok: false, reason: "invalid_signature" };
  } catch {
    return { ok: false, reason: "invalid_signature" };
  }
}

/**
 * Minimal in-memory rate limiter (Section 10 — security hardening).
 * Best-effort, per-process only (not distributed) — sufficient for a single
 * Next.js instance in this pass. Swap for a Redis-backed limiter before
 * scaling to multiple instances.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { allowed: true };
}

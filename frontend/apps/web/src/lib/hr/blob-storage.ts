/**
 * Resume file storage backed by Vercel Blob.
 *
 * Real uploads require a connected Blob store. Vercel's current SDK auths via
 * OIDC automatically once BLOB_STORE_ID is present (auto-injected when a Blob
 * store is connected to the project in the dashboard — Storage → Create
 * Database → Blob) — the explicit token param is ignored in that case. The
 * legacy BLOB_READ_WRITE_TOKEN is also accepted for local/non-Vercel setups.
 * When neither is present we return a clear requires_setup error rather than
 * faking a successful upload — mirrors email.ts's isRealModeEnabled() pattern.
 */
import { put } from "@vercel/blob";

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export interface BlobUploadResult {
  ok: boolean;
  storageKey?: string;
  url?: string;
  error?: string;
  status?: "requires_setup" | "failed";
}

/**
 * Uploads raw resume bytes to Vercel Blob under a tenant/org-scoped key.
 * Never fakes success: without a configured token it returns requires_setup.
 */
export async function uploadResumeToBlob(
  tenantId: string,
  orgId: string,
  filename: string,
  bytes: Buffer,
  contentType: string,
): Promise<BlobUploadResult> {
  if (!isBlobConfigured()) {
    return {
      ok: false,
      status: "requires_setup",
      error:
        "Vercel Blob is not configured (no BLOB_STORE_ID/BLOB_READ_WRITE_TOKEN). Create a Blob store in the Vercel dashboard (Storage → Create Database → Blob) and connect it to this project to enable resume uploads.",
    };
  }

  // Scope the object key by tenant/org so RLS-adjacent isolation is reflected in
  // storage too. Randomized suffix avoids collisions and guessable URLs.
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `resumes/${tenantId}/${orgId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`;

  try {
    // Resumes contain PII — always stored with private access, never a
    // publicly guessable URL.
    const blob = await put(key, bytes, {
      access: "private",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    return { ok: true, storageKey: key, url: blob.url };
  } catch (err) {
    return { ok: false, status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

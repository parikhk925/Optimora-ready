/**
 * Resume file storage backed by Vercel Blob.
 *
 * Real uploads require BLOB_READ_WRITE_TOKEN, which Vercel auto-provisions once
 * a Blob store is created in the dashboard (Storage → Create Database → Blob).
 * When the token is absent we return a clear requires_setup error rather than
 * faking a successful upload — mirrors email.ts's isRealModeEnabled() pattern.
 */
import { put } from "@vercel/blob";

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
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
        "Vercel Blob is not configured (BLOB_READ_WRITE_TOKEN unset). Create a Blob store in the Vercel dashboard (Storage → Create Database → Blob) to enable resume uploads.",
    };
  }

  // Scope the object key by tenant/org so RLS-adjacent isolation is reflected in
  // storage too. Randomized suffix avoids collisions and guessable URLs.
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `resumes/${tenantId}/${orgId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`;

  try {
    const blob = await put(key, bytes, {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    return { ok: true, storageKey: key, url: blob.url };
  } catch (err) {
    return { ok: false, status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

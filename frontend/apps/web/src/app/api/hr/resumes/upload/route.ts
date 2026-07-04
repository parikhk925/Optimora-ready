/**
 * POST /api/hr/resumes/upload
 *
 * Real HR resume intake (sourcing is upload-only — HR uploads, or a candidate
 * applies by uploading; NO scraping). Accepts multipart/form-data with one or
 * more `files` and an optional `jobDescription`. For each file:
 *   1. extract text (PDF/DOCX/TXT — real parsers, no fabricated content)
 *   2. upload the raw bytes to Vercel Blob
 *   3. run the real "resume-screener" AI agent
 *   4. persist UploadedFile + candidate BusinessObject (tenant/org scoped, RLS)
 *
 * Requires an authenticated session. Fails clearly (never fakes success) when
 * Vercel Blob is not configured.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";
import { uploadAndScreenResume } from "@/lib/automation-data";
import { extractResumeText } from "@/lib/hr/resume-extract";
import { isBlobConfigured, uploadResumeToBlob } from "@/lib/hr/blob-storage";

export const runtime = "nodejs";

// Vercel enforces a hard ~4.5MB request body limit on Node.js serverless
// functions, regardless of any code-level limit — a larger request never
// reaches this handler at all (rejected at the platform edge with an HTML
// error page, not JSON). Stay safely under that ceiling, accounting for
// multipart encoding overhead and the jobDescription field.
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB per resume

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const ctx = getAutomationContextFromSession(session);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "expected multipart/form-data" }, { status: 400 });
  }

  const jobDescription = (form.get("jobDescription") as string | null)?.toString() ?? undefined;
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const single = form.get("file");
  if (single instanceof File) files.push(single);

  if (files.length === 0) {
    return NextResponse.json({ error: "no files uploaded (field name: files)" }, { status: 400 });
  }

  if (!isBlobConfigured()) {
    return NextResponse.json(
      {
        error: "requires_setup",
        message:
          "Vercel Blob is not configured (BLOB_READ_WRITE_TOKEN unset). Create a Blob store in the Vercel dashboard (Storage → Create Database → Blob) to enable resume uploads.",
      },
      { status: 503 },
    );
  }

  const results: Array<Record<string, unknown>> = [];
  for (const file of files) {
    const filename = file.name || "resume";
    if (file.size > MAX_BYTES) {
      results.push({ filename, ok: false, error: "file exceeds 4 MB limit" });
      continue;
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";

    const extracted = await extractResumeText(filename, mimeType, bytes);
    if (!extracted.ok || !extracted.text) {
      results.push({ filename, ok: false, error: extracted.error ?? "text extraction failed" });
      continue;
    }

    const uploaded = await uploadResumeToBlob(ctx.tenantId, ctx.orgId, filename, bytes, mimeType);
    if (!uploaded.ok || !uploaded.storageKey) {
      results.push({ filename, ok: false, error: uploaded.error ?? "blob upload failed" });
      continue;
    }

    const screened = await uploadAndScreenResume(ctx, {
      filename,
      mimeType,
      sizeBytes: file.size,
      storageKey: uploaded.storageKey,
      resumeText: extracted.text,
      jobDescription,
    });
    if (!screened.ok) {
      results.push({ filename, ok: false, error: screened.error });
      continue;
    }

    results.push({
      filename,
      ok: true,
      candidateId: screened.candidateId,
      uploadedFileId: screened.uploadedFileId,
      provider: screened.provider,
      screening: screened.screening,
      fileUrl: uploaded.url,
    });
  }

  const anyOk = results.some((r) => r.ok);
  return NextResponse.json({ ok: anyOk, results }, { status: anyOk ? 200 : 422 });
}

"use client";

/**
 * Minimal HR resume upload widget (functional, not polished — redesign is out
 * of scope). Posts resumes to /api/hr/resumes/upload and renders the real
 * parsed screening result returned by the resume-screener agent. Sourcing is
 * upload-only (HR uploads, or candidates apply by uploading) — no scraping.
 */
import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";

interface ScreeningResult {
  filename: string;
  ok: boolean;
  error?: string;
  provider?: string;
  candidateId?: string;
  screening?: {
    candidateName?: string;
    email?: string | null;
    matchScore?: number;
    recommendation?: string;
    summary?: string;
    skills?: string[];
    yearsExperience?: number | null;
  };
}

export function HrResumeUpload() {
  const [jobDescription, setJobDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScreeningResult[]>([]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResults([]);
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("files") as HTMLInputElement | null;
    if (!fileInput?.files?.length) {
      setError("Choose at least one resume file (PDF, DOCX, or TXT).");
      return;
    }
    const data = new FormData();
    Array.from(fileInput.files).forEach((f) => data.append("files", f));
    if (jobDescription.trim()) data.append("jobDescription", jobDescription.trim());

    setBusy(true);
    try {
      const res = await fetch("/api/hr/resumes/upload", { method: "POST", body: data });
      const json = (await res.json()) as { ok?: boolean; results?: ScreeningResult[]; message?: string; error?: string };
      if (!res.ok && json.error === "requires_setup") {
        setError(json.message ?? "Resume storage is not configured yet.");
        return;
      }
      if (Array.isArray(json.results)) setResults(json.results);
      else setError(json.message ?? json.error ?? "Upload failed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <Upload className="h-4 w-4 text-violet-600" />
        <h2 className="text-sm font-bold text-gray-900">Screen resumes</h2>
        <span className="ml-auto rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-[10px] font-bold">Live agent</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Upload candidate resumes (PDF, DOCX, or TXT). The AI screener parses and scores each one against your job description. Sourcing is upload-only — no scraping.
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description / evaluation criteria (optional)"
          rows={3}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
        />
        <input
          name="files"
          type="file"
          multiple
          accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-white file:text-xs file:font-semibold hover:file:bg-violet-700"
        />
        <button
          type="submit"
          disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? "Screening…" : "Upload & screen"}
        </button>
      </form>

      {error && <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">{error}</p>}

      {results.length > 0 && (
        <div className="mt-4 space-y-2">
          {results.map((r, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">{r.screening?.candidateName || r.filename}</span>
                {r.ok ? (
                  <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 font-bold">
                    Score {r.screening?.matchScore ?? "—"} · {r.screening?.recommendation ?? "screened"}
                  </span>
                ) : (
                  <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 font-bold">Failed</span>
                )}
              </div>
              {r.ok ? (
                <div className="mt-1 text-gray-600">
                  {r.screening?.summary && <p>{r.screening.summary}</p>}
                  {r.screening?.skills && r.screening.skills.length > 0 && (
                    <p className="mt-1 text-gray-500">Skills: {r.screening.skills.join(", ")}</p>
                  )}
                  <p className="mt-1 text-[10px] text-gray-400">
                    Screened by {r.provider} · candidate saved{r.candidateId ? ` (${r.candidateId.slice(0, 8)}…)` : ""}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-red-600">{r.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

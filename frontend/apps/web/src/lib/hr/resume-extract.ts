/**
 * Resume text extraction. Real parsing only — no fabricated content.
 *
 * - PDF  → pdf-parse (pdfjs-based)
 * - DOCX → mammoth (raw text)
 * - TXT  → plain UTF-8 decode
 * - anything else → a real "unsupported format" error (never a faked success)
 */
import mammoth from "mammoth";

/**
 * pdf.js (used internally by pdf-parse) references browser-only canvas APIs
 * — DOMMatrix, Path2D, ImageData — even on code paths that only extract text
 * and never render anything. Node has none of these globals, which throws
 * "ReferenceError: DOMMatrix is not defined" in a serverless function.
 * Minimal no-op stand-ins are sufficient since we never actually render to
 * canvas here — only extract text. Set before the first pdf-parse usage.
 */
function ensurePdfJsNodePolyfills(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  if (typeof g.DOMMatrix === "undefined") {
    g.DOMMatrix = class DOMMatrix {};
  }
  if (typeof g.Path2D === "undefined") {
    g.Path2D = class Path2D {};
  }
  if (typeof g.ImageData === "undefined") {
    g.ImageData = class ImageData {};
  }
}

export interface ExtractResult {
  ok: boolean;
  text?: string;
  error?: string;
}

function detectKind(filename: string, mimeType: string): "pdf" | "docx" | "txt" | "unsupported" {
  const name = filename.toLowerCase();
  const mime = mimeType.toLowerCase();
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (
    mime.includes("officedocument.wordprocessingml") ||
    mime.includes("msword") ||
    name.endsWith(".docx")
  ) {
    return "docx";
  }
  if (mime.startsWith("text/") || name.endsWith(".txt")) return "txt";
  return "unsupported";
}

export async function extractResumeText(
  filename: string,
  mimeType: string,
  bytes: Buffer,
): Promise<ExtractResult> {
  const kind = detectKind(filename, mimeType);

  try {
    switch (kind) {
      case "pdf": {
        ensurePdfJsNodePolyfills();
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: new Uint8Array(bytes) });
        try {
          const result = await parser.getText();
          const text = (result.text ?? "").trim();
          if (!text) return { ok: false, error: "No extractable text found in PDF (it may be a scanned image)." };
          return { ok: true, text };
        } finally {
          await parser.destroy().catch(() => undefined);
        }
      }
      case "docx": {
        const result = await mammoth.extractRawText({ buffer: bytes });
        const text = (result.value ?? "").trim();
        if (!text) return { ok: false, error: "No extractable text found in DOCX." };
        return { ok: true, text };
      }
      case "txt": {
        const text = bytes.toString("utf8").trim();
        if (!text) return { ok: false, error: "Uploaded text file is empty." };
        return { ok: true, text };
      }
      default:
        return {
          ok: false,
          error: `Unsupported resume format "${mimeType || filename}". Upload a PDF, DOCX, or TXT file.`,
        };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Minimal ambient declaration for `mammoth` (no official types published).
 * We only use extractRawText for resume DOCX text extraction.
 */
declare module "mammoth" {
  interface RawTextResult {
    value: string;
    messages: unknown[];
  }
  interface ExtractInput {
    buffer?: Buffer;
    path?: string;
    arrayBuffer?: ArrayBuffer;
  }
  export function extractRawText(input: ExtractInput): Promise<RawTextResult>;
  const _default: { extractRawText: typeof extractRawText };
  export default _default;
}

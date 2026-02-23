/**
 * PDF text extraction for catalog search indexing. Uses pdf-parse (PDFParse).
 */

import { PDFParse } from 'pdf-parse';

/**
 * Extracts plain text from a PDF buffer for full-text search indexing.
 * On failure returns an empty string so upload is not blocked.
 *
 * @param buffer - PDF file contents
 * @returns Extracted text or empty string
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return result?.text ?? '';
  } catch (err) {
    if (err instanceof Error) {
      console.warn('PDF text extraction failed:', err.message);
    }
    return '';
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }
}

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  confidence: number;
  ocrEngine: string;
}

export interface OcrResult {
  pages: ExtractedPage[];
  totalElectorsOnCover?: number;
  pollingStationName?: string;
  wardName?: string;
}

/**
 * OCR / Text Extraction Provider Abstraction
 *
 * Supported engines:
 * 1. 'poppler': High-speed native poppler `pdftotext` extraction.
 * 2. Pluggable adapter for external OCR microservice or Tesseract when scanned bitmapped PDFs are supplied.
 */
export async function extractTextFromPdf(pdfPath: string): Promise<OcrResult> {
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`File does not exist at path: ${pdfPath}`);
  }

  // Attempt pdftotext extraction
  try {
    const { stdout } = await execFileAsync('/opt/homebrew/bin/pdftotext', [
      '-layout',
      pdfPath,
      '-',
    ], { maxBuffer: 50 * 1024 * 1024 });

    // Delimited by form feed (\x0c)
    const rawPages = stdout.split('\x0c');
    const pages: ExtractedPage[] = [];

    for (let i = 0; i < rawPages.length; i++) {
      const pageText = rawPages[i];
      if (pageText.trim().length === 0 && i === rawPages.length - 1) {
        continue; // skip trailing empty page
      }

      // Check content density to estimate OCR confidence
      const hasContent = pageText.trim().length > 100;
      const confidence = hasContent ? 0.96 : 0.80;

      pages.push({
        pageNumber: i + 1,
        text: pageText,
        confidence,
        ocrEngine: 'poppler-pdftotext',
      });
    }

    return {
      pages,
    };
  } catch (err: any) {
    // Fallback: check if pdftotext is in standard PATH
    try {
      const { stdout } = await execFileAsync('pdftotext', [
        '-layout',
        pdfPath,
        '-',
      ], { maxBuffer: 50 * 1024 * 1024 });

      const rawPages = stdout.split('\x0c');
      const pages: ExtractedPage[] = rawPages
        .filter((p, idx) => p.trim().length > 0 || idx < rawPages.length - 1)
        .map((p, idx) => ({
          pageNumber: idx + 1,
          text: p,
          confidence: p.trim().length > 100 ? 0.96 : 0.80,
          ocrEngine: 'system-pdftotext',
        }));

      return { pages };
    } catch (fallbackErr: any) {
      throw new Error(`PDF text extraction failed: ${err.message || fallbackErr.message}`);
    }
  }
}

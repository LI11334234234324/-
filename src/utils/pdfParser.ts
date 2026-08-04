import * as pdfjsLib from 'pdfjs-dist';
import { ParagraphSegment } from '../types';

// Set worker source dynamically to jsDelivr CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface PdfParseResult {
  pdfUrl: string; // Data URL or Blob URL
  pageCount: number;
  extractedText: string;
  segments: Omit<ParagraphSegment, 'id' | 'startTime'>[];
}

/**
 * Converts a file to Data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Parses an uploaded PDF file, preserving the original PDF file URL
 * and extracting page-associated paragraphs.
 */
export async function parsePdfFile(file: File): Promise<PdfParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfUrl = await fileToDataUrl(file);

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const pageCount = pdf.numPages;
    let fullTextPages: string[] = [];
    let segments: Omit<ParagraphSegment, 'id' | 'startTime'>[] = [];

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      let pageLines: string[] = [];
      let currentLine = '';
      let lastY: number | null = null;

      for (const item of textContent.items) {
        if ('str' in item) {
          const str = item.str;
          const y = item.transform ? item.transform[5] : null;

          if (lastY !== null && y !== null && Math.abs(y - lastY) > 8) {
            if (currentLine.trim()) {
              pageLines.push(currentLine.trim());
            }
            currentLine = str;
          } else {
            currentLine += (currentLine.endsWith(' ') || !currentLine ? '' : ' ') + str;
          }

          if (y !== null) {
            lastY = y;
          }
        }
      }

      if (currentLine.trim()) {
        pageLines.push(currentLine.trim());
      }

      const pageText = pageLines.join('\n').trim();
      if (pageText) {
        fullTextPages.push(pageText);

        // Group into logical paragraph blocks on this page
        const paragraphs = pageText
          .split(/\n\s*\n/)
          .map((p) => p.replace(/\s+/g, ' ').trim())
          .filter(Boolean);

        for (const para of paragraphs) {
          segments.push({
            text: para,
            pdfPage: pageNum,
          });
        }
      }
    }

    return {
      pdfUrl,
      pageCount,
      extractedText: fullTextPages.join('\n\n'),
      segments,
    };
  } catch (error) {
    console.error('Failed to parse PDF document', error);
    throw new Error('解析 PDF 文档失败，请确保文件未加密或格式正常');
  }
}

/**
 * Backward compatibility extractTextFromPdf
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const result = await parsePdfFile(file);
  return result.extractedText;
}

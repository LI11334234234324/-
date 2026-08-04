import * as pdfjsLib from 'pdfjs-dist';

// Set worker source dynamically to jsDelivr CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Extracts raw text from an uploaded PDF file page by page.
 * Formats paragraphs based on line positions.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullTextPages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      let pageLines: string[] = [];
      let currentLine = '';
      let lastY: number | null = null;

      for (const item of textContent.items) {
        if ('str' in item) {
          const str = item.str;
          const y = item.transform ? item.transform[5] : null;

          if (lastY !== null && y !== null && Math.abs(y - lastY) > 8) {
            // New line detected
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

      if (pageLines.length > 0) {
        fullTextPages.push(pageLines.join('\n'));
      }
    }

    return fullTextPages.join('\n\n');
  } catch (error) {
    console.error('Failed to extract text from PDF', error);
    throw new Error('解析 PDF 文本失败，请确保文件未加密或格式正常');
  }
}

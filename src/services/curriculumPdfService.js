import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

const MINIMUM_READABLE_CHARACTERS = 40;

function normalizeText(value) {
  return value
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function withoutRepeatedMargins(pages) {
  const counts = new Map();
  pages.forEach(({ text }) => {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    [lines[0], lines.at(-1)].filter(line => line && line.length < 100).forEach(line => {
      counts.set(line, (counts.get(line) || 0) + 1);
    });
  });

  const repeated = new Set([...counts].filter(([, count]) => count >= Math.max(3, Math.ceil(pages.length * 0.65))).map(([line]) => line));
  if (!repeated.size) return pages;

  return pages.map(page => ({
    ...page,
    text: normalizeText(page.text.split('\n').filter(line => !repeated.has(line.trim())).join('\n')),
  }));
}

function userError(code, userMessage) {
  return { success: false, errorCode: code, userMessage };
}

/**
 * Reads text-based PDFs in the browser while retaining page boundaries.
 * This intentionally does not OCR image-only PDFs or send the source File anywhere.
 */
export async function extractCurriculumPdf(file, { onProgress } = {}) {
  if (!(file instanceof File) || file.type !== 'application/pdf') {
    return userError('INVALID_FILE', 'Please upload a valid PDF.');
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocument({ data: bytes }).promise;
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = normalizeText(content.items.map(item => `${item.str}${item.hasEOL ? '\n' : ' '}`).join(''));
      pages.push({ pageNumber, text });
      onProgress?.({ currentPage: pageNumber, pageCount: pdf.numPages });
    }

    const cleanedPages = withoutRepeatedMargins(pages);
    const fullText = cleanedPages.map(({ pageNumber, text }) => `--- Page ${pageNumber} ---\n${text}`).join('\n\n');
    const readableCharacters = fullText.replace(/--- Page \d+ ---/g, '').trim().length;

    if (readableCharacters < MINIMUM_READABLE_CHARACTERS) {
      return userError('NO_EXTRACTABLE_TEXT', "We couldn't find readable text in this PDF. It may be scanned or image-based.");
    }

    return {
      success: true,
      document: { fileName: file.name, pageCount: pdf.numPages, pages: cleanedPages, fullText },
    };
  } catch (error) {
    console.error('PDF extraction failed', error);
    return userError('PDF_READ_ERROR', 'Something went wrong while reading this PDF. Please try another file.');
  }
}

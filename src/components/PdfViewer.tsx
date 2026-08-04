import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Play,
  Volume2,
  Download,
  Loader2,
  FileText,
} from 'lucide-react';
import { ParagraphSegment, ReaderTheme } from '../types';

// Ensure worker source is configured
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  pdfUrl: string;
  segments: ParagraphSegment[];
  activeSegmentId: string | null;
  onSegmentClick: (segmentId: string, startTime: number) => void;
  currentTime: number;
  theme?: ReaderTheme;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfUrl,
  segments,
  activeSegmentId,
  onSegmentClick,
  currentTime,
  theme = 'light',
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.15);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState<Record<number, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Group segments by pdfPage (defaults to page 1 if not specified)
  const segmentsByPage = useMemo(() => {
    const map = new Map<number, ParagraphSegment[]>();
    segments.forEach((seg) => {
      const p = seg.pdfPage || 1;
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(seg);
    });
    return map;
  }, [segments]);

  // Find page number corresponding to active segment
  const activeSegment = useMemo(() => {
    return segments.find((s) => s.id === activeSegmentId) || null;
  }, [segments, activeSegmentId]);

  const activePageNum = activeSegment?.pdfPage || 1;

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setErrorMsg(null);

    const loadPdf = async () => {
      try {
        let loadingTask;
        if (pdfUrl.startsWith('data:')) {
          // Convert Data URL to Uint8Array for direct worker byte stream parsing
          const base64Str = pdfUrl.split(',')[1] || pdfUrl;
          const binaryStr = atob(base64Str);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          loadingTask = pdfjsLib.getDocument({ data: bytes });
        } else {
          loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
        }

        const doc = await loadingTask.promise;
        if (isCancelled) return;
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('PdfViewer load error:', err);
        setErrorMsg('无法加载 PDF 原文件，请重试或切换至文本重排模式');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl]);

  // Auto-scroll to active page when activeSegment changes
  useEffect(() => {
    if (activePageNum && pageRefs.current.has(activePageNum)) {
      const pageEl = pageRefs.current.get(activePageNum);
      if (pageEl && containerRef.current) {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setCurrentPage(activePageNum);
      }
    }
  }, [activePageNum, activeSegmentId]);

  // Render individual pages on canvas
  const renderPage = async (pageNum: number) => {
    const doc = pdfDocRef.current;
    if (!doc) return;

    const canvas = canvasRefs.current.get(pageNum);
    if (!canvas) return;

    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

      const renderContext = {
        canvasContext: ctx,
        transform: transform,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      setRenderedPages((prev) => ({ ...prev, [pageNum]: true }));
    } catch (err) {
      console.error(`Page ${pageNum} render error:`, err);
    }
  };

  // Trigger render when scale or numPages or loading changes
  useEffect(() => {
    if (!loading && pdfDocRef.current && numPages > 0) {
      for (let p = 1; p <= numPages; p++) {
        renderPage(p);
      }
    }
  }, [loading, scale, numPages]);

  // Zoom handlers
  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 2.5));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.6));
  const handleFitWidth = () => setScale(1.15);

  const handlePrevPage = () => {
    const nextP = Math.max(currentPage - 1, 1);
    setCurrentPage(nextP);
    pageRefs.current.get(nextP)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleNextPage = () => {
    const nextP = Math.min(currentPage + 1, numPages);
    setCurrentPage(nextP);
    pageRefs.current.get(nextP)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Theme styling for the wrapper
  const themeBgClass = useMemo(() => {
    switch (theme) {
      case 'sepia':
        return 'bg-[#f8f3e8] text-slate-900';
      case 'dark':
        return 'bg-slate-950 text-slate-100';
      case 'slate':
        return 'bg-slate-900 text-slate-100';
      default:
        return 'bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100';
    }
  }, [theme]);

  return (
    <div className={`flex flex-col h-full overflow-hidden ${themeBgClass} relative`}>
      {/* Top Floating Control Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm z-20 gap-2 text-xs">
        {/* Page navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
            title="上一页"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300">
            第 {currentPage} / {numPages || 1} 页
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
            title="下一页"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1.5 border-x border-slate-200 dark:border-slate-800 px-3">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-medium text-slate-600 dark:text-slate-300 min-w-[42px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300"
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleFitWidth}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300"
            title="适应宽度"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Action toggles */}
        <div className="flex items-center gap-2">
          {pdfUrl && (
            <a
              href={pdfUrl}
              download="document.pdf"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300"
              title="下载 PDF 原文件"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Main Scrollable Canvas Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center space-y-8 scroll-smooth"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium">正在以高清原貌渲染 PDF 版面...</p>
          </div>
        )}

        {errorMsg && (
          <div className="max-w-md my-12 p-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-center text-red-600 dark:text-red-400 text-sm">
            <p className="font-semibold mb-2">{errorMsg}</p>
          </div>
        )}

        {!loading &&
          !errorMsg &&
          Array.from({ length: numPages }, (_, idx) => idx + 1).map((pageNum) => {
            const isCurrentPage = currentPage === pageNum;

            return (
              <div
                key={pageNum}
                ref={(el) => {
                  if (el) pageRefs.current.set(pageNum, el);
                  else pageRefs.current.delete(pageNum);
                }}
                className={`relative group bg-white dark:bg-slate-900 shadow-xl rounded-sm border ${
                  isCurrentPage
                    ? 'ring-2 ring-blue-500/50 border-blue-300 dark:border-blue-700'
                    : 'border-slate-200 dark:border-slate-800'
                } transition-all duration-300`}
                style={{
                  marginBottom: '2rem',
                }}
              >
                {/* PDF Page Header Badge */}
                <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-slate-900/75 text-white backdrop-blur text-[10px] rounded font-mono shadow">
                  Page {pageNum}
                </div>

                {/* Actual PDF Page Canvas */}
                <canvas
                  ref={(el) => {
                    if (el) canvasRefs.current.set(pageNum, el);
                    else canvasRefs.current.delete(pageNum);
                  }}
                  className="block mx-auto rounded-sm"
                />
              </div>
            );
          })}
      </div>

      {/* Floating Active Subtitle Banner for Audio Sync */}
      {activeSegment && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-xl w-[90%] bg-slate-900/90 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700/60 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
          <div className="p-1.5 rounded-full bg-blue-600 shrink-0">
            <Volume2 className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate leading-snug">{activeSegment.text}</p>
            {activeSegment.translation && (
              <p className="text-[11px] text-blue-200/80 truncate font-light">{activeSegment.translation}</p>
            )}
          </div>
          <button
            onClick={() => onSegmentClick(activeSegment.id, activeSegment.startTime)}
            className="text-[11px] font-semibold text-blue-300 hover:text-blue-100 shrink-0 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            跳至本句
          </button>
        </div>
      )}
    </div>
  );
};

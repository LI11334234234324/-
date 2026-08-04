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
  Eye,
  EyeOff,
  BookOpen,
  FileText,
  Sparkles,
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
  showOverlayCards?: boolean;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfUrl,
  segments,
  activeSegmentId,
  onSegmentClick,
  currentTime,
  theme = 'light',
  showOverlayCards: initialShowOverlay = true,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.15);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState<boolean>(initialShowOverlay);
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
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
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
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition border ${
              showOverlay
                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300'
                : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
            }`}
            title="显示或隐藏朗读跟读覆盖层"
          >
            {showOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showOverlay ? '已开启朗读同步标辉' : '隐藏跟读标辉'}</span>
          </button>

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
            <p className="text-xs text-slate-500 dark:text-slate-400">
              您可以尝试在顶部切换栏中选择“纯文本重排模式”进行无障碍朗读。
            </p>
          </div>
        )}

        {!loading &&
          !errorMsg &&
          Array.from({ length: numPages }, (_, idx) => idx + 1).map((pageNum) => {
            const pageSegments = segmentsByPage.get(pageNum) || [];
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

                {/* Audio Sync Interactive Segment Overlay */}
                {showOverlay && pageSegments.length > 0 && (
                  <div className="p-4 bg-slate-50/90 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800/80 backdrop-blur-sm space-y-2 rounded-b-sm">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 px-1">
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <Sparkles className="w-3 h-3" />
                        第 {pageNum} 页同步朗读段落 ({pageSegments.length})
                      </span>
                      <span>点击任意句子跳转朗读</span>
                    </div>

                    <div className="space-y-1.5">
                      {pageSegments.map((segment) => {
                        const isActive = segment.id === activeSegmentId;

                        return (
                          <div
                            key={segment.id}
                            onClick={() => onSegmentClick(segment.id, segment.startTime)}
                            className={`p-2.5 rounded-lg text-xs md:text-sm cursor-pointer transition-all duration-200 flex items-start gap-2.5 ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 scale-[1.01]'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60'
                            }`}
                          >
                            <button
                              className={`p-1 rounded-full shrink-0 mt-0.5 ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                              }`}
                            >
                              {isActive ? (
                                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              )}
                            </button>

                            <div className="flex-1 space-y-1">
                              <p className="leading-relaxed font-normal">{segment.text}</p>
                              {segment.translation && (
                                <p
                                  className={`text-xs ${
                                    isActive
                                      ? 'text-blue-100'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  {segment.translation}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

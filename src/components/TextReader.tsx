import React, { useRef, useEffect, useState } from 'react';
import {
  Search,
  Volume2,
  Bookmark,
  BookmarkCheck,
  Copy,
  Check,
  MessageSquare,
  Sparkles,
  SlidersHorizontal,
  FileText,
  BookOpen,
  Columns,
  Layout,
} from 'lucide-react';
import { Track, ReaderSettings, ParagraphSegment, ReaderViewMode } from '../types';
import { formatTime } from '../utils/lrcParser';
import { PdfViewer } from './PdfViewer';

interface TextReaderProps {
  track: Track;
  currentTime: number;
  isPlaying: boolean;
  readerSettings: ReaderSettings;
  bookmarks: string[]; // Segment IDs bookmarked
  onSeek: (time: number) => void;
  onToggleBookmark: (segment: ParagraphSegment) => void;
  onAddNote: (segmentId: string, noteText: string) => void;
  onOpenSettings: () => void;
  onOpenSyncEditor: () => void;
}

export const TextReader: React.FC<TextReaderProps> = ({
  track,
  currentTime,
  isPlaying,
  readerSettings,
  bookmarks,
  onSeek,
  onToggleBookmark,
  onAddNote,
  onOpenSettings,
  onOpenSyncEditor,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNoteSegmentId, setActiveNoteSegmentId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [copiedSegmentId, setCopiedSegmentId] = useState<string | null>(null);

  // View mode: defaults to 'pdf' if track has pdfUrl, otherwise 'text'
  const [viewMode, setViewMode] = useState<ReaderViewMode>(() => {
    return track.pdfUrl ? 'pdf' : 'text';
  });

  // Switch default view mode when active track changes
  useEffect(() => {
    if (track.pdfUrl) {
      setViewMode('pdf');
    } else {
      setViewMode('text');
    }
  }, [track.id, track.pdfUrl]);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  // Find active segment index based on currentTime
  const currentSegmentIndex = track.segments.findIndex((seg, i) => {
    const nextSeg = track.segments[i + 1];
    const segEndTime = seg.endTime || (nextSeg ? nextSeg.startTime : Number.MAX_VALUE);
    return currentTime >= seg.startTime && currentTime < segEndTime;
  });

  const activeSegment = track.segments[currentSegmentIndex] || null;
  const activeSegmentId = activeSegment ? activeSegment.id : null;

  // Auto-scroll active segment into center view in text mode
  useEffect(() => {
    if (viewMode !== 'pdf' && readerSettings.autoScroll && activeSegmentRef.current && containerRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentSegmentIndex, readerSettings.autoScroll, viewMode]);

  // Handle Copy Text
  const handleCopy = (text: string, segId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSegmentId(segId);
    setTimeout(() => setCopiedSegmentId(null), 2000);
  };

  // Save note
  const handleSaveNote = (segId: string) => {
    if (noteInput.trim()) {
      onAddNote(segId, noteInput.trim());
      setActiveNoteSegmentId(null);
      setNoteInput('');
    }
  };

  // Typography class helpers
  const getFontSizeClass = () => {
    switch (readerSettings.fontSize) {
      case 'sm': return 'text-sm';
      case 'base': return 'text-base';
      case 'lg': return 'text-lg';
      case 'xl': return 'text-xl';
      case '2xl': return 'text-2xl';
      default: return 'text-lg';
    }
  };

  const getLineHeightClass = () => {
    switch (readerSettings.lineHeight) {
      case 'tight': return 'leading-snug';
      case 'normal': return 'leading-normal';
      case 'relaxed': return 'leading-relaxed';
      case 'loose': return 'leading-loose';
      default: return 'leading-relaxed';
    }
  };

  const getFontFamilyClass = () => {
    switch (readerSettings.fontFamily) {
      case 'serif': return 'font-serif';
      case 'mono': return 'font-mono';
      case 'sans':
      default: return 'font-sans';
    }
  };

  // Theme styling rules
  const getThemeClasses = () => {
    switch (readerSettings.theme) {
      case 'dark':
        return {
          bg: 'bg-slate-950 text-slate-100',
          border: 'border-slate-800',
          searchBg: 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500',
          activeSeg: 'bg-cyan-950/70 border-cyan-500/60 shadow-lg text-cyan-50 ring-1 ring-cyan-500/30',
          activeSpeakerBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          inactiveSeg: 'hover:bg-slate-900/60 border-transparent',
          focusDim: 'opacity-30 blur-[0.2px] hover:opacity-100',
          mutedText: 'text-slate-400',
          translationText: 'text-cyan-300/80',
          tagBg: 'bg-slate-800 text-slate-300',
        };
      case 'sepia':
        return {
          bg: 'bg-[#faf3e0] text-[#3e2723]',
          border: 'border-[#e8dcb8]',
          searchBg: 'bg-[#f3e7c8] border-[#e2d3aa] text-[#3e2723] placeholder-amber-800/50',
          activeSeg: 'bg-[#f4e4bc] border-amber-600/60 shadow-md text-[#2a1a17] ring-1 ring-amber-600/30',
          activeSpeakerBg: 'bg-amber-800/15 text-amber-900 border-amber-800/30',
          inactiveSeg: 'hover:bg-[#f3e8cb]/50 border-transparent',
          focusDim: 'opacity-35 blur-[0.2px] hover:opacity-100',
          mutedText: 'text-amber-900/70',
          translationText: 'text-amber-900/80',
          tagBg: 'bg-[#ede0be] text-amber-950',
        };
      case 'slate':
        return {
          bg: 'bg-slate-900 text-slate-100',
          border: 'border-slate-800',
          searchBg: 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400',
          activeSeg: 'bg-indigo-950/70 border-indigo-500/60 shadow-lg text-indigo-50 ring-1 ring-indigo-500/30',
          activeSpeakerBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          inactiveSeg: 'hover:bg-slate-800/50 border-transparent',
          focusDim: 'opacity-30 blur-[0.2px] hover:opacity-100',
          mutedText: 'text-slate-400',
          translationText: 'text-indigo-300/80',
          tagBg: 'bg-slate-800 text-slate-300',
        };
      case 'light':
      default:
        return {
          bg: 'bg-slate-50 text-slate-900',
          border: 'border-slate-200',
          searchBg: 'bg-white border-slate-200 text-slate-800 placeholder-slate-400',
          activeSeg: 'bg-blue-50/90 border-blue-500 shadow-md text-blue-950 ring-1 ring-blue-500/30',
          activeSpeakerBg: 'bg-blue-100 text-blue-800 border-blue-200',
          inactiveSeg: 'hover:bg-white/80 border-transparent',
          focusDim: 'opacity-40 blur-[0.2px] hover:opacity-100',
          mutedText: 'text-slate-500',
          translationText: 'text-blue-700',
          tagBg: 'bg-slate-200/60 text-slate-700',
        };
    }
  };

  const themeClass = getThemeClasses();

  // Filter segments if search query is entered
  const filteredSegments = track.segments.filter((seg) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      seg.text.toLowerCase().includes(q) ||
      (seg.translation && seg.translation.toLowerCase().includes(q)) ||
      (seg.speaker && seg.speaker.toLowerCase().includes(q))
    );
  });

  // Render Pure Text List component helper
  const renderTextSegmentList = () => (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scroll-smooth"
    >
      {filteredSegments.length === 0 ? (
        <div className="text-center py-16 opacity-60 space-y-2">
          <p className="text-sm font-medium">未找到包含 “{searchQuery}” 的文本</p>
          <p className="text-xs opacity-75">尝试更换搜索词或清除搜索框</p>
        </div>
      ) : (
        filteredSegments.map((seg) => {
          const isSegActive = track.segments.findIndex((s) => s.id === seg.id) === currentSegmentIndex;
          const isBookmarked = bookmarks.includes(seg.id);
          const userNote = track.notes?.[seg.id];

          // Determine if focus mode dimming applies
          const isDimmed = readerSettings.highlightMode === 'focus' && !isSegActive;

          return (
            <div
              key={seg.id}
              ref={isSegActive ? activeSegmentRef : null}
              onClick={() => onSeek(seg.startTime)}
              className={`group relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                isSegActive
                  ? `${themeClass.activeSeg}`
                  : `${themeClass.inactiveSeg} ${isDimmed ? themeClass.focusDim : ''}`
              }`}
            >
              {/* Paragraph Top Meta (Speaker & Timestamp) */}
              <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                <div className="flex items-center gap-2">
                  {seg.speaker && (
                    <span
                      className={`px-2 py-0.5 rounded-md font-medium text-[11px] border ${
                        isSegActive ? themeClass.activeSpeakerBg : themeClass.tagBg
                      }`}
                    >
                      {seg.speaker}
                    </span>
                  )}
                  {readerSettings.showTimestamps && (
                    <span className={`font-mono text-[11px] ${themeClass.mutedText} flex items-center gap-1`}>
                      {isSegActive && <Volume2 className="w-3 h-3 animate-bounce text-blue-500" />}
                      {formatTime(seg.startTime)}
                      {seg.pdfPage && (
                        <span className="opacity-75 bg-slate-200/50 dark:bg-slate-700/50 px-1.5 rounded text-[10px]">
                          P.{seg.pdfPage}
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {/* Actions on hover or active */}
                <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark(seg);
                    }}
                    title={isBookmarked ? '取消书签' : '添加书签'}
                    className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="w-4 h-4 text-amber-500 fill-amber-500" />
                    ) : (
                      <Bookmark className="w-4 h-4 opacity-60" />
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(seg.text, seg.id);
                    }}
                    title="复制本段文本"
                    className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  >
                    {copiedSegmentId === seg.id ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4 opacity-60" />
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveNoteSegmentId(activeNoteSegmentId === seg.id ? null : seg.id);
                      setNoteInput(userNote || '');
                    }}
                    title="添加段落笔记"
                    className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  >
                    <MessageSquare className={`w-4 h-4 ${userNote ? 'text-blue-500 fill-blue-500/20' : 'opacity-60'}`} />
                  </button>
                </div>
              </div>

              {/* Primary Text Content */}
              <p
                className={`font-normal transition-all ${getFontSizeClass()} ${getLineHeightClass()} ${getFontFamilyClass()}`}
              >
                {seg.text}
              </p>

              {/* Translation Line */}
              {readerSettings.showTranslation && seg.translation && (
                <p className={`mt-2 text-sm italic font-sans ${themeClass.translationText}`}>
                  {seg.translation}
                </p>
              )}

              {/* User Saved Note Display */}
              {userNote && (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <span className="font-bold shrink-0">笔记：</span>
                  <span className="flex-1 whitespace-pre-wrap">{userNote}</span>
                </div>
              )}

              {/* Add Note Inline Input Box */}
              {activeNoteSegmentId === seg.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3 p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-lg space-y-2 text-xs"
                >
                  <div className="font-semibold text-slate-700 dark:text-slate-300">添加本段阅读笔记：</div>
                  <textarea
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="写下心得感悟、重点理解或生词解析..."
                    className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setActiveNoteSegmentId(null)}
                      className="px-2.5 py-1 rounded-md border text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleSaveNote(seg.id)}
                      className="px-3 py-1 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
                    >
                      保存笔记
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className={`flex flex-col h-full rounded-2xl border ${themeClass.bg} ${themeClass.border} shadow-sm overflow-hidden transition-colors duration-300`}>
      {/* Reader Control Header */}
      <div className={`flex items-center justify-between p-3 border-b ${themeClass.border} flex-wrap gap-2 bg-black/5 dark:bg-white/5`}>
        {/* View Mode Selector Tabs (PDF Layout vs Pure Text vs Side-by-Side) */}
        <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
          {track.pdfUrl && (
            <button
              onClick={() => setViewMode('pdf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'pdf'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
              title="展现 PDF 包含排版、图像、字体的原汁原味视觉效果"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>📄 PDF 原貌排版</span>
            </button>
          )}

          <button
            onClick={() => setViewMode('text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'text'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="提取为可调字体、字号的无障碍纯文本流"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>📝 纯文本重排</span>
          </button>

          {track.pdfUrl && (
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'side-by-side'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
              title="左侧 PDF 原貌，右侧可调重排文本"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>📖 双栏对照</span>
            </button>
          )}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Bar */}
          <div className="relative min-w-[160px] max-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索关键词..."
              className={`w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${themeClass.searchBg}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100 px-1"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenSyncEditor}
              className={`px-2 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1 ${themeClass.tagBg}`}
              title="对齐微调音频与文字的时间戳"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span className="hidden sm:inline">时间微调</span>
            </button>

            <button
              onClick={onOpenSettings}
              className={`px-2 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1 ${themeClass.tagBg}`}
              title="调整字体大小、排版与主题"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>阅读设置</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Display Area according to viewMode */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'pdf' && track.pdfUrl ? (
          <PdfViewer
            pdfUrl={track.pdfUrl}
            segments={track.segments}
            activeSegmentId={activeSegmentId}
            onSegmentClick={(id, time) => onSeek(time)}
            currentTime={currentTime}
            theme={readerSettings.theme}
          />
        ) : viewMode === 'side-by-side' && track.pdfUrl ? (
          <div className="grid grid-cols-1 md:grid-cols-2 h-full divide-x divide-slate-200 dark:divide-slate-800">
            <div className="h-full overflow-hidden">
              <PdfViewer
                pdfUrl={track.pdfUrl}
                segments={track.segments}
                activeSegmentId={activeSegmentId}
                onSegmentClick={(id, time) => onSeek(time)}
                currentTime={currentTime}
                theme={readerSettings.theme}
                showOverlayCards={false}
              />
            </div>
            <div className="h-full flex flex-col overflow-hidden bg-white/50 dark:bg-slate-900/50">
              <div className="p-2 border-b text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                <span>可调字号重排流（双栏同步对照）</span>
              </div>
              {renderTextSegmentList()}
            </div>
          </div>
        ) : (
          renderTextSegmentList()
        )}
      </div>
    </div>
  );
};

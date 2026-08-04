import React, { useState, useEffect, useRef } from 'react';
import {
  Headphones,
  FolderOpen,
  Plus,
  Bookmark,
  SlidersHorizontal,
  Moon,
  Sun,
  Share2,
  Sparkles,
  Download,
  BookOpen,
  Volume2,
  Trash2,
  CheckCircle2,
  HelpCircle,
  X,
  FileText,
} from 'lucide-react';
import { Track, ReaderSettings, ParagraphSegment, Bookmark as BookmarkType } from './types';
import { SAMPLE_TRACKS } from './data/sampleTracks';
import { AudioPlayer } from './components/AudioPlayer';
import { TextReader } from './components/TextReader';
import { TrackLibrary } from './components/TrackLibrary';
import { AddTrackModal } from './components/AddTrackModal';
import { SyncEditor } from './components/SyncEditor';
import { ReaderSettingsModal } from './components/ReaderSettingsModal';

const STORAGE_KEY_TRACKS = 'audio_reader_tracks_v1';
const STORAGE_KEY_SETTINGS = 'audio_reader_settings_v1';
const STORAGE_KEY_BOOKMARKS = 'audio_reader_bookmarks_v1';

export default function App() {
  // Load custom tracks from localStorage or default
  const [tracks, setTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRACKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved tracks', e);
    }
    return SAMPLE_TRACKS;
  });

  const [activeTrackId, setActiveTrackId] = useState<string>(tracks[0]?.id || SAMPLE_TRACKS[0].id);

  // Reader Settings State
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      fontSize: 'lg',
      lineHeight: 'relaxed',
      theme: 'light',
      fontFamily: 'sans',
      autoScroll: true,
      highlightMode: 'paragraph',
      showTimestamps: true,
      showTranslation: true,
      layout: 'split',
    };
  });

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // Playback state
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLoopParagraph, setIsLoopParagraph] = useState<boolean>(false);

  // Modals state
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSyncEditorOpen, setIsSyncEditorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);

  // Audio HTML element reference
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeTrack = tracks.find((t) => t.id === activeTrackId) || tracks[0] || SAMPLE_TRACKS[0];

  // Save tracks to localStorage on change
  useEffect(() => {
    try {
      // Don't store blob URLs in localStorage as they expire
      const cleanTracks = tracks.map((t) =>
        t.isBlobUrl ? { ...t, audioUrl: '' } : t
      );
      localStorage.setItem(STORAGE_KEY_TRACKS, JSON.stringify(cleanTracks));
    } catch (e) {}
  }, [tracks]);

  // Save settings to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {}
  }, [settings]);

  // Save bookmarks
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(bookmarks));
    } catch (e) {}
  }, [bookmarks]);

  // Sync audio src when active track changes
  useEffect(() => {
    if (audioRef.current && activeTrack) {
      if (activeTrack.isTTS) {
        // Handled via Web Speech API
        audioRef.current.pause();
        setCurrentTime(0);
        setDuration(activeTrack.duration || 120);
      } else if (activeTrack.audioUrl) {
        audioRef.current.src = activeTrack.audioUrl;
        audioRef.current.load();
        setCurrentTime(0);
        if (isPlaying) {
          audioRef.current.play().catch(() => setIsPlaying(false));
        }
      }
    }
  }, [activeTrackId]);

  // Handle TTS speech synthesis if track isTTS
  const ttsUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (activeTrack?.isTTS && isPlaying) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const fullText = activeTrack.segments.map((s) => s.text).join(' ');
        const utterance = new SpeechSynthesisUtterance(fullText);
        utterance.rate = playbackRate;
        utterance.volume = isMuted ? 0 : volume;

        utterance.onend = () => {
          setIsPlaying(false);
        };

        ttsUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }
    } else if (activeTrack?.isTTS && !isPlaying) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
    }
  }, [isPlaying, activeTrackId, playbackRate]);

  // Paragraph loop logic check
  const currentSegmentIndex = activeTrack.segments.findIndex((seg, i) => {
    const nextSeg = activeTrack.segments[i + 1];
    const segEndTime = seg.endTime || (nextSeg ? nextSeg.startTime : Number.MAX_VALUE);
    return currentTime >= seg.startTime && currentTime < segEndTime;
  });

  useEffect(() => {
    if (isLoopParagraph && isPlaying && currentSegmentIndex !== -1) {
      const seg = activeTrack.segments[currentSegmentIndex];
      const nextSeg = activeTrack.segments[currentSegmentIndex + 1];
      const segEndTime = seg.endTime || (nextSeg ? nextSeg.startTime : seg.startTime + 5);

      if (currentTime >= segEndTime - 0.2) {
        // Seek back to start of segment
        handleSeek(seg.startTime);
      }
    }
  }, [currentTime, isLoopParagraph, isPlaying, currentSegmentIndex]);

  // Handle Play/Pause
  const handlePlayPause = () => {
    if (activeTrack.isTTS) {
      if (isPlaying) {
        window.speechSynthesis.pause();
        setIsPlaying(false);
      } else {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else {
          const fullText = activeTrack.segments.map((s) => s.text).join(' ');
          const utterance = new SpeechSynthesisUtterance(fullText);
          utterance.rate = playbackRate;
          utterance.volume = isMuted ? 0 : volume;
          utterance.onend = () => setIsPlaying(false);
          window.speechSynthesis.speak(utterance);
        }
        setIsPlaying(true);
      }
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.error('Audio play error', err);
            setIsPlaying(false);
          });
      }
    }
  };

  // Handle Seek
  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (audioRef.current && !activeTrack.isTTS) {
      audioRef.current.currentTime = time;
    }
  };

  // Handle Volume Change
  const handleVolumeChange = (v: number) => {
    setVolume(v);
    setIsMuted(v === 0);
    if (audioRef.current) {
      audioRef.current.volume = v;
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (audioRef.current) audioRef.current.volume = volume || 0.8;
    } else {
      setIsMuted(true);
      if (audioRef.current) audioRef.current.volume = 0;
    }
  };

  // Handle Playback Rate
  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // Jump to previous / next segment
  const handlePrevSegment = () => {
    if (currentSegmentIndex > 0) {
      const prevSeg = activeTrack.segments[currentSegmentIndex - 1];
      handleSeek(prevSeg.startTime);
    } else {
      handleSeek(0);
    }
  };

  const handleNextSegment = () => {
    if (currentSegmentIndex < activeTrack.segments.length - 1) {
      const nextSeg = activeTrack.segments[currentSegmentIndex + 1];
      handleSeek(nextSeg.startTime);
    }
  };

  // Toggle Bookmark for a segment
  const handleToggleBookmark = (segment: ParagraphSegment) => {
    const existingIndex = bookmarks.findIndex(
      (b) => b.trackId === activeTrack.id && b.segmentId === segment.id
    );

    if (existingIndex !== -1) {
      setBookmarks((prev) => prev.filter((_, i) => i !== existingIndex));
    } else {
      const newBm: BookmarkType = {
        id: `bm-${Date.now()}`,
        trackId: activeTrack.id,
        segmentId: segment.id,
        timestamp: segment.startTime,
        textSnippet: segment.text,
        createdAt: Date.now(),
      };
      setBookmarks((prev) => [newBm, ...prev]);
    }
  };

  // Add Note
  const handleAddNote = (segmentId: string, noteText: string) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === activeTrack.id) {
          const updatedNotes = { ...(t.notes || {}), [segmentId]: noteText };
          return { ...t, notes: updatedNotes };
        }
        return t;
      })
    );
  };

  // Add Custom Track
  const handleAddTrack = (newTrack: Track) => {
    setTracks((prev) => [newTrack, ...prev]);
    setActiveTrackId(newTrack.id);
  };

  // Delete Custom Track
  const handleDeleteTrack = (trackId: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    if (activeTrackId === trackId) {
      setActiveTrackId(tracks.find((t) => t.id !== trackId)?.id || SAMPLE_TRACKS[0].id);
    }
  };

  // Save micro-adjusted segments from SyncEditor
  const handleSaveTrackSegments = (trackId: string, newSegments: ParagraphSegment[]) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, segments: newSegments } : t))
    );
  };

  // Export track to JSON package
  const handleExportTrack = (trackToExport: Track) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(trackToExport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${trackToExport.title}-文稿数据.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON package
  const handleImportJson = (jsonString: string) => {
    const parsed = JSON.parse(jsonString);
    if (parsed && parsed.title && Array.isArray(parsed.segments)) {
      const importedTrack: Track = {
        ...parsed,
        id: `imported-${Date.now()}`,
        createdAt: Date.now(),
      };
      setTracks((prev) => [importedTrack, ...prev]);
      setActiveTrackId(importedTrack.id);
    }
  };

  // Keyboard Shortcuts (Space play/pause, Left/Right seek)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(Math.max(0, currentTime - 5));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeek(Math.min(duration, currentTime + 5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, duration]);

  // Audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      // Auto play next segment or next track if available
      handleNextSegment();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [activeTrackId]);

  // Active track bookmarked IDs array
  const activeBookmarkedSegmentIds = bookmarks
    .filter((b) => b.trackId === activeTrack.id)
    .map((b) => b.segmentId);

  // Background Theme Container style
  const getContainerBg = () => {
    switch (settings.theme) {
      case 'dark':
        return 'bg-slate-950 text-slate-100';
      case 'sepia':
        return 'bg-[#f5ebd7] text-[#2b1810]';
      case 'slate':
        return 'bg-slate-900 text-slate-100';
      case 'light':
      default:
        return 'bg-slate-100 text-slate-900';
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${getContainerBg()}`}>
      {/* Invisible HTML5 Audio Player Element */}
      <audio ref={audioRef} preload="auto" />

      {/* Navigation Top Header Bar */}
      <header className="sticky top-0 z-30 border-b backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight flex items-center gap-2">
                声文随行
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  音频文本同步阅读
                </span>
              </h1>
              <p className="text-[11px] opacity-60 hidden sm:block">点按听语音 · 实时同步看文稿 · 点击任意段落即刻点播</p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLibraryOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <FolderOpen className="w-4 h-4 text-blue-600" />
              <span>作品库 ({tracks.length})</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">导入音频与文本</span>
            </button>

            <button
              onClick={() => setIsBookmarksOpen(!isBookmarksOpen)}
              className={`p-2 rounded-xl border text-xs transition-colors relative ${
                bookmarks.length > 0
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="查看书签"
            >
              <Bookmark className="w-4 h-4" />
              {bookmarks.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {bookmarks.length}
                </span>
              )}
            </button>

            <button
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  theme: prev.theme === 'dark' ? 'light' : 'dark',
                }))
              }
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors"
              title="一键切换深色/浅色主题"
            >
              {settings.theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 flex flex-col gap-4">
        {/* Layout Switcher: Split view vs Single stacked view */}
        {settings.layout === 'split' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[calc(100vh-140px)]">
            {/* Left Column: Audio Player & Track Information Panel */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <AudioPlayer
                track={activeTrack}
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                playbackRate={playbackRate}
                volume={volume}
                isMuted={isMuted}
                isLoopParagraph={isLoopParagraph}
                currentSegmentIndex={currentSegmentIndex}
                theme={settings.theme}
                onPlayPause={handlePlayPause}
                onSeek={handleSeek}
                onVolumeChange={handleVolumeChange}
                onToggleMute={handleToggleMute}
                onPlaybackRateChange={handlePlaybackRateChange}
                onToggleLoopParagraph={() => setIsLoopParagraph(!isLoopParagraph)}
                onPrevSegment={handlePrevSegment}
                onNextSegment={handleNextSegment}
              />

              {/* Track Description & Quick Meta Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white/70 dark:bg-slate-900/70 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    作品简介与文稿梗概
                  </span>
                  <button
                    onClick={() => handleExportTrack(activeTrack)}
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> 导出本套文稿包
                  </button>
                </div>
                <p className="text-xs opacity-80 leading-relaxed">
                  {activeTrack.description || '暂无详细介绍信息。点击右侧文稿任意语句即可跳转播放。'}
                </p>

                {/* Quick Shortcuts Hint */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60 text-[11px] opacity-70 flex flex-wrap gap-x-4 gap-y-1">
                  <span>快捷键：<b>空格</b> 播放/暂停</span>
                  <span><b>← / →</b> 快退/快进 5 秒</span>
                </div>
              </div>
            </div>

            {/* Right Column: Synchronized Text Reader View */}
            <div className="lg:col-span-7 flex flex-col h-[600px] lg:h-auto min-h-0">
              <TextReader
                track={activeTrack}
                currentTime={currentTime}
                isPlaying={isPlaying}
                readerSettings={settings}
                bookmarks={activeBookmarkedSegmentIds}
                onSeek={handleSeek}
                onToggleBookmark={handleToggleBookmark}
                onAddNote={handleAddNote}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenSyncEditor={() => setIsSyncEditorOpen(true)}
              />
            </div>
          </div>
        ) : (
          /* Stacked Layout Mode */
          <div className="max-w-3xl mx-auto w-full flex flex-col gap-5 py-2">
            <AudioPlayer
              track={activeTrack}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              playbackRate={playbackRate}
              volume={volume}
              isMuted={isMuted}
              isLoopParagraph={isLoopParagraph}
              currentSegmentIndex={currentSegmentIndex}
              theme={settings.theme}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onVolumeChange={handleVolumeChange}
              onToggleMute={handleToggleMute}
              onPlaybackRateChange={handlePlaybackRateChange}
              onToggleLoopParagraph={() => setIsLoopParagraph(!isLoopParagraph)}
              onPrevSegment={handlePrevSegment}
              onNextSegment={handleNextSegment}
            />

            <div className="h-[650px]">
              <TextReader
                track={activeTrack}
                currentTime={currentTime}
                isPlaying={isPlaying}
                readerSettings={settings}
                bookmarks={activeBookmarkedSegmentIds}
                onSeek={handleSeek}
                onToggleBookmark={handleToggleBookmark}
                onAddNote={handleAddNote}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenSyncEditor={() => setIsSyncEditorOpen(true)}
              />
            </div>
          </div>
        )}
      </main>

      {/* Bookmarks Drawer Overlay */}
      {isBookmarksOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl p-5 flex flex-col animate-in slide-in-from-right">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>收藏的书签与金句 ({bookmarks.length})</span>
            </div>
            <button
              onClick={() => setIsBookmarksOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5 opacity-60" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {bookmarks.length === 0 ? (
              <div className="text-center py-16 opacity-60 text-xs">
                尚无书签。阅读时点击段落右上角的书签图标即可收藏金句！
              </div>
            ) : (
              bookmarks.map((bm) => {
                const trk = tracks.find((t) => t.id === bm.trackId);

                return (
                  <div
                    key={bm.id}
                    onClick={() => {
                      if (trk) setActiveTrackId(trk.id);
                      handleSeek(bm.timestamp);
                      setIsBookmarksOpen(false);
                    }}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all cursor-pointer space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] opacity-70">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        《{trk?.title || '未知作品'}》
                      </span>
                      <span>{new Date(bm.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="line-clamp-3 font-normal leading-relaxed">{bm.textSnippet}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <TrackLibrary
        isOpen={isLibraryOpen}
        tracks={tracks}
        activeTrackId={activeTrackId}
        onClose={() => setIsLibraryOpen(false)}
        onSelectTrack={(trk) => setActiveTrackId(trk.id)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onDeleteTrack={handleDeleteTrack}
        onExportTrack={handleExportTrack}
      />

      <AddTrackModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTrack={handleAddTrack}
        onImportJson={handleImportJson}
      />

      <SyncEditor
        isOpen={isSyncEditorOpen}
        track={activeTrack}
        currentTime={currentTime}
        isPlaying={isPlaying}
        onClose={() => setIsSyncEditorOpen(false)}
        onSeek={handleSeek}
        onPlayPause={handlePlayPause}
        onSaveTrackSegments={handleSaveTrackSegments}
      />

      <ReaderSettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateSettings={(newSettings) =>
          setSettings((prev) => ({ ...prev, ...newSettings }))
        }
      />
    </div>
  );
}

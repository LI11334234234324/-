import React, { useState } from 'react';
import {
  X,
  Play,
  Pause,
  Clock,
  Sparkles,
  Save,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { Track, ParagraphSegment } from '../types';
import { formatPreciseTime, formatTime } from '../utils/lrcParser';

interface SyncEditorProps {
  isOpen: boolean;
  track: Track;
  currentTime: number;
  isPlaying: boolean;
  onClose: () => void;
  onSeek: (time: number) => void;
  onPlayPause: () => void;
  onSaveTrackSegments: (trackId: string, newSegments: ParagraphSegment[]) => void;
}

export const SyncEditor: React.FC<SyncEditorProps> = ({
  isOpen,
  track,
  currentTime,
  isPlaying,
  onClose,
  onSeek,
  onPlayPause,
  onSaveTrackSegments,
}) => {
  const [segments, setSegments] = useState<ParagraphSegment[]>(() =>
    JSON.parse(JSON.stringify(track.segments))
  );
  const [selectedSegId, setSelectedSegId] = useState<string>(
    segments[0]?.id || ''
  );

  if (!isOpen) return null;

  // Set current playing audio time to selected segment's startTime
  const handleMarkCurrentTime = (segId: string) => {
    const roundedTime = Math.round(currentTime * 100) / 100;
    setSegments((prev) =>
      prev.map((seg) => (seg.id === segId ? { ...seg, startTime: roundedTime } : seg))
    );
  };

  // Adjust segment time by delta (e.g. +0.5s or -0.5s)
  const handleAdjustTime = (segId: string, delta: number) => {
    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.id === segId) {
          const newTime = Math.max(0, Math.round((seg.startTime + delta) * 100) / 100);
          return { ...seg, startTime: newTime };
        }
        return seg;
      })
    );
  };

  // Update text
  const handleTextChange = (segId: string, newText: string) => {
    setSegments((prev) =>
      prev.map((seg) => (seg.id === segId ? { ...seg, text: newText } : seg))
    );
  };

  // Auto distribute timestamps evenly across audio duration
  const handleAutoDistribute = () => {
    if (segments.length === 0 || !track.duration) return;
    const interval = track.duration / segments.length;
    setSegments((prev) =>
      prev.map((seg, i) => ({
        ...seg,
        startTime: Math.round(i * interval * 100) / 100,
        endTime: Math.round((i + 1) * interval * 100) / 100,
      }))
    );
  };

  // Save changes
  const handleSave = () => {
    // Sort segments by startTime
    const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);
    // Recalculate endTimes
    for (let i = 0; i < sorted.length; i++) {
      if (i < sorted.length - 1) {
        sorted[i].endTime = sorted[i + 1].startTime;
      } else {
        sorted[i].endTime = track.duration || sorted[i].startTime + 5;
      }
    }
    onSaveTrackSegments(track.id, sorted);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Editor Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-base font-bold">时间戳对齐微调编辑器</h3>
              <p className="text-xs opacity-70">
                作品：《{track.title}》 · 当前音频进度: {formatPreciseTime(currentTime)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 opacity-60" />
          </button>
        </div>

        {/* Quick Audio Playback Control Strip */}
        <div className="flex items-center justify-between p-3 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40 text-xs px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onPlayPause}
              className="p-2 rounded-full bg-blue-600 text-white shadow hover:bg-blue-700 transition-transform active:scale-95"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <span className="font-mono font-bold text-blue-900 dark:text-blue-200">
              {formatPreciseTime(currentTime)} / {formatTime(track.duration || 0)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoDistribute}
              className="px-2.5 py-1 rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-medium"
              title="根据总时长将全篇段落平分均匀打标"
            >
              均分分配时间戳
            </button>
          </div>
        </div>

        {/* Segment Table List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {segments.map((seg, idx) => {
            const isSelected = selectedSegId === seg.id;

            return (
              <div
                key={seg.id}
                onClick={() => setSelectedSegId(seg.id)}
                className={`p-3 rounded-xl border text-xs transition-all space-y-2 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 font-mono font-bold">
                    <span className="text-slate-400">#{idx + 1}</span>
                    <span className="text-blue-600 dark:text-blue-400">
                      {formatPreciseTime(seg.startTime)}
                    </span>
                  </div>

                  {/* Micro Adjustment Action Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkCurrentTime(seg.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold hover:bg-amber-600 shadow-sm flex items-center gap-1"
                      title="将播放进度设为本段起点"
                    >
                      <Clock className="w-3 h-3" />
                      标记当前时间
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeek(seg.startTime);
                      }}
                      className="px-2 py-1 rounded-lg border hover:bg-black/5 dark:hover:bg-white/10"
                      title="跳转音频至本段"
                    >
                      试听本段
                    </button>

                    <div className="flex items-center gap-1 font-mono bg-black/5 dark:bg-white/5 rounded-lg p-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdjustTime(seg.id, -1);
                        }}
                        className="px-1.5 py-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                      >
                        -1s
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdjustTime(seg.id, -0.2);
                        }}
                        className="px-1.5 py-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                      >
                        -0.2s
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdjustTime(seg.id, 0.2);
                        }}
                        className="px-1.5 py-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                      >
                        +0.2s
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdjustTime(seg.id, 1);
                        }}
                        className="px-1.5 py-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                      >
                        +1s
                      </button>
                    </div>
                  </div>
                </div>

                <textarea
                  value={seg.text}
                  onChange={(e) => handleTextChange(seg.id, e.target.value)}
                  rows={2}
                  className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                />
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-950">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            保存对齐标记
          </button>
        </div>
      </div>
    </div>
  );
};

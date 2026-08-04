import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Repeat1,
  Gauge,
  Sparkles,
  Music2,
} from 'lucide-react';
import { Track, ReaderTheme } from '../types';
import { formatTime } from '../utils/lrcParser';
import { WaveformVisualizer } from './WaveformVisualizer';

interface AudioPlayerProps {
  track: Track;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  isLoopParagraph: boolean;
  currentSegmentIndex: number;
  theme: ReaderTheme;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onToggleLoopParagraph: () => void;
  onPrevSegment: () => void;
  onNextSegment: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  track,
  currentTime,
  duration,
  isPlaying,
  playbackRate,
  volume,
  isMuted,
  isLoopParagraph,
  currentSegmentIndex,
  theme,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onPlaybackRateChange,
  onToggleLoopParagraph,
  onPrevSegment,
  onNextSegment,
}) => {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  // Close speed menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setShowSpeedMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  // Dynamic theme colors
  const getThemeStyles = () => {
    switch (theme) {
      case 'dark':
        return {
          bg: 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-2xl backdrop-blur-md',
          accent: 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30',
          progressBg: 'bg-slate-800',
          progressFill: 'bg-gradient-to-r from-cyan-500 to-blue-500',
          buttonActive: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        };
      case 'sepia':
        return {
          bg: 'bg-amber-100/90 border-amber-200/80 text-amber-950 shadow-xl backdrop-blur-md',
          accent: 'text-amber-800 bg-amber-200/60 hover:bg-amber-300/60 border-amber-300',
          progressBg: 'bg-amber-200/70',
          progressFill: 'bg-gradient-to-r from-amber-600 to-amber-800',
          buttonActive: 'bg-amber-300 text-amber-900 border-amber-400',
        };
      case 'slate':
        return {
          bg: 'bg-slate-800/95 border-slate-700 text-slate-100 shadow-2xl backdrop-blur-md',
          accent: 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30',
          progressBg: 'bg-slate-700',
          progressFill: 'bg-gradient-to-r from-indigo-500 to-purple-500',
          buttonActive: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        };
      case 'light':
      default:
        return {
          bg: 'bg-white/95 border-slate-200 text-slate-900 shadow-xl backdrop-blur-md',
          accent: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200',
          progressBg: 'bg-slate-100',
          progressFill: 'bg-gradient-to-r from-blue-600 to-indigo-600',
          buttonActive: 'bg-blue-100 text-blue-700 border-blue-300',
        };
    }
  };

  const style = getThemeStyles();

  return (
    <div className={`rounded-2xl border p-4 transition-all duration-300 ${style.bg}`}>
      {/* Top track details & waveform visualizer */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3.5 min-w-0">
          {track.coverImage ? (
            <img
              src={track.coverImage}
              alt={track.title}
              className="w-14 h-14 rounded-xl object-cover shadow-md flex-shrink-0 border border-black/10"
            />
          ) : (
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 border ${style.accent}`}>
              <Music2 className="w-7 h-7" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium border bg-black/5 dark:bg-white/10 opacity-80">
                {track.category}
              </span>
              {track.isTTS && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 border border-emerald-500/30">
                  <Sparkles className="w-3 h-3" /> 语音合成
                </span>
              )}
            </div>
            <h2 className="text-base font-bold truncate mt-0.5" title={track.title}>
              {track.title}
            </h2>
            <p className="text-xs opacity-70 truncate mt-0.5">
              {track.author ? `作者：${track.author}` : '未知来源'}
            </p>
          </div>
        </div>

        {/* Audio Visualizer */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <WaveformVisualizer isPlaying={isPlaying} theme={theme} barCount={16} />
        </div>
      </div>

      {/* Progress Bar with timestamp tooltip */}
      <div className="space-y-1.5 mb-3">
        <div className="relative group flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-transparent z-10 focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-125"
          />
          {/* Custom Track Background */}
          <div className={`absolute left-0 right-0 h-2 rounded-lg overflow-hidden ${style.progressBg}`}>
            <div
              className={`h-full transition-all duration-75 ${style.progressFill}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-mono opacity-70">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Playback Control Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        {/* Left tools: Prev / Next segment */}
        <div className="flex items-center gap-1">
          <button
            onClick={onPrevSegment}
            title="上一段句/落"
            className="p-2 rounded-xl border border-transparent hover:border-current/20 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onSeek(Math.max(0, currentTime - 10))}
            title="快退 10 秒"
            className="p-2 rounded-xl border border-transparent hover:border-current/20 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSeek(Math.min(duration, currentTime + 10))}
            title="快进 10 秒"
            className="p-2 rounded-xl border border-transparent hover:border-current/20 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={onNextSegment}
            title="下一段句/落"
            className="p-2 rounded-xl border border-transparent hover:border-current/20 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Center Primary Play/Pause Button */}
        <div className="flex items-center justify-center">
          <button
            onClick={onPlayPause}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 border ${style.accent}`}
            title={isPlaying ? '暂停 (空格键)' : '播放 (空格键)'}
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
          </button>
        </div>

        {/* Right Tools: Speed, Loop, Volume */}
        <div className="flex items-center gap-1.5">
          {/* Paragraph Loop Toggle */}
          <button
            onClick={onToggleLoopParagraph}
            title={isLoopParagraph ? '已开启单段复读模式' : '开启单段复读 (自动循环当前段落)'}
            className={`p-2 rounded-xl border transition-colors flex items-center gap-1 text-xs font-medium ${
              isLoopParagraph
                ? style.buttonActive
                : 'border-transparent hover:border-current/20 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            <Repeat1 className="w-4 h-4" />
            <span className="hidden md:inline">单段循环</span>
          </button>

          {/* Speed Selector */}
          <div className="relative" ref={speedMenuRef}>
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="p-2 rounded-xl border border-transparent hover:border-current/20 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-1 text-xs font-mono font-bold"
              title="播放倍速"
            >
              <Gauge className="w-4 h-4" />
              <span>{playbackRate}x</span>
            </button>

            {showSpeedMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-28 rounded-xl shadow-xl border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 p-1.5 z-50 animate-in fade-in slide-in-from-bottom-2">
                <div className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase">播放倍速</div>
                {speeds.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      onPlaybackRateChange(rate);
                      setShowSpeedMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-mono flex items-center justify-between transition-colors ${
                      playbackRate === rate
                        ? 'bg-blue-600 text-white font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{rate}x</span>
                    {playbackRate === rate && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Volume Control */}
          <div
            className="relative flex items-center"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              onClick={onToggleMute}
              className="p-2 rounded-xl border border-transparent hover:border-current/20 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title={isMuted ? '取消静音' : '静音'}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {showVolumeSlider && (
              <div className="absolute right-0 bottom-full mb-2 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border z-50 flex items-center gap-2 animate-in fade-in">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-xs font-mono w-7 text-right">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

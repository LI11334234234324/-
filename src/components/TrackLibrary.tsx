import React, { useState } from 'react';
import {
  X,
  Search,
  Plus,
  Play,
  Download,
  Trash2,
  FolderOpen,
  Music,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { Track } from '../types';

interface TrackLibraryProps {
  isOpen: boolean;
  tracks: Track[];
  activeTrackId: string;
  onClose: () => void;
  onSelectTrack: (track: Track) => void;
  onOpenAddModal: () => void;
  onDeleteTrack: (trackId: string) => void;
  onExportTrack: (track: Track) => void;
}

export const TrackLibrary: React.FC<TrackLibraryProps> = ({
  isOpen,
  tracks,
  activeTrackId,
  onClose,
  onSelectTrack,
  onOpenAddModal,
  onDeleteTrack,
  onExportTrack,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const categories = ['全部', ...Array.from(new Set(tracks.map((t) => t.category)))];

  const filteredTracks = tracks.filter((t) => {
    const matchesCat = selectedCategory === '全部' || t.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.author && t.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold">作品与文稿库</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-slate-500">
              {tracks.length} 首
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenAddModal();
              }}
              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow flex items-center gap-1 transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              添加新作品
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 opacity-60" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-950/50">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索作品标题、作者或摘要..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg border whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredTracks.length === 0 ? (
            <div className="text-center py-12 opacity-60 text-xs">
              暂无符合条件的作品
            </div>
          ) : (
            filteredTracks.map((track) => {
              const isActive = track.id === activeTrackId;

              return (
                <div
                  key={track.id}
                  onClick={() => {
                    onSelectTrack(track);
                    onClose();
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                    isActive
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-md ring-1 ring-blue-500/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={track.coverImage}
                      alt={track.title}
                      className="w-12 h-12 rounded-xl object-cover shadow-sm shrink-0 border border-black/10"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border">
                          {track.category}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> 正在播放
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold truncate mt-0.5 text-slate-900 dark:text-slate-100">
                        {track.title}
                      </h4>
                      <p className="text-xs opacity-60 truncate">
                        {track.author ? `作者：${track.author}` : '未知作者'} · {track.segments.length} 段文本
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onExportTrack(track);
                      }}
                      title="导出作品数据包 (.json)"
                      className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    >
                      <Download className="w-4 h-4 opacity-70" />
                    </button>

                    {track.id.startsWith('custom-') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`确定要删除作品《${track.title}》吗？`)) {
                            onDeleteTrack(track.id);
                          }
                        }}
                        title="删除作品"
                        className="p-2 rounded-xl hover:bg-red-500/20 text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="p-2.5 rounded-full bg-blue-600 text-white shadow hover:scale-105 transition-transform">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

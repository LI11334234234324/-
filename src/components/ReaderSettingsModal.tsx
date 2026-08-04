import React from 'react';
import {
  X,
  Type,
  Palette,
  Eye,
  SlidersHorizontal,
  Layout,
  Sparkles,
} from 'lucide-react';
import { ReaderSettings, ReaderTheme, ReaderFont, FontSize, LineHeight } from '../types';

interface ReaderSettingsModalProps {
  isOpen: boolean;
  settings: ReaderSettings;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
}

export const ReaderSettingsModal: React.FC<ReaderSettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const themes: { id: ReaderTheme; label: string; bg: string; border: string; text: string }[] = [
    { id: 'light', label: '清新日间', bg: 'bg-white', border: 'border-slate-300', text: 'text-slate-900' },
    { id: 'sepia', label: '暖阳羊皮', bg: 'bg-[#fbf0d9]', border: 'border-amber-300', text: 'text-[#3e2723]' },
    { id: 'dark', label: '深邃夜间', bg: 'bg-slate-950', border: 'border-slate-800', text: 'text-slate-100' },
    { id: 'slate', label: '静谧板岩', bg: 'bg-slate-900', border: 'border-slate-700', text: 'text-slate-200' },
  ];

  const fontSizes: { id: FontSize; label: string }[] = [
    { id: 'sm', label: '小' },
    { id: 'base', label: '中' },
    { id: 'lg', label: '大' },
    { id: 'xl', label: '特大' },
    { id: '2xl', label: '超大' },
  ];

  const lineHeights: { id: LineHeight; label: string }[] = [
    { id: 'tight', label: '紧凑' },
    { id: 'normal', label: '适中' },
    { id: 'relaxed', label: '舒适' },
    { id: 'loose', label: '宽松' },
  ];

  const fonts: { id: ReaderFont; label: string }[] = [
    { id: 'sans', label: '标准无衬线' },
    { id: 'serif', label: '经典衬线体' },
    { id: 'mono', label: '等宽代码体' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-base">
            <SlidersHorizontal className="w-5 h-5 text-blue-600" />
            <span>阅读器排版与偏好</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 opacity-60" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-5 space-y-5 text-xs">
          {/* Theme selection */}
          <div className="space-y-2">
            <label className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Palette className="w-4 h-4 text-blue-500" />
              阅读主题色彩
            </label>
            <div className="grid grid-cols-2 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onUpdateSettings({ theme: t.id })}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${t.bg} ${t.text} ${
                    settings.theme === t.id
                      ? 'ring-2 ring-blue-600 border-blue-600 font-bold shadow'
                      : t.border
                  }`}
                >
                  <span>{t.label}</span>
                  {settings.theme === t.id && <span className="text-blue-600 font-bold">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <label className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Type className="w-4 h-4 text-blue-500" />
              字号大小
            </label>
            <div className="flex gap-1.5">
              {fontSizes.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onUpdateSettings({ fontSize: f.id })}
                  className={`flex-1 py-2 rounded-xl border text-center transition-all ${
                    settings.fontSize === f.id
                      ? 'bg-blue-600 text-white font-bold border-blue-600 shadow'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Line Height */}
          <div className="space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-300">行高间距</label>
            <div className="flex gap-1.5">
              {lineHeights.map((lh) => (
                <button
                  key={lh.id}
                  onClick={() => onUpdateSettings({ lineHeight: lh.id })}
                  className={`flex-1 py-2 rounded-xl border text-center transition-all ${
                    settings.lineHeight === lh.id
                      ? 'bg-blue-600 text-white font-bold border-blue-600 shadow'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {lh.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-300">字体样式</label>
            <div className="grid grid-cols-3 gap-2">
              {fonts.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onUpdateSettings({ fontFamily: f.id })}
                  className={`py-2 px-2 rounded-xl border text-center transition-all ${
                    settings.fontFamily === f.id
                      ? 'bg-blue-600 text-white font-bold border-blue-600 shadow'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Layout Mode */}
          <div className="space-y-2">
            <label className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Layout className="w-4 h-4 text-blue-500" />
              界面版式
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ layout: 'split' })}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  settings.layout === 'split'
                    ? 'bg-blue-600 text-white font-bold border-blue-600 shadow'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                左右/上下分栏
              </button>
              <button
                onClick={() => onUpdateSettings({ layout: 'stacked' })}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  settings.layout === 'stacked'
                    ? 'bg-blue-600 text-white font-bold border-blue-600 shadow'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                单栏浸润阅读
              </button>
            </div>
          </div>

          {/* Interactive Toggles */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">自动平滑跟读滚动</span>
              <input
                type="checkbox"
                checked={settings.autoScroll}
                onChange={(e) => onUpdateSettings({ autoScroll: e.target.checked })}
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">沉浸模式 (虚化非当前段落)</span>
              <input
                type="checkbox"
                checked={settings.highlightMode === 'focus'}
                onChange={(e) =>
                  onUpdateSettings({
                    highlightMode: e.target.checked ? 'focus' : 'paragraph',
                  })
                }
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">显示时间戳标签 ([01:23])</span>
              <input
                type="checkbox"
                checked={settings.showTimestamps}
                onChange={(e) => onUpdateSettings({ showTimestamps: e.target.checked })}
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">显示双语译文 (如适用)</span>
              <input
                type="checkbox"
                checked={settings.showTranslation}
                onChange={(e) => onUpdateSettings({ showTranslation: e.target.checked })}
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow"
          >
            完成设置
          </button>
        </div>
      </div>
    </div>
  );
};
